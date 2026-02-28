"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import ListingCrudActions from "@/components/ListingCrudActions";
import Notice from "@/components/Notice";
import type { Listing } from "@/lib/database";
import { formatCurrencyBRL } from "@/lib/format";
import { listingImageAlt } from "@/lib/image-alt";
import { applyListingOverrides } from "@/lib/listingOverrides";
import { normalizeAssetReference } from "@/lib/site-url";
import { useAuth } from "@/lib/useAuth";
import { useListingOverrides } from "@/lib/useListingOverrides";
import { useSiteSettings } from "@/lib/useSiteSettings";

const DAY_MS = 1000 * 60 * 60 * 24;

function isFeaturedActive(listing: Listing, now: number) {
  if (!listing.featured) return false;
  if (!listing.featuredUntil) return true;
  const until = new Date(listing.featuredUntil).getTime();
  return Number.isFinite(until) ? until > now : true;
}

function isExpired(listing: Listing, expireDays: number, now: number) {
  if (expireDays <= 0) return false;
  const created = new Date(listing.createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return created + expireDays * DAY_MS <= now;
}

function byCreatedAtDesc(a: Listing, b: Listing) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function byFeaturedUntilDesc(a: Listing, b: Listing) {
  const aUntil = a.featuredUntil ? new Date(a.featuredUntil).getTime() : 0;
  const bUntil = b.featuredUntil ? new Date(b.featuredUntil).getTime() : 0;
  if (aUntil !== bUntil) return bUntil - aUntil;
  return byCreatedAtDesc(a, b);
}

function formatLocation(city?: string, state?: string) {
  const cityLabel = city?.trim() ?? "";
  const stateLabel = state?.trim() ?? "";

  if (cityLabel && stateLabel) return `${cityLabel}/${stateLabel}`;
  if (cityLabel) return cityLabel;
  if (stateLabel) return stateLabel;
  return "";
}

function formatListingMeta(listing: Listing) {
  const parts: string[] = [];
  const location = formatLocation(listing.city, listing.state);
  if (location) parts.push(location);

  const yearLabel =
    typeof listing.year === "number" && Number.isFinite(listing.year)
      ? String(listing.year)
      : "";
  if (yearLabel) parts.push(yearLabel);

  return parts.join(" | ");
}

function getListingImageSrc(images: string[] | undefined) {
  const firstImage = images?.[0]?.trim();
  return normalizeAssetReference(firstImage) || "/placeholders/car.svg";
}

function getContactInfo(listing: Listing) {
  const email = listing.contact?.email?.trim();
  const phone = listing.contact?.phone?.trim();
  return {
    email: email || null,
    phone: phone || null
  };
}

function ListingCard({
  listing,
  featuredTag,
  detailHref,
  showContact = false
}: {
  listing: Listing;
  featuredTag?: boolean;
  detailHref?: string;
  showContact?: boolean;
}) {
  const contact = getContactInfo(listing);
  const href = detailHref || `/classificados/${listing.slug}`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-0">
      <Link
        href={href}
        className="group block overflow-hidden rounded-2xl hover:border-brand-200"
      >
        <Image
          src={getListingImageSrc(listing.images)}
          alt={listingImageAlt(listing.title)}
          width={1200}
          height={800}
          className="h-64 w-full object-cover"
          loading="lazy"
        />
      </Link>

      <div className="p-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={href}
            className="text-sm font-semibold text-slate-900 hover:text-brand-800"
          >
            {listing.title}
          </Link>
          {null}
        </div>

        <div className="mt-1 text-sm text-slate-600">{formatListingMeta(listing)}</div>
        <div className="mt-3 text-sm font-semibold text-slate-900">
          {formatCurrencyBRL(listing.price)}
        </div>

        {showContact && (contact.email || contact.phone) ? (
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            {contact.email ? <div>Email: {contact.email}</div> : null}
            {contact.phone ? <div>Telefone: {contact.phone}</div> : null}
          </div>
        ) : null}

        <ListingCrudActions
          listingId={listing.id}
          editHref={`/classificados/gerenciar/${listing.id}`}
          compact
        />
      </div>
    </article>
  );
}

type Props = {
  listings: Listing[];
};

