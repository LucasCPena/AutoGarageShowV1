"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/lib/useAuth";

type Props = {
  serviceId: string;
  editHref: string;
  compact?: boolean;
  onDeleted?: () => void;
};

export default function ServiceCrudActions({
  serviceId,
  editHref,
  compact = false,
  onDeleted
}: Props) {
  const router = useRouter();
  const { user, token, isLoading, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canManage = Boolean(user && (user.role === "admin" || user.id === serviceId));

  if (isLoading || !canManage) {
    return null;
  }

  async function handleDelete() {
    if (!token) {
      setMessage("Token de autenticação não encontrado.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir serviço.");
      }

      if (onDeleted) {
        onDeleted();
        return;
      }

      if (user?.id === serviceId) {
        await logout("/servicos");
        return;
      }

      router.push("/servicos");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao excluir serviço.");
    } finally {
      setBusy(false);
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
          onClick={handleDelete}
          disabled={busy}
          className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {busy ? "Excluindo..." : "Excluir"}
        </button>
      </div>
      {message ? <div className="mt-2 text-xs text-red-700">{message}</div> : null}
    </div>
  );
}
