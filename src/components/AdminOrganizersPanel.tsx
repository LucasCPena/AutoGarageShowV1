"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import Notice from "@/components/Notice";
import { eventImageAlt } from "@/lib/image-alt";
import { normalizeAssetReference } from "@/lib/site-url";

type Props = {
  token: string | null;
};

type Organizer = {
  id: string;
  name: string;
  logo: string;
  altText?: string;
  bannerTop?: string;
  link?: string;
  createdAt: string;
  updatedAt: string;
};

type Message = { type: "success" | "error"; text: string } | null;

type OrganizerFormState = {
  name: string;
  altText: string;
  bannerTop: string;
  logo: string;
  link: string;
};

const EMPTY_FORM: OrganizerFormState = {
  name: "",
  altText: "",
  bannerTop: "",
  logo: "",
  link: ""
};

export default function AdminOrganizersPanel({ token }: Props) {
  const [items, setItems] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrganizerFormState>(EMPTY_FORM);
  const [message, setMessage] = useState<Message>(null);

  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [items]
  );

  function authHeaders(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function jsonHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...authHeaders()
    };
  }

  async function loadOrganizers() {
    setLoading(true);
    try {
      const response = await fetch("/api/organizadores", {
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar organizadores.");
      }
      setItems(Array.isArray(data.organizers) ? data.organizers : []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao carregar organizadores."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganizers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "event");
      const logoAlt = form.altText.trim() || form.name.trim() || eventImageAlt("logo do organizador");
      formData.append("alt", logoAlt);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar logo.");
      }
      setForm((current) => ({ ...current, logo: data.url || "" }));
      setMessage({ type: "success", text: "Logo enviado com sucesso." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao enviar logo."
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await handleLogoUpload(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage({
        type: "error",
        text: "Sessão expirada. Faça login novamente como admin."
      });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const payload = {
        name: form.name.trim(),
        altText: form.altText.trim(),
        bannerTop: form.bannerTop.trim(),
        logo: form.logo.trim(),
        link: form.link.trim()
      };

      if (!payload.name) {
        throw new Error("Informe o nome do organizador.");
      }

      if (!payload.logo) {
        throw new Error("Envie o logo do organizador.");
      }

      const endpoint = editingId
        ? `/api/organizadores/${editingId}`
        : "/api/organizadores";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: jsonHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao salvar organizador.");
      }

      const saved = data.organizer as Organizer;
      if (editingId) {
        setItems((current) => current.map((item) => (item.id === editingId ? saved : item)));
        setMessage({ type: "success", text: "Organizador atualizado." });
      } else {
        setItems((current) => [saved, ...current]);
        setMessage({ type: "success", text: "Organizador criado." });
      }

      resetForm();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Falha ao salvar organizador."
      });
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(item: Organizer) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      altText: item.altText || "",
      bannerTop: item.bannerTop || "",
      logo: item.logo || "",
      link: item.link || ""
    });
    setMessage(null);
  }

  async function handleDelete(id: string) {
    if (!token) {
      setMessage({
        type: "error",
        text: "Sessão expirada. Faça login novamente como admin."
      });
      return;
    }
    if (!window.confirm("Deseja excluir este organizador?")) return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/organizadores/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao excluir organizador.");
      }
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setMessage({ type: "success", text: "Organizador excluido." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Falha ao excluir organizador."
      });
    } finally {
      setBusy(false);
    }
  }

  const logoPreview = normalizeAssetReference(form.logo);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Organizadores e Clubes</div>
          <div className="mt-1 text-sm text-slate-600">
            Cadastro de logo e link opcional para a página pública de organizadores e clubes.
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-900">Total: {items.length}</div>
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

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Nome do organizador</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Ex.: Clube do Fusca"
            required
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Texto para ALT (opcional)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.altText}
            onChange={(event) =>
              setForm((current) => ({ ...current, altText: event.target.value }))
            }
            placeholder="Se vazio, usa o nome do organizador"
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Banner no topo (URL opcional)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.bannerTop}
            onChange={(event) =>
              setForm((current) => ({ ...current, bannerTop: event.target.value }))
            }
            placeholder="https://... ou /uploads/banner/topo.webp"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Logo (arquivo)</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
            disabled={busy || uploadingLogo}
            onChange={handleLogoFileChange}
          />
          <span className="text-xs text-slate-500">
            Aceita jpg, jpeg, png e webp (ate 5MB). Medida recomendada da logo: 600 x 300 px.
          </span>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Logo (URL)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.logo}
            onChange={(event) =>
              setForm((current) => ({ ...current, logo: event.target.value }))
            }
            placeholder="https://... ou /uploads/event/logo.webp"
            required
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Link (opcional)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.link}
            onChange={(event) =>
              setForm((current) => ({ ...current, link: event.target.value }))
            }
            placeholder="https://site.com ou https://instagram.com/perfil"
          />
        </label>

        {logoPreview ? (
          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">Pre-visualizacao do logo</div>
            <img
              src={logoPreview}
              alt={form.altText.trim() || form.name.trim() || eventImageAlt("logo do organizador")}
              className="mt-2 h-24 w-32 rounded-lg border border-slate-200 bg-white object-contain p-2"
            />
          </div>
        ) : null}

        <div className="md:col-span-2 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy || uploadingLogo}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy
              ? "Salvando..."
              : uploadingLogo
                ? "Enviando logo..."
                : editingId
                  ? "Atualizar organizador"
                  : "Adicionar organizador"}
          </button>

          {editingId ? (
            <button
              type="button"
              disabled={busy || uploadingLogo}
              onClick={resetForm}
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-8 grid gap-3">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando organizadores...</div>
        ) : ordered.length === 0 ? (
          <Notice title="Sem organizadores" variant="info">
            Cadastre o primeiro logo de organizador.
          </Notice>
        ) : (
          ordered.map((item) => {
            const logo = normalizeAssetReference(item.logo);
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex min-w-[220px] flex-1 items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-white p-2">
                    {logo ? (
                      <img
                        src={logo}
                        alt={form.altText.trim() || form.name.trim() || eventImageAlt("logo do organizador")}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-500">Sem logo</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    <div className="font-semibold text-slate-900">{item.name || "Organizador"}</div>
                    <div>Atualizado em: {new Date(item.updatedAt).toLocaleString("pt-BR")}</div>
                    <div className="mt-1 break-all">ALT: {item.altText ? item.altText : "(usa nome)"}</div>
                    <div className="mt-1 break-all">Banner topo: {item.bannerTop ? item.bannerTop : "Sem banner"}</div>
                    <div className="mt-1 break-all">Link: {item.link ? item.link : "Sem link"}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    disabled={busy || uploadingLogo}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={busy || uploadingLogo}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
