"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import Notice from "@/components/Notice";
import type { Listing } from "@/lib/database";
import { formatDateTime } from "@/lib/date";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { useAuth } from "@/lib/useAuth";

type Props = {
  listing: Listing;
};

export default function ListingFeaturePanel({ listing }: Props) {
  const { user, token } = useAuth();
  const { settings } = useSiteSettings();
  const [busyDay, setBusyDay] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManageFeature = user?.role === "admin" || user?.id === listing.createdBy;
  const durations = useMemo(
    () => settings.listingFeaturedDurationsDays.filter((item) => item > 0),
    [settings.listingFeaturedDurationsDays]
  );

  if (!user) {
    return (
      <Notice title="Destaque do anúncio" variant="info">
        Faça login para destacar o seu classificado e escolher um período disponível.
      </Notice>
    );
  }

  if (!canManageFeature) {
    return null;
  }

  async function handleFeature(days: number) {
    if (!token) {
      setError("Sua sessão expirou. Faça login novamente.");
      return;
    }

    setBusyDay(days);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listing.id}/feature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ days })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível destacar o anúncio.");
      }

      setMessage(`Anúncio destacado por ${days} dia(s). A página sera atualizada.`);
      window.setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (featureError) {
      setError(
        featureError instanceof Error
          ? featureError.message
          : "Não foi possível destacar o anúncio."
      );
    } finally {
      setBusyDay(null);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">Destacar anúncio</div>
      <p className="mt-2 text-sm text-slate-600">
        Escolha um período de destaque disponível para este classificado.
      </p>

      {listing.featured ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Em destaque {listing.featuredUntil ? `ate ${formatDateTime(listing.featuredUntil)}` : "por tempo ativo"}.
        </div>
      ) : null}

      {message ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {durations.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => handleFeature(days)}
            disabled={busyDay !== null}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
          >
            {busyDay === days ? "Processando..." : `${days} dia(s)`}
          </button>
        ))}
      </div>

      <Link
        href="/planos"
        className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        Ver planos disponiveis
      </Link>
    </div>
  );
}