export default function ClassifiedsClientSections({ listings }: Props) {
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const { overrides } = useListingOverrides();
  const [featuredCursor, setFeaturedCursor] = useState(0);
  const [makeFilter, setMakeFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [page, setPage] = useState(1);
  const now = Date.now();

  const effectiveListings = applyListingOverrides(listings, overrides);
  const pending = effectiveListings
    .filter((listing) => listing.status === "pending")
    .sort(byCreatedAtDesc);

  const approved = effectiveListings.filter(
    (listing) => listing.status === "approved" || listing.status === "active"
  );

  const expiredCount = approved.filter((listing) =>
    isExpired(listing, settings.listingAutoExpireDays, now)
  ).length;

  function sortByOrderThen(primary: (a: Listing, b: Listing) => number) {
    return (a: Listing, b: Listing) => {
      const ao = overrides[a.id]?.order;
      const bo = overrides[b.id]?.order;
      if (typeof ao === "number" && typeof bo === "number") return ao - bo;
      if (typeof ao === "number") return ao - (bo ?? 1e9);
      if (typeof bo === "number") return (ao ?? 1e9) - bo;
      return primary(a, b);
    };
  }

  const visible = approved
    .filter((listing) => !isExpired(listing, settings.listingAutoExpireDays, now))
    .sort(sortByOrderThen(byCreatedAtDesc));

  const featuredActive = visible
    .filter((listing) => isFeaturedActive(listing, now))
    .sort(sortByOrderThen(byFeaturedUntilDesc));

  const latest = visible
    .filter((listing) => !isFeaturedActive(listing, now))
    .sort(sortByOrderThen(byCreatedAtDesc));

  const featuredRotated = useMemo(() => {
    if (featuredActive.length <= 1) return featuredActive;
    const start = Math.floor(Math.random() * featuredActive.length);
    return [...featuredActive.slice(start), ...featuredActive.slice(0, start)];
  }, [featuredActive]);

  useEffect(() => {
    setFeaturedCursor(0);
  }, [featuredRotated.length]);

  useEffect(() => {
    setPage(1);
  }, [makeFilter, modelFilter, stateFilter, yearFilter]);

  const canSlideFeatured = featuredRotated.length > 3;
  const visibleFeatured = canSlideFeatured
    ? Array.from({ length: 3 }, (_, index) => featuredRotated[(featuredCursor + index) % featuredRotated.length])
    : featuredRotated;

  const allMakes = Array.from(new Set(latest.map((l) => l.make).filter(Boolean))).sort();
  const allStates = Array.from(new Set(latest.map((l) => l.state).filter(Boolean))).sort();
  const allYears = Array.from(new Set(latest.map((l) => String(l.modelYear || l.year)).filter(Boolean))).sort((a,b)=>Number(b)-Number(a));
  const modelOptions = Array.from(
    new Set(latest.filter((l) => makeFilter === "all" || l.make === makeFilter).map((l) => l.model).filter(Boolean))
  ).sort();

  const filteredLatest = latest.filter((listing) => {
    if (makeFilter !== "all" && listing.make !== makeFilter) return false;
    if (modelFilter !== "all" && listing.model !== modelFilter) return false;
    if (stateFilter !== "all" && listing.state !== stateFilter) return false;
    if (yearFilter !== "all" && String(listing.modelYear || listing.year) !== yearFilter) return false;
    return true;
  });

  const pageSize = 24;
  const totalPages = Math.max(1, Math.ceil(filteredLatest.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLatest = filteredLatest.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      {expiredCount > 0 ? (
        <Notice title="Automacao" variant="warning" className="mt-4">
          {expiredCount} anuncio(s) foram ocultados por expiracao automatica.
        </Notice>
      ) : null}

      {user?.role === "admin" && pending.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Pendentes (admin)</h2>
              <p className="mt-1 text-sm text-slate-600">
                Cada post pendente possui CRUD dentro do card.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                detailHref={`/classificados/gerenciar/${listing.id}`}
                showContact={Boolean(user)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Em destaque</h2>
            <p className="mt-1 text-sm text-slate-600">
              Anuncios destacados aparecem nesta vitrine.
            </p>
          </div>

          {canSlideFeatured ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setFeaturedCursor((current) =>
                    (current - 1 + featuredRotated.length) % featuredRotated.length
                  )
                }
                className="h-9 w-9 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                aria-label="Ver destaques anteriores"
              >
                {"<"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setFeaturedCursor((current) => (current + 1) % featuredRotated.length)
                }
                className="h-9 w-9 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                aria-label="Ver proximos destaques"
              >
                {">"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleFeatured.map((listing) => (
            <ListingCard key={listing.id} listing={listing} featuredTag showContact={Boolean(user)} />
          ))}

          {featuredActive.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum anuncio em destaque.
            </div>
          ) : null}
        </div>

        {filteredLatest.length > pageSize ? (
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600">Pagina {safePage} de {totalPages} ({filteredLatest.length} anuncios)</span>
            <div className="flex gap-2">
              <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button>
              <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Proxima</button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Ultimos anuncios</h2>
            <p className="mt-1 text-sm text-slate-600">
              Lista dos anuncios mais recentes.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="h-10 rounded-md border border-slate-300 px-2 text-sm" value={makeFilter} onChange={(e)=>{ setMakeFilter(e.target.value); setModelFilter("all"); }}>
            <option value="all">Todas as marcas</option>
            {allMakes.map((make)=><option key={make} value={make}>{make}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-300 px-2 text-sm" value={modelFilter} onChange={(e)=>setModelFilter(e.target.value)}>
            <option value="all">Todos os modelos</option>
            {modelOptions.map((model)=><option key={model} value={model}>{model}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-300 px-2 text-sm" value={stateFilter} onChange={(e)=>setStateFilter(e.target.value)}>
            <option value="all">Todos os estados</option>
            {allStates.map((uf)=><option key={uf} value={uf}>{uf}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-300 px-2 text-sm" value={yearFilter} onChange={(e)=>setYearFilter(e.target.value)}>
            <option value="all">Todos os anos</option>
            {allYears.map((year)=><option key={year} value={year}>{year}</option>)}
          </select>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedLatest.map((listing) => (
            <ListingCard key={listing.id} listing={listing} showContact={Boolean(user)} />
          ))}

          {paginatedLatest.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum anuncio disponivel no momento.
            </div>
          ) : null}
        </div>

        {filteredLatest.length > pageSize ? (
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600">Pagina {safePage} de {totalPages} ({filteredLatest.length} anuncios)</span>
            <div className="flex gap-2">
              <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Anterior</button>
              <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Proxima</button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

