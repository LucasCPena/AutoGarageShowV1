"use client";

import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import type { News } from "@/lib/database";

type Props = {
  token: string | null;
};

type Message = { type: "success" | "error"; text: string } | null;

type NewsFormState = {
  title: string;
  content: string;
  category: "eventos" | "classificados" | "geral" | "dicas";
  coverImage: string;
  author: string;
  status: "draft" | "published";
};

const EMPTY_FORM: NewsFormState = {
  title: "",
  content: "",
  category: "geral",
  coverImage: "",
  author: "",
  status: "published"
};

function sortByCreatedAtDesc(a: News, b: News) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function AdminNewsPanel({ token }: Props) {
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [form, setForm] = useState<NewsFormState>(EMPTY_FORM);

  const ordered = useMemo(() => [...items].sort(sortByCreatedAtDesc), [items]);

  function authHeaders(): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function jsonHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...authHeaders()
    };
  }

  async function loadNews() {
    try {
      const res = await fetch("/api/noticias?scope=all", {
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar noticias.");
      setItems(data.news || []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao carregar noticias."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "news");

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao fazer upload da imagem.");
      }

      setForm((current) => ({ ...current, coverImage: data.url || "" }));
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        coverImage: form.coverImage.trim(),
        author: form.author.trim(),
        status: form.status
      };

      if (!payload.title || !payload.content || !payload.coverImage) {
        throw new Error("Preencha titulo, conteudo e imagem de capa.");
      }

      const endpoint = editingId ? `/api/noticias/${editingId}` : "/api/noticias";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: jsonHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar noticia.");

      if (editingId) {
        setItems((current) => current.map((item) => (item.id === editingId ? data.news : item)));
        setMessage({ type: "success", text: "Noticia atualizada." });
      } else {
        setItems((current) => [data.news, ...current]);
        setMessage({ type: "success", text: "Noticia criada." });
      }

      resetForm();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Falha ao salvar noticia."
      });
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(item: News) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      category: item.category,
      coverImage: item.coverImage,
      author: item.author,
      status: item.status
    });
    setMessage(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja excluir esta noticia?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/noticias/${id}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao excluir noticia.");
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
      setMessage({ type: "success", text: "Noticia excluida." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Falha ao excluir noticia."
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="admin-news-panel" className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Noticias</div>
          <div className="mt-1 text-sm text-slate-600">
            CRUD completo de noticias para administracao.
          </div>
        </div>
        <div className="text-xs text-slate-500">Total: {items.length}</div>
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
          <span className="text-sm font-semibold text-slate-900">Titulo</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Categoria</span>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.category}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                category: e.target.value as NewsFormState["category"]
              }))
            }
          >
            <option value="geral">Geral</option>
            <option value="eventos">Eventos</option>
            <option value="classificados">Classificados</option>
            <option value="dicas">Dicas</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Status</span>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.status}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                status: e.target.value as NewsFormState["status"]
              }))
            }
          >
            <option value="published">Publicado</option>
            <option value="draft">Rascunho</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Autor</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.author}
            onChange={(e) => setForm((current) => ({ ...current, author: e.target.value }))}
            placeholder="Redacao Auto Garage Show"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Imagem de capa (arquivo)</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-brand-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-700"
            disabled={busy || uploadingImage}
            onChange={handleImageFileChange}
          />
          <span className="text-xs text-slate-500">
            Aceita jpg, jpeg, png e webp (ate 5MB). Medida recomendada: 1200 x 675 px.
          </span>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Imagem de capa (URL)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={form.coverImage}
            onChange={(e) => setForm((current) => ({ ...current, coverImage: e.target.value }))}
            placeholder="https://... ou /uploads/..."
            required
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Conteudo</span>
          <textarea
            className="min-h-36 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.content}
            onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
            required
          />
        </label>

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
                : editingId
                  ? "Atualizar noticia"
                  : "Criar noticia"}
          </button>
          {editingId ? (
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

      <div className="mt-8 grid gap-3">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando noticias...</div>
        ) : ordered.length === 0 ? (
          <Notice title="Sem noticias" variant="info">
            Crie a primeira noticia pelo formulario acima.
          </Notice>
        ) : (
          ordered.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="min-w-[220px] flex-1">
                <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {item.category} | {item.status} | {new Date(item.createdAt).toLocaleString("pt-BR")}
                </div>
                <div className="mt-2 line-clamp-2 text-xs text-slate-600">{item.excerpt}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(item)}
                  disabled={busy}
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={busy}
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
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
