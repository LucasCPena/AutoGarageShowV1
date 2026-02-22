"use client";

import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { formatDateLong } from "@/lib/date";

type Props = {
  token: string | null;
};

type CommentItem = {
  id: string;
  listingId: string;
  eventId?: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};

type Message = {
  type: "success" | "error";
  text: string;
} | null;

export default function AdminCommentsPanel({ token }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const pending = useMemo(
    () => comments.filter((comment) => comment.status === "pending"),
    [comments]
  );

  async function loadPendingComments() {
    setLoading(true);
    try {
      const response = await fetch("/api/comments?pending=true", {
        cache: "no-store",
        headers: token
          ? {
              Authorization: `Bearer ${token}`
            }
          : undefined
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar comentarios pendentes.");
      }
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao carregar comentarios pendentes."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage({ type: "error", text: "Token de autenticacao nao encontrado." });
      return;
    }
    loadPendingComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function updateCommentStatus(commentId: string, status: "approved" | "rejected") {
    if (!token) {
      setMessage({ type: "error", text: "Token de autenticacao nao encontrado." });
      return;
    }

    setBusyId(commentId);
    setMessage(null);

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

      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setMessage({
        type: "success",
        text: status === "approved" ? "Comentario aprovado." : "Comentario rejeitado."
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro ao atualizar comentario."
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Comentarios de anuncios</div>
          <div className="mt-1 text-sm text-slate-600">
            Comentarios enviados nos anuncios que aguardam moderacao.
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-900">
          Pendentes: {pending.length}
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

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando comentarios...</div>
        ) : pending.length === 0 ? (
          <Notice title="Sem pendencias" variant="info">
            Nenhum comentario aguardando aprovacao.
          </Notice>
        ) : (
          pending.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[220px] flex-1">
                  <div className="text-sm font-semibold text-slate-900">{comment.name}</div>
                  <div className="mt-1 text-xs text-slate-600">{comment.email}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDateLong(comment.createdAt)}</div>
                  <div className="mt-2 text-xs text-slate-600">
                    Anuncio ID: {comment.listingId}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{comment.message}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => updateCommentStatus(comment.id, "approved")}
                    disabled={busyId !== null}
                    className="rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                  >
                    {busyId === comment.id ? "Salvando..." : "Aprovar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCommentStatus(comment.id, "rejected")}
                    disabled={busyId !== null}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  >
                    {busyId === comment.id ? "Salvando..." : "Rejeitar"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
