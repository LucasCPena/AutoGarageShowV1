"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Listing } from "@/lib/database";
import { useAuth } from "@/lib/useAuth";

type Props = {
  listingId: string;
  editHref: string;
  status?: Listing["status"];
  compact?: boolean;
  onDeleted?: () => void;
  onStatusChange?: (status: Listing["status"]) => void;
};

export default function ListingCrudActions({
  listingId,
  editHref,
  status,
  compact = false,
  onDeleted,
  onStatusChange
}: Props) {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (isLoading || user?.role !== "admin") {
    return null;
  }

  async function handleModeration(action: "approve" | "reject") {
    if (!token) {
      setMessage("Token de autenticacao nao encontrado.");
      return;
    }

    setBusyAction(action);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/listings/${listingId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar classificado.");
      }

      if (data.listing?.status && onStatusChange) {
        onStatusChange(data.listing.status);
        return;
      }

      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao atualizar classificado."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    if (!token) {
      setMessage("Token de autenticacao nao encontrado.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este classificado?")) return;

    setBusyAction("delete");
    setMessage(null);
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir classificado.");
      }

      if (onDeleted) {
        onDeleted();
      } else {
        router.push("/classificados");
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao excluir classificado."
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className={compact ? "mt-3" : "mt-4"}>
      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <>
            <button
              type="button"
              onClick={() => handleModeration("approve")}
              disabled={busyAction !== null}
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busyAction === "approve" ? "Aprovando..." : "Aprovar"}
            </button>
            <button
              type="button"
              onClick={() => handleModeration("reject")}
              disabled={busyAction !== null}
              className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busyAction === "reject" ? "Rejeitando..." : "Rejeitar"}
            </button>
          </>
        ) : null}
        <Link
          href={editHref}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Editar
        </Link>
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
