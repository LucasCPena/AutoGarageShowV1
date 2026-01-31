"use client";

import { useState } from "react";

import Notice from "@/components/Notice";
import type { CommentDraft } from "@/lib/comments";
import { useComments } from "@/lib/useComments";

type Props = {
  listingId: string;
  parentCommentId: string;
  onCancel?: () => void;
};

export default function ReplyForm({ listingId, parentCommentId, onCancel }: Props) {
  const { addComment } = useComments();
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;
    addComment({ listingId, author: author.trim(), content: content.trim() });
    setAuthor("");
    setContent("");
    setSubmitted(true);
    if (onCancel) onCancel();
  }

  if (submitted) {
    return (
      <Notice title="Enviado" variant="success" className="mt-2">
        Sua resposta foi enviada e aguarda aprovação.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 grid gap-2 border-l-2 border-slate-200 pl-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          required
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="h-9 rounded-md border border-slate-300 px-3 text-sm"
          placeholder="Seu nome"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
        >
          Responder
        </button>
      </div>
      <textarea
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Sua resposta..."
      />
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-600 hover:text-slate-800"
        >
          Cancelar
        </button>
      )}
    </form>
  );
}
