"use client";

import { useMemo, useState } from "react";

import Notice from "@/components/Notice";
import ReplyForm from "@/components/ReplyForm";
import { formatDateLong } from "@/lib/date";
import type { CommentDraft } from "@/lib/comments";
import { useComments } from "@/lib/useComments";

type Props = {
  listingId: string;
};

export default function CommentsSection({ listingId }: Props) {
  const { comments, addComment, getCommentsByListing } = useComments();

  const approved = useMemo(
    () => getCommentsByListing(listingId, "approved"),
    [listingId, getCommentsByListing]
  );

  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;
    addComment({ listingId, author: author.trim(), content: content.trim() });
    setAuthor("");
    setContent("");
    setSubmitted(true);
  }

  function renderComment(c: any, depth = 0) {
    return (
      <div key={c.id} className={`${depth > 0 ? "ml-6 border-l-2 border-slate-200 pl-4" : ""}`}>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">{c.author}</div>
              <div className="mt-1 text-xs text-slate-600">{formatDateLong(c.createdAt)}</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
          {depth === 0 && (
            <button
              type="button"
              onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
              className="mt-3 text-xs text-brand-700 hover:text-brand-800"
            >
              {replyingTo === c.id ? "Cancelar" : "Responder"}
            </button>
          )}
        </div>
        {replyingTo === c.id && (
          <ReplyForm
            listingId={listingId}
            parentCommentId={c.id}
            onCancel={() => setReplyingTo(null)}
          />
        )}
        {c.replies && c.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {c.replies.map((r: any) => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold text-slate-900">Comentários</div>
      <p className="mt-2 text-sm text-slate-600">
        Deixe uma pergunta ou comentário. Apenas comentários aprovados são exibidos.
      </p>

      {submitted && (
        <Notice title="Enviado" variant="success" className="mt-4">
          Seu comentário foi enviado e aguarda aprovação.
        </Notice>
      )}

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
          <span className="text-sm font-semibold text-slate-900">Comentário</span>
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
          className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Enviar comentário
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {approved.length === 0 ? (
          <div className="text-sm text-slate-600">Nenhum comentário aprovado ainda.</div>
        ) : (
          approved.map((c) => renderComment(c))
        )}
      </div>
    </div>
  );
}
