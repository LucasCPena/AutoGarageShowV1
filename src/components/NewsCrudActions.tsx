"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/useAuth";

type Props = {
  newsId: string;
  editHref: string;
  compact?: boolean;
  onDeleted?: () => void;
};

export default function NewsCrudActions({
  newsId,
  editHref,
  compact = false,
  onDeleted
}: Props) {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [busyAction, setBusyAction] = useState<"duplicate" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (isLoading || user?.role !== "admin") {
    return null;
  }

  async function handleDuplicate() {
    if (!token) {
      setMessage("Token de autenticacao nao encontrado.");
      return;
    }
    setBusyAction("duplicate");
    setMessage(null);
    try {
      const response = await fetch(`/api/noticias/${newsId}/duplicate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao duplicar noticia.");
      }
      if (data.news?.id) {
        router.push(`/noticias/gerenciar/${data.news.id}`);
        return;
      }
      setMessage("Noticia duplicada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao duplicar noticia.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!token) {
      setMessage("Token de autenticacao nao encontrado.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir esta noticia?")) return;

    setBusyAction("delete");
    setMessage(null);
    try {
      const response = await fetch(`/api/noticias/${newsId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir noticia.");
      }

      if (onDeleted) {
        onDeleted();
      } else {
        router.push("/noticias");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao excluir noticia.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className="flex flex-wrap gap-2">
        <Link
          href={editHref}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Editar
        </Link>
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={busyAction !== null}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {busyAction === "duplicate" ? "Duplicando..." : "Duplicar"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busyAction !== null}
          className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {busyAction === "delete" ? "Excluindo..." : "Excluir"}
        </button>
      </div>
      {message ? (
        <div className="mt-2 text-xs text-red-700">{message}</div>
      ) : null}
    </div>
  );
}
