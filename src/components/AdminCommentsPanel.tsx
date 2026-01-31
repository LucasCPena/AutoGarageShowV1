"use client";

import { useMemo } from "react";

import Notice from "@/components/Notice";
import { formatDateLong } from "@/lib/date";
import { useComments } from "@/lib/useComments";

export default function AdminCommentsPanel() {
  const { comments, approveComment, rejectComment, getPendingCount } = useComments();

  const pending = useMemo(() => comments.filter((c) => c.status === "pending"), [comments]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Comentários (moderação)</div>
          <div className="mt-1 text-sm text-slate-600">
            Apenas comentários aprovados são exibidos publicamente.
          </div>
        </div>
        <div className="text-sm font-semibold text-slate-900">
          {getPendingCount()} pendente(s)
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {pending.length === 0 ? (
          <Notice title="Sem pendências" variant="info">
            Nenhum comentário aguardando aprovação.
          </Notice>
        ) : (
          pending.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">{c.author}</div>
                  <div className="mt-1 text-xs text-slate-600">{formatDateLong(c.createdAt)}</div>
                  <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => approveComment(c.id)}
                    className="rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectComment(c.id)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Rejeitar
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
