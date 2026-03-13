"use client";

import { useEffect, useState } from "react";

import Notice from "@/components/Notice";
import { formatDateLong } from "@/lib/date";
import { useAuth } from "@/lib/useAuth";

type Props = {
  listingId: string;
};

type CommentItem = {
  id: string;
  listingId: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};

export default function CommentsSection({ listingId }: Props) {
  const { user, token, isLoading: authLoading } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [pendingComments, setPendingComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moderationMessage, setModerationMessage] = useState<string | null>(null);
  const [author, setAuthor] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function loadApprovedComments() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comments?listingId=${encodeURIComponent(listingId)}`, {
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar comentarios.");
      }
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erro ao carregar comentarios.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingComments() {
    if (user?.role !== "admin" || !token) {
      setPendingComments([]);
      return;
    }

    setPendingLoading(true);
    setModerationMessage(null);

    try {
      const response = await fetch(
        `/api/comments?pending=true&listingId=${encodeURIComponent(listingId)}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar comentarios pendentes.");
      }
      setPendingComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (fetchError) {
      setModerationMessage(
        fetchError instanceof Error
          ? fetchError.message
          : "Erro ao carregar comentarios pendentes."
      );
    } finally {
      setPendingLoading(false);
    }
  }

  useEffect(() => {
    loadApprovedComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role === "admin" && token) {
      loadPendingComments();
      return;
    }
    setPendingComments([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, listingId, token, user?.role]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !email.trim() || !content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          listingId,
          name: author.trim(),
          email: email.trim(),
          message: content.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao enviar comentario.");
      }

      setAuthor("");
      setEmail("");
      setContent("");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao enviar comentario.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateCommentStatus(commentId: string, status: "approved" | "rejected") {
    if (!token) {
      setModerationMessage("Token de autenticacao nao encontrado.");
      return;
    }

    setBusyCommentId(commentId);
    setModerationMessage(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar comentario.");
      }

      setPendingComments((current) => current.filter((comment) => comment.id !== commentId));
      if (status === "approved") {
        loadApprovedComments();
      }
      setModerationMessage(
        status === "approved" ? "Comentario aprovado." : "Comentario rejeitado."
      );
    } catch (updateError) {
      setModerationMessage(
        updateError instanceof Error ? updateError.message : "Erro ao atualizar comentario."
      );
    } finally {
      setBusyCommentId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold text-slate-900">Comentarios</div>
      <p className="mt-2 text-sm text-slate-600">
        Deixe uma pergunta ou comentario. Apenas comentarios aprovados sao exibidos.
      </p>

      {user?.role === "admin" ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Liberacao de comentarios</div>
              <div className="mt-1 text-xs text-slate-600">
                Aprove ou rejeite os comentarios pendentes deste anuncio.
              </div>
            </div>
            <div className="text-sm font-semibold text-slate-900">
              Pendentes: {pendingComments.length}
            </div>
          </div>

          {moderationMessage ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {moderationMessage}
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {pendingLoading ? (
              <div className="text-sm text-slate-600">Carregando comentarios pendentes...</div>
            ) : pendingComments.length === 0 ? (
              <div className="text-sm text-slate-600">Nenhum comentario pendente neste anuncio.</div>
            ) : (
              pendingComments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">{comment.name}</div>
                  <div className="mt-1 text-xs text-slate-600">{comment.email}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDateLong(comment.createdAt)}</div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{comment.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateCommentStatus(comment.id, "approved")}
                      disabled={busyCommentId !== null}
                      className="rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {busyCommentId === comment.id ? "Salvando..." : "Aprovar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCommentStatus(comment.id, "rejected")}
                      disabled={busyCommentId !== null}
                      className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      {busyCommentId === comment.id ? "Salvando..." : "Rejeitar"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {submitted ? (
        <Notice title="Enviado" variant="success" className="mt-4">
          Seu comentario foi enviado e aguarda aprovacao.
        </Notice>
      ) : null}

      {error ? (
        <Notice title="Erro" variant="warning" className="mt-4">
          {error}
        </Notice>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Seu nome</span>
          <input
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Nome"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Seu e-mail</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="voce@email.com"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Comentario</span>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Sua mensagem..."
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar comentario"}
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando comentarios...</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum comentario aprovado ainda.</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{comment.name}</div>
                <div className="mt-1 text-xs text-slate-600">{formatDateLong(comment.createdAt)}</div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{comment.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
