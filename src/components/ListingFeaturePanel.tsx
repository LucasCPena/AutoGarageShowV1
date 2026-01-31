"use client";

import { useMemo, useState } from "react";

import MockPayment from "@/components/MockPayment";
import Notice from "@/components/Notice";
import { applyListingOverride } from "@/lib/listingOverrides";
import type { Listing } from "@/lib/mockData";
import { useListingOverrides } from "@/lib/useListingOverrides";
import { useSiteSettings } from "@/lib/useSiteSettings";

const DAY_MS = 1000 * 60 * 60 * 24;

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
  const { settings } = useSiteSettings();
  const { overrides, setOverride } = useListingOverrides();

  const durationOptions = settings.listingFeaturedDurationsDays.length
    ? settings.listingFeaturedDurationsDays
    : [7, 14, 21, 30];

  const [selectedDays, setSelectedDays] = useState(() => String(durationOptions[0] ?? 7));

  const effective = useMemo(
    () => applyListingOverride(listing, overrides[listing.id]),
    [listing, overrides]
  );

  const now = Date.now();
  const featuredActive = isFeaturedActive(effective, now);

  const daysNumber = Number(selectedDays) || (durationOptions[0] ?? 7);

  function activate(days: number) {
    const until = new Date(Date.now() + days * DAY_MS).toISOString();
    setOverride(listing.id, { isFeatured: true, featuredUntil: until });
  }

  return (
    <div className="grid gap-4">
      {featuredActive ? (
        <Notice title="Ativo" variant="success">
          Este anúncio está em destaque.
        </Notice>
      ) : (
        <Notice title="Status" variant="info">
          Este anúncio não está em destaque.
        </Notice>
      )}

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-600">Duração do destaque</span>
        <select
          className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          value={selectedDays}
          onChange={(e) => setSelectedDays(e.target.value)}
        >
          {durationOptions.map((d) => (
            <option key={d} value={String(d)}>
              {d} dias
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        onClick={() => activate(daysNumber)}
      >
        Ativar destaque agora (mock)
      </button>

      {!featuredActive ? (
        <MockPayment
          amountLabel={amountLabel}
          onPaid={() => {
            activate(daysNumber);
          }}
        />
      ) : null}
    </div>
  );
}
