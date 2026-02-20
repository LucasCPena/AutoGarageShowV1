"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { useAuth } from "@/lib/useAuth";

type Props = {
  params: { id: string };
};

type NewsForm = {
  title: string;
  excerpt: string;
  content: string;
  category: "eventos" | "classificados" | "geral" | "dicas";
  coverImage: string;
  author: string;
  status: "draft" | "published";
};

export default function NewsManagePage({ params }: Props) {
  const { token, user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<NewsForm>({
    title: "",
    excerpt: "",
    content: "",
    category: "geral",
    coverImage: "",
    author: "",
    status: "published"
  });

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setError("Token de autenticacao nao encontrado.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/noticias/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar noticia.");
        }
        if (cancelled) return;
        setFormState({
          title: data.news.title || "",
          excerpt: data.news.excerpt || "",
          content: data.news.content || "",
          category: data.news.category || "geral",
          coverImage: data.news.coverImage || "",
          author: data.news.author || "",
          status: data.news.status || "published"
        });
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro ao carregar noticia."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, params.id, token]);

  const canRenderForm = useMemo(
    () => !loading && !error && user?.role === "admin",
    [error, loading, user?.role]
  );

  function updateField(
    field: keyof NewsForm
  ) {
    return (
      event: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const value = event.target.value;
      setFormState((prev) => ({
        ...prev,
        [field]: value
      }));
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Token de autenticacao nao encontrado.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        title: formState.title.trim(),
        excerpt: formState.excerpt.trim(),
        content: formState.content.trim(),
        category: formState.category,
        coverImage: formState.coverImage.trim(),
        author: formState.author.trim(),
        status: formState.status
      };

      const response = await fetch(`/api/noticias/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar noticia.");
      }
      setMessage("Noticia atualizada com sucesso.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao salvar noticia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageIntro
        title="Editar noticia"
        subtitle="Edicao completa do post de noticia."
      >
        <Link
          href="/noticias"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar para noticias
        </Link>
      </PageIntro>

      <Container className="py-10">
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Carregando noticia...
          </div>
        ) : null}

        {user && user.role !== "admin" ? (
          <Notice title="Acesso restrito" variant="warning">
            Apenas administradores podem usar esta tela.
          </Notice>
        ) : null}

        {error ? (
          <Notice title="Erro" variant="warning" className="mb-4">
            {error}
          </Notice>
        ) : null}

        {message ? (
          <Notice title="Sucesso" variant="success" className="mb-4">
            {message}
          </Notice>
        ) : null}

        {canRenderForm ? (
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"
          >
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Titulo</span>
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                value={formState.title}
                onChange={updateField("title")}
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Resumo</span>
              <textarea
                className="min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formState.excerpt}
                onChange={updateField("excerpt")}
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-600">Conteudo</span>
              <textarea
                className="min-h-[180px] rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={formState.content}
                onChange={updateField("content")}
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Categoria</span>
                <select
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.category}
                  onChange={updateField("category")}
                >
                  <option value="geral">Geral</option>
                  <option value="eventos">Eventos</option>
                  <option value="classificados">Classificados</option>
                  <option value="dicas">Dicas</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Status</span>
                <select
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.status}
                  onChange={updateField("status")}
                >
                  <option value="published">Publicado</option>
                  <option value="draft">Rascunho</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">Autor</span>
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.author}
                  onChange={updateField("author")}
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-slate-600">URL da capa</span>
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={formState.coverImage}
                  onChange={updateField("coverImage")}
                  required
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        ) : null}
      </Container>
    </>
  );
}
