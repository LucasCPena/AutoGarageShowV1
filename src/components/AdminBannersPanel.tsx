"use client";

import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";

type BannerSection =
  | "home"
  | "events"
  | "listings"
  | "news"
  | "plans"
  | "sidebar"
  | "mercado-de-pulgas"
  | "custom";

const SECTION_OPTIONS: Array<{ value: BannerSection; label: string }> = [
  { value: "home", label: "Home (topo principal)" },
  { value: "events", label: "Eventos" },
  { value: "listings", label: "Classificados" },
  { value: "news", label: "Notícias" },
  { value: "plans", label: "Planos" },
  { value: "sidebar", label: "Banner lateral" },
  { value: "mercado-de-pulgas", label: "Mercado de Pulgas" },
  { value: "custom", label: "Outra seção" }
];

type Banner = {
  id: string;
  title?: string;
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
  fixedSection?: string;
  title?: string;
  description?: string;
};

type Message = { type: "success" | "error"; text: string } | null;

type BannerFormState = {
  title: string;
  image: string;
  link: string;
  section: BannerSection;
  customSection: string;
  position: number;
  startDate: string;
  endDate: string;
  status: "active" | "inactive";
};

function isActiveNow(banner: Banner) {
  const now = Date.now();
  const start = new Date(banner.startDate).getTime();
  const end = banner.endDate ? new Date(banner.endDate).getTime() : Number.POSITIVE_INFINITY;
  return banner.status === "active" && now >= start && now <= end;
}

