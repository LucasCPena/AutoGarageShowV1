#!/usr/bin/env node

const base = process.env.BASE_URL || "http://127.0.0.1:3011";
const ts = Math.floor(Date.now() / 1000);

const results = [];

function addResult(test, ok, status, detail) {
  results.push({ test, ok, status, detail });
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }

  let json = null;
  if (bodyText) {
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = null;
    }
  }

  return { response, bodyText, json };
}

function authHeaders(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function run() {
  const userEmail = `user${ts}@test.local`;
  const adminEmail = `admin${ts}@test.local`;
  const password = "123456";
  let userToken = null;
  let adminToken = null;
  let createdEvent = null;
  let createdListing = null;
  let createdNews = null;

  // 1) CPF required for non-admin
  {
    const { response } = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "User No CPF", email: userEmail, password })
    });
    addResult(
      "register_non_admin_without_cpf",
      response.status === 400,
      response.status,
      "CPF obrigatorio para nao-admin"
    );
  }

  // 2) Invalid CPF rejected
  {
    const { response } = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "User Bad CPF",
        email: `bad${ts}@test.local`,
        password,
        document: "11111111111"
      })
    });
    addResult(
      "register_non_admin_invalid_cpf",
      response.status === 400,
      response.status,
      "CPF invalido bloqueado"
    );
  }

  // 3) Valid CPF accepted
  {
    const { response, json } = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "User OK CPF",
        email: userEmail,
        password,
        document: "52998224725"
      })
    });
    userToken = json?.token || null;
    addResult(
      "register_non_admin_valid_cpf",
      response.status === 201 && Boolean(userToken),
      response.status,
      "Cadastro com CPF valido"
    );
  }

  // 4) Admin bypass CPF
  {
    const { response, json } = await request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Admin OK",
        email: adminEmail,
        password
      })
    });
    adminToken = json?.token || null;
    const isAdmin = json?.user?.role === "admin";
    addResult(
      "register_admin_without_cpf",
      response.status === 201 && Boolean(adminToken) && isAdmin,
      response.status,
      "Admin sem CPF"
    );
  }

  const near = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const far = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
  const sameDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const toIso = (date) => date.toISOString();

  // 5) Create featured live event as admin (featuredUntil auto)
  {
    const { response, json } = await request("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(adminToken)
      },
      body: JSON.stringify({
        title: `Evento Teste Live ${ts}`,
        description: "Evento de teste",
        city: "Sao Paulo",
        state: "SP",
        location: "Parque",
        startAt: toIso(near),
        endAt: toIso(new Date(near.getTime() + 2 * 60 * 60 * 1000)),
        contactName: "Organizador",
        contactPhone: "(11)99999-0000",
        contactPhoneSecondary: "(11)98888-0000",
        contactEmail: "org@test.local",
        liveUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        featured: true,
        recurrence: { type: "single" }
      })
    });

    createdEvent = json?.event || null;
    const ok =
      response.status === 201 &&
      createdEvent?.featured === true &&
      Boolean(createdEvent?.featuredUntil) &&
      String(createdEvent?.liveUrl || "").includes("youtube.com/watch");
    addResult(
      "create_event_admin_featured_auto",
      ok,
      response.status,
      `featuredUntil=${createdEvent?.featuredUntil || ""}`
    );
  }

  // 6) Invalid live URL rejected
  {
    const { response } = await request("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(adminToken)
      },
      body: JSON.stringify({
        title: `Evento URL invalida ${ts}`,
        description: "Evento de teste",
        city: "Sao Paulo",
        state: "SP",
        location: "Parque",
        startAt: toIso(near),
        endAt: toIso(new Date(near.getTime() + 60 * 60 * 1000)),
        contactName: "Org",
        contactPhone: "(11)90000-0000",
        liveUrl: "https://vimeo.com/123",
        recurrence: { type: "single" }
      })
    });
    addResult(
      "create_event_invalid_live_url",
      response.status === 400,
      response.status,
      "URL invalida bloqueada"
    );
  }

  // 7) Duplicate without auth should fail
  if (createdEvent?.id) {
    const { response } = await request(`/api/events/${createdEvent.id}/duplicate`, {
      method: "POST"
    });
    addResult(
      "duplicate_event_without_auth",
      response.status === 401 || response.status === 403,
      response.status,
      "Bloqueio sem auth"
    );
  }

  // 8) Duplicate with admin
  if (createdEvent?.id) {
    const { response, json } = await request(`/api/events/${createdEvent.id}/duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(adminToken)
      },
      body: JSON.stringify({})
    });
    const title = json?.event?.title || "";
    addResult(
      "duplicate_event_admin",
      response.status === 201 && title.includes("(copia)"),
      response.status,
      title
    );
  }

  // 9) Create >2 events same day for calendar
  for (let i = 1; i <= 3; i += 1) {
    await request("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(adminToken)
      },
      body: JSON.stringify({
        title: `Evento Calendar ${ts}-${i}`,
        description: "Evento calendario",
        city: "Sao Paulo",
        state: "SP",
        location: "Praca",
        startAt: toIso(sameDay),
        endAt: toIso(new Date(sameDay.getTime() + 2 * 60 * 60 * 1000)),
        contactName: "Org",
        contactPhone: "(11)91111-1111",
        recurrence: { type: "single" }
      })
    });
  }
  {
    const { response, bodyText } = await request("/eventos/calendario");
    addResult(
      "calendar_has_more_button_text",
      response.status === 200 && bodyText.includes("mais"),
      response.status,
      "Texto de expansao no calendario"
    );
  }

  // 10) 30-day events filter
  const nearTitle = `Evento Janela 30d Near ${ts}`;
  const farTitle = `Evento Janela 30d Far ${ts}`;
  {
    await request("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(adminToken)
      },
      body: JSON.stringify({
        title: nearTitle,
        description: "near",
        city: "SP",
        state: "SP",
        location: "Local",
        startAt: toIso(near),
        endAt: toIso(new Date(near.getTime() + 60 * 60 * 1000)),
        contactName: "Org",
        contactPhone: "(11)92222-2222",
        recurrence: { type: "single" }
      })
    });
    await request("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(adminToken)
      },
      body: JSON.stringify({
        title: farTitle,
        description: "far",
        city: "SP",
        state: "SP",
        location: "Local",
        startAt: toIso(far),
        endAt: toIso(new Date(far.getTime() + 60 * 60 * 1000)),
        contactName: "Org",
        contactPhone: "(11)93333-3333",
        recurrence: { type: "single" }
      })
    });
    const { response, bodyText } = await request("/eventos");
    const hasNear = bodyText.includes(nearTitle);
    const hasFar = bodyText.includes(farTitle);
    addResult(
      "eventos_30_days_filter",
      response.status === 200 && hasNear && !hasFar,
      response.status,
      `near=${hasNear} far=${hasFar}`
    );
  }

  // 11) Upload logo/site should not 500
  {
    const form = new FormData();
    form.append("type", "site");
    form.append(
      "file",
      new Blob([Buffer.from("test")], { type: "image/png" }),
      "tmp-upload-test.png"
    );
    const { response, json } = await request("/api/upload", {
      method: "POST",
      body: form
    });
    addResult(
      "upload_logo_site",
      response.status === 200 && Boolean(json?.url),
      response.status,
      json?.url || ""
    );
  }

  // 12) Listing with decimal + contact email/phone
  if (userToken) {
    const { response, json } = await request("/api/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(userToken)
      },
      body: JSON.stringify({
        make: "Volkswagen",
        model: "Fusca",
        modelYear: 1972,
        manufactureYear: 1971,
        year: 1972,
        mileage: 12345,
        price: 12345.67,
        city: "Sao Paulo",
        state: "SP",
        description: "Teste",
        document: "52998224725",
        contact: {
          name: "Lucas",
          email: "lucas@test.local",
          phone: "(11)94444-4444"
        },
        images: []
      })
    });
    createdListing = json?.listing || null;
    addResult(
      "listing_decimal_and_contact",
      response.status === 201 && Number(createdListing?.price) === 12345.67,
      response.status,
      `price=${createdListing?.price ?? ""}`
    );
  }

  // 12b) Listing detail shows email and phone
  if (createdListing?.id && createdListing?.slug) {
    await request(`/api/listings/${createdListing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" })
    });
    const { response, bodyText } = await request(`/classificados/${createdListing.slug}`);
    addResult(
      "listing_detail_contact_visible",
      response.status === 200 &&
        bodyText.includes("Telefone:") &&
        bodyText.includes("E-mail:"),
      response.status,
      "Contato exibido na pagina"
    );
  }

  // 13) News CRUD
  if (adminToken) {
    const create = await request("/api/noticias", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(adminToken)
      },
      body: JSON.stringify({
        title: `Noticia Teste ${ts}`,
        content: "Conteudo de teste",
        category: "geral",
        coverImage: "/uploads/site/logo.png",
        status: "published"
      })
    });
    createdNews = create.json?.news || null;
    addResult("news_create", create.response.status === 201, create.response.status, createdNews?.slug || "");

    if (createdNews?.id) {
      const update = await request(`/api/noticias/${createdNews.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(adminToken)
        },
        body: JSON.stringify({ title: `Noticia Editada ${ts}` })
      });
      addResult("news_update", update.response.status === 200, update.response.status, "Atualizada");

      const remove = await request(`/api/noticias/${createdNews.id}`, {
        method: "DELETE",
        headers: authHeaders(adminToken)
      });
      addResult("news_delete", remove.response.status === 200, remove.response.status, "Excluida");
    }
  }

  // 14) HTML checks for requested labels
  {
    const cad = await request("/eventos/cadastrar");
    const cadText = cad.bodyText;
    const ok =
      cad.response.status === 200 &&
      cadText.includes("Horario de inicio") &&
      cadText.includes("Horario de termino") &&
      cadText.includes("Telefone principal (obrigatorio)") &&
      cadText.includes("Telefone secundario (opcional)") &&
      cadText.includes("Medida recomendada da capa");
    addResult("event_form_labels", ok, cad.response.status, "Campos e dicas da capa");
  }

  {
    const classified = await request("/classificados/anunciar");
    const txt = classified.bodyText;
    const ok =
      classified.response.status === 200 &&
      txt.includes("Telefone para contato") &&
      txt.includes("E-mail para contato");
    addResult("classified_form_contact_labels", ok, classified.response.status, "Telefone + e-mail");
  }

  for (const item of results) {
    console.log(`[${item.status}] ${item.test} => ${item.ok} :: ${item.detail}`);
  }

  const fail = results.filter((item) => !item.ok);
  console.log(`TOTAL=${results.length} FAIL=${fail.length}`);
  if (fail.length > 0) {
    for (const item of fail) {
      console.log(`FAIL: ${item.test} [status=${item.status}] ${item.detail}`);
    }
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("Smoke validation failed:", error);
  process.exit(1);
});
