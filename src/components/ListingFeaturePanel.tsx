"use client";

import { useMemo } from "react";

import MockPayment from "@/components/MockPayment";
import Notice from "@/components/Notice";
import { applyListingOverride } from "@/lib/listingOverrides";
import type { Listing } from "@/lib/database";
import { useListingOverrides } from "@/lib/useListingOverrides";

const DAY_MS = 1000 * 60 * 60 * 24;
const FEATURE_DAYS = 30;

type Props = {
  listing: Listing;
  amountLabel: string;
};

function isFeaturedActive(listing: Listing, now: number) {
  if (!listing.featured) return false;
  if (!listing.featuredUntil) return true;
  const until = new Date(listing.featuredUntil).getTime();
  return Number.isFinite(until) ? until > now : true;
}

export default function ListingFeaturePanel({ listing, amountLabel }: Props) {
  const { overrides, setOverride } = useListingOverrides();

  const effective = useMemo(
    () => applyListingOverride(listing, overrides[listing.id]),
    [listing, overrides]
  );

  const now = Date.now();
  const featuredActive = isFeaturedActive(effective, now);

  function activate(days: number) {
    const until = new Date(Date.now() + days * DAY_MS).toISOString();
    setOverride(listing.id, { isFeatured: true, featuredUntil: until });
  }

  return (
    <div className="grid gap-4">
      {featuredActive ? (
        <Notice title="Ativo" variant="success">
          Este anuncio esta em destaque.
        </Notice>
      ) : (
        <Notice title="Status" variant="info">
          Este anuncio nao esta em destaque.
        </Notice>
      )}

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-600">Duracao do destaque</span>
        <input
          readOnly
          value={`${FEATURE_DAYS} dias`}
          className="h-10 rounded-md border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700"
        />
      </label>

      <button
        type="button"
        className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        onClick={() => activate(FEATURE_DAYS)}
      >
        Ativar destaque agora (mock)
      </button>

      {!featuredActive ? (
        <MockPayment
          amountLabel={amountLabel}
          onPaid={() => {
            activate(FEATURE_DAYS);
          }}
        />
      ) : null}
    </div>
  );
}