function sectionLabel(section: string) {
  const normalized = section.trim().toLowerCase();
  if (normalized === "home") return "Home";
  if (normalized === "events") return "Eventos";
  if (normalized === "listings") return "Classificados";
  if (normalized === "news") return "Notícias";
  if (normalized === "plans") return "Planos";
  if (normalized === "sidebar") return "Banner lateral";
  if (normalized === "mercado-de-pulgas") return "Mercado de Pulgas";
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function statusLabel(status: "active" | "inactive") {
  return status === "active" ? "Ativo" : "Inativo";
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDateTimeLocalValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(
    date.getDate()
  )}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function createInitialForm(fixedSection?: string): BannerFormState {
  return {
    title: "",
    image: "",
    link: "",
    section: (fixedSection ?? "events") as BannerSection,
    customSection: "",
    position: 1,
    startDate: "",
    endDate: "",
    status: "active"
  };
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
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerFormState>(() => createInitialForm(fixedSection));

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
      ? "Use esta área para trocar somente o banner de fundo do topo da home."
      : "Cadastre banners e escolha em qual página eles devem aparecer.");

  function resetForm() {
    setEditingBannerId(null);
    setForm(createInitialForm(fixedSection));
  }

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
      setMessage({ type: "error", text: "Não foi possível carregar banners." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBanners();
  }, []);

  useEffect(() => {
    if (!fixedSection) return;
    setForm((current) => ({ ...current, section: fixedSection as BannerSection, customSection: "" }));
  }, [fixedSection]);

  function startEditing(banner: Banner) {
    const knownSection = SECTION_OPTIONS.some((option) => option.value === banner.section);

    setEditingBannerId(banner.id);
    setForm({
      title: banner.title ?? "",
      image: banner.image ?? "",
      link: banner.link ?? "",
      section: fixedSection
        ? (fixedSection as BannerSection)
        : knownSection
          ? (banner.section as BannerSection)
          : "custom",
      customSection: fixedSection || knownSection ? "" : banner.section,
      position: banner.position || 1,
      startDate: toDateTimeLocalValue(banner.startDate),
      endDate: toDateTimeLocalValue(banner.endDate),
      status: banner.status
    });
    setMessage(null);
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "banner");
      if (form.title.trim()) {
        formData.append("alt", form.title.trim());
      }

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
        throw new Error("Informe a URL da imagem ou faça upload de um arquivo.");
      }

      const resolvedSection = fixedSection
        ? fixedSection
        : form.section === "custom"
          ? form.customSection.trim()
          : form.section;

      if (!resolvedSection) {
        throw new Error("Informe a seção onde o banner deve ser exibido.");
      }

      const payload = {
        ...form,
        title: form.title.trim(),
        section: resolvedSection,
        image: form.image.trim(),
        position: backgroundMode ? 1 : Number(form.position) || 1,
        startDate: backgroundMode ? new Date().toISOString() : form.startDate || new Date().toISOString(),
        endDate: backgroundMode ? undefined : form.endDate || undefined,
        status: editingBannerId ? form.status : ("active" as const)
      };

      const existingBackground = backgroundMode
        ? sorted.find((item) => item.status === "active") || sorted[0]
        : undefined;
      const bannerIdToUpdate = editingBannerId || existingBackground?.id;
      const endpoint = bannerIdToUpdate ? `/api/banners/${bannerIdToUpdate}` : "/api/banners";
      const method = bannerIdToUpdate ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: jsonHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar banner.");

      if (bannerIdToUpdate) {
        setBanners((prev) =>
          prev.map((item) => (item.id === bannerIdToUpdate ? data.banner : item))
        );
      } else {
        setBanners((prev) => [...prev, data.banner]);
      }

      resetForm();
      setMessage({
        type: "success",
        text: bannerIdToUpdate
          ? backgroundMode
            ? "Banner de fundo atualizado."
            : "Banner atualizado."
          : "Banner criado."
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
      if (editingBannerId === id) {
        resetForm();
      }
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

      {editingBannerId ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Edicao ativa. Atualize os dados e salve para manter o mesmo banner sem recriar o cadastro.
        </div>
      ) : null}

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
          <span className="text-sm font-semibold text-slate-900">Texto do banner (opcional)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Nome interno para controle; não aparece no site"
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
          <span className="text-xs text-slate-500">
            Aceita jpg, jpeg, png e webp (ate 5MB).
            {backgroundMode ? " Medida recomendada para o topo da home: 1920 x 1080 px." : ""}
          </span>
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
              alt={form.title.trim() ? `Previa do banner: ${form.title.trim()}` : "Previa do banner"}
              className="mt-2 aspect-video w-full rounded-md bg-white object-cover"
            />
          </div>
        ) : null}

        {backgroundMode ? (
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Este módulo altera apenas o banner de fundo do topo da Home.
          </div>
        ) : (
          <>
            {fixedSection ? (
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-900">Página</span>
                <input
                  readOnly
                  className="h-11 rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700"
                  value={sectionLabel(fixedSection)}
                />
              </label>
            ) : (
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-900">Página de exibição</span>
                <select
                  className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.section}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, section: e.target.value as BannerSection }))
                  }
                >
                  {SECTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!fixedSection && form.section === "custom" ? (
              <label className="grid gap-1 md:col-span-2">
                <span className="text-sm font-semibold text-slate-900">Slug da seção</span>
                <input
                  className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                  value={form.customSection}
                  onChange={(e) => setForm((f) => ({ ...f, customSection: e.target.value }))}
                  placeholder="Ex.: mercado-de-pulgas"
                />
                <span className="text-xs text-slate-500">
                  Use o mesmo slug da página que vai chamar o banner.
                </span>
              </label>
            ) : null}

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
              <span className="text-sm font-semibold text-slate-900">Início (exposicao)</span>
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

        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy || uploadingImage}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy
              ? "Salvando..."
              : uploadingImage
                ? "Enviando imagem..."
                : editingBannerId
                  ? "Salvar edicao"
                  : backgroundMode
                    ? "Salvar banner de fundo"
                    : "Adicionar banner"}
          </button>

          {editingBannerId ? (
            <button
              type="button"
              disabled={busy || uploadingImage}
              onClick={resetForm}
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
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
                ? "Crie banners para esta seção."
                : "Crie até 3 banners para o carrossel."}
          </Notice>
        ) : (
          bannersToRender.map((banner) => (
            <div
              key={banner.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center gap-3 justify-between"
            >
              <div className="min-w-[200px]">
                <div className="text-sm font-semibold text-slate-900">
                  {banner.title?.trim() || "Sem nome interno"}
                </div>
                <div className="text-xs text-slate-600">
                  {backgroundMode
                    ? `Fundo da home - ${isActiveNow(banner) ? "Ativo agora" : statusLabel(banner.status)}`
                    : `${sectionLabel(banner.section)} - posicao ${banner.position} - ${isActiveNow(banner) ? "Ativo agora" : statusLabel(banner.status)}`}
                </div>
                <div className="text-xs text-slate-500">
                  {banner.startDate
                    ? new Date(banner.startDate).toLocaleString("pt-BR")
                    : "início imediato"}
                  {banner.endDate
                    ? ` ate ${new Date(banner.endDate).toLocaleString("pt-BR")}`
                    : " (sem término)"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!backgroundMode ? (
                  <button
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => startEditing(banner)}
                  >
                    Editar
                  </button>
                ) : null}
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
