"use client";

import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";

type BannerSection = "home" | "events" | "listings";

type Banner = {
  id: string;
  title: string;
  image: string;
  link?: string;
  section: string;
  position: number;
  status: "active" | "inactive";
  startDate: string;
  endDate?: string;
};

type Props = {
  token: string | null;
  fixedSection?: BannerSection;
  title?: string;
  description?: string;
};

type Message = { type: "success" | "error"; text: string } | null;

function isActiveNow(banner: Banner) {
  const now = Date.now();
  const start = new Date(banner.startDate).getTime();
  const end = banner.endDate ? new Date(banner.endDate).getTime() : Number.POSITIVE_INFINITY;
  return banner.status === "active" && now >= start && now <= end;
}

function sectionLabel(section: BannerSection) {
  if (section === "home") return "Home";
  if (section === "events") return "Eventos";
  return "Classificados";
}

export default function AdminBannersPanel({
  token,
  fixedSection,
  title,
  description
}: Props) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    title: "",
    image: "",
    link: "",
    section: fixedSection ?? ("home" as BannerSection),
    position: 1,
    startDate: "",
    endDate: "",
    status: "active" as "active" | "inactive"
  });

  const sorted = useMemo(
    () =>
      [...banners]
        .filter((banner) => (fixedSection ? banner.section === fixedSection : true))
        .sort((a, b) => a.position - b.position),
    [banners, fixedSection]
  );

  const backgroundMode = fixedSection === "home";
  const bannersToRender = useMemo(() => {
    if (!backgroundMode) return sorted;
    const active = sorted.find((item) => item.status === "active");
    return active ? [active] : sorted.slice(0, 1);
  }, [backgroundMode, sorted]);

  const panelTitle =
    title ?? (backgroundMode ? "Banner de Fundo da Home" : "Destaques / Banners");
  const panelDescription =
    description ??
    (backgroundMode
      ? "Use esta area para trocar somente o banner de fundo do topo da home."
      : "Ate 3 imagens em destaque, com data de exposicao (start/end) e rotacao automatica no site.");

  function authHeaders(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function jsonHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...authHeaders()
    };
  }

  async function loadBanners() {
    try {
      const res = await fetch("/api/banners");
      const data = await res.json();
      setBanners(data.banners || []);
    } catch {
      setMessage({ type: "error", text: "Nao foi possivel carregar banners." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (!fixedSection) return;
    setForm((current) => ({ ...current, section: fixedSection }));
  }, [fixedSection]);

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "banner");

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao fazer upload da imagem.");
      }

      setForm((current) => ({ ...current, image: data.url || "" }));
      setMessage({ type: "success", text: "Imagem enviada com sucesso." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao fazer upload da imagem."
      });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleImageFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await handleImageUpload(file);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (!form.image.trim()) {
        throw new Error("Informe a URL da imagem ou faca upload de um arquivo.");
      }

      const payload = {
        ...form,
        section: fixedSection ?? form.section,
        image: form.image.trim(),
        position: backgroundMode ? 1 : Number(form.position) || 1,
        startDate: backgroundMode ? new Date().toISOString() : form.startDate || new Date().toISOString(),
        endDate: backgroundMode ? undefined : form.endDate || undefined,
        status: "active" as const
      };

      const existingBackground = backgroundMode
        ? sorted.find((item) => item.status === "active") || sorted[0]
        : undefined;
      const endpoint = existingBackground ? `/api/banners/${existingBackground.id}` : "/api/banners";
      const method = existingBackground ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: jsonHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar banner.");

      if (existingBackground) {
        setBanners((prev) => prev.map((item) => (item.id === existingBackground.id ? data.banner : item)));
      } else {
        setBanners((prev) => [...prev, data.banner]);
      }

      setForm({
        title: "",
        image: "",
        link: "",
        section: fixedSection ?? ("home" as BannerSection),
        position: 1,
        startDate: "",
        endDate: "",
        status: "active"
      });
      setMessage({
        type: "success",
        text: backgroundMode ? "Banner de fundo atualizado." : "Banner criado."
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao salvar banner."
      });
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: "active" | "inactive") {
    setBusy(true);
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: "PUT",
        headers: jsonHeaders(),
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar banner.");
      setBanners((prev) => prev.map((b) => (b.id === id ? data.banner : b)));
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao atualizar banner."
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir banner.");
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao excluir banner."
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{panelTitle}</div>
          <div className="mt-1 text-sm text-slate-600">{panelDescription}</div>
        </div>
        <div className="text-xs text-slate-500">
          Ativos agora: {sorted.filter(isActiveNow).length}
        </div>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-md border p-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleCreate} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Titulo</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Link (opcional)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            placeholder="https://..."
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Upload da imagem</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
            disabled={busy || uploadingImage}
            onChange={handleImageFileChange}
          />
          <span className="text-xs text-slate-500">Aceita jpg, jpeg, png e webp (ate 5MB).</span>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Imagem (URL manual)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.image}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
            placeholder="https://... ou /uploads/banner/arquivo.webp"
          />
        </label>

        {form.image ? (
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">Pre-visualizacao</div>
            <img
              src={form.image}
              alt="Previa do banner"
              className="mt-2 h-28 w-full rounded-md object-cover md:h-36"
            />
          </div>
        ) : null}

        {backgroundMode ? (
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Este modulo altera apenas o banner de fundo do topo da Home.
          </div>
        ) : (
          <>
            {fixedSection ? (
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-900">Secao</span>
                <input
                  readOnly
                  className="h-11 rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700"
                  value={sectionLabel(fixedSection)}
                />
              </label>
            ) : (
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-900">Secao</span>
                <select
                  className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.section}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, section: e.target.value as BannerSection }))
                  }
                >
                  <option value="home">Home</option>
                  <option value="events">Eventos</option>
                  <option value="listings">Classificados</option>
                </select>
              </label>
            )}

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Posicao</span>
              <input
                type="number"
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: Number(e.target.value) }))}
                min={1}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Inicio (exposicao)</span>
              <input
                type="datetime-local"
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">Fim (exposicao)</span>
              <input
                type="datetime-local"
                className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </label>
          </>
        )}

        <button
          type="submit"
          disabled={busy || uploadingImage}
          className="md:col-span-2 inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy
            ? "Salvando..."
            : uploadingImage
              ? "Enviando imagem..."
              : backgroundMode
                ? "Salvar banner de fundo"
                : "Adicionar destaque"}
        </button>
      </form>

      <div className="mt-6 grid gap-3">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando...</div>
        ) : sorted.length === 0 ? (
          <Notice
            title={fixedSection ? `Nenhum banner em ${sectionLabel(fixedSection)}` : "Nenhum destaque"}
            variant="info"
          >
            {backgroundMode
              ? "Defina uma imagem para o fundo da home."
              : fixedSection
                ? "Crie banners para esta secao."
                : "Crie ate 3 imagens para o carrossel."}
          </Notice>
        ) : (
          bannersToRender.map((banner) => (
            <div
              key={banner.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center gap-3 justify-between"
            >
              <div className="min-w-[200px]">
                <div className="text-sm font-semibold text-slate-900">{banner.title}</div>
                <div className="text-xs text-slate-600">
                  {backgroundMode
                    ? `fundo home - ${isActiveNow(banner) ? "Ativo agora" : banner.status}`
                    : `${banner.section} - posicao ${banner.position} - ${isActiveNow(banner) ? "Ativo agora" : banner.status}`}
                </div>
                <div className="text-xs text-slate-500">
                  {banner.startDate
                    ? new Date(banner.startDate).toLocaleString("pt-BR")
                    : "inicio imediato"}
                  {banner.endDate
                    ? ` -> ${new Date(banner.endDate).toLocaleString("pt-BR")}`
                    : " (sem termino)"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  disabled={busy}
                  onClick={() =>
                    updateStatus(banner.id, banner.status === "active" ? "inactive" : "active")
                  }
                >
                  {banner.status === "active" ? "Desativar" : "Ativar"}
                </button>
                <button
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  disabled={busy}
                  onClick={() => handleDelete(banner.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
