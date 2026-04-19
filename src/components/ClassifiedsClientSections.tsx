"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import ListingCrudActions from "@/components/ListingCrudActions";
import Notice from "@/components/Notice";
import type { Listing, ListingVehicleType } from "@/lib/database";
import { formatDateTime } from "@/lib/date";
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

function getVehicleTypeValue(listing: Listing) {
  return listing.vehicleType === "motorcycle" ? "motorcycle" : "car";
}

function getVehicleLabel(vehicleType: ListingVehicleType | undefined) {
  return vehicleType === "motorcycle" ? "Moto" : "Veículo";
}

function getVehiclePluralLabel(vehicleType: ListingVehicleType | undefined) {
  return vehicleType === "motorcycle" ? "motos" : "veículos";
}

function formatLocation(city?: string, state?: string) {
  const cityLabel = city?.trim() ?? "";
  const stateLabel = state?.trim() ?? "";

  if (cityLabel && stateLabel) return `${cityLabel}/${stateLabel}`;
  if (cityLabel) return cityLabel;
  if (stateLabel) return stateLabel;
  return "";
}

function formatMileage(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "";
  }

  return `${new Intl.NumberFormat("pt-BR").format(Math.round(value))} km`;
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

function matchesForcedVehicleType(
  listing: Listing,
  forcedVehicleType: ListingVehicleType | undefined
) {
  if (!forcedVehicleType) return true;
  return getVehicleTypeValue(listing) === forcedVehicleType;
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

function ListingCard({
  listing,
  featuredTag,
  detailHref,
  showContact = false,
  onStatusChange
}: {
  listing: Listing;
  featuredTag?: boolean;
  detailHref?: string;
  showContact?: boolean;
  onStatusChange?: (status: Listing["status"]) => void;
}) {
  const contact = getContactInfo(listing);
  const href = detailHref || `/veiculos/${listing.slug}`;
  const vehicleType = getVehicleTypeValue(listing);
  const locationLabel = formatLocation(listing.city, listing.state);
  const mileageLabel = formatMileage(listing.mileage);
  const yearLabel =
    typeof listing.modelYear === "number" && Number.isFinite(listing.modelYear)
      ? String(listing.modelYear)
      : typeof listing.year === "number" && Number.isFinite(listing.year)
        ? String(listing.year)
        : "";
  const publishedAtLabel = formatDateTime(listing.createdAt) || "Data não informada";
  const sellerName = listing.ownerProfile?.displayName?.trim() || "";
  const showCompanyLink =
    listing.ownerProfile &&
    (listing.ownerProfile.accountType === "company" ||
      listing.ownerProfile.accountType === "agency");

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="group block overflow-hidden">
        <div className="relative">
          <Image
            src={getListingImageSrc(listing.images)}
            alt={listingImageAlt(listing.title)}
            width={1200}
            height={800}
            className="h-56 w-full bg-slate-100 object-contain p-2 transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />

          <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-900/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {getVehicleLabel(vehicleType)}
              </span>
              {featuredTag ? (
                <span className="rounded-full bg-amber-400/95 px-3 py-1 text-xs font-semibold text-slate-950">
                  Destaque
                </span>
              ) : null}
            </div>

            <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
              {publishedAtLabel}
            </span>
          </div>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={href}
              className="line-clamp-2 text-lg font-semibold text-slate-900 hover:text-brand-800"
            >
              {listing.title}
            </Link>
            <div className="mt-1 text-sm text-slate-600">
              {[listing.make, listing.model].filter(Boolean).join(" | ")}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Preço
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {formatCurrencyBRL(listing.price)}
            </div>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
          {listing.description}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {locationLabel ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {locationLabel}
            </span>
          ) : null}
          {yearLabel ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Ano {yearLabel}
            </span>
          ) : null}
          {mileageLabel ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {mileageLabel}
            </span>
          ) : null}
        </div>

        {showCompanyLink ? (
          <div className="mt-4">
            <Link
              href={`/empresas/${listing.ownerProfile?.id}`}
              className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-200"
            >
              Mais anúncios de {sellerName || "este anunciante"}
            </Link>
          </div>
        ) : null}

        {showContact && (contact.email || contact.phone) ? (
          <div className="mt-4 grid gap-1 border-t border-slate-100 pt-4 text-xs text-slate-600">
            {contact.email ? <div>Email: {contact.email}</div> : null}
            {contact.phone ? <div>Telefone: {contact.phone}</div> : null}
          </div>
        ) : null}

        <ListingCrudActions
          listingId={listing.id}
          status={listing.status}
          editHref={`/veiculos/gerenciar/${listing.id}`}
          compact
          onStatusChange={onStatusChange}
        />
      </div>
    </article>
  );
}

type Props = {
  listings: Listing[];
  forcedVehicleType?: ListingVehicleType;
  featuredSectionTitle?: string;
  featuredSectionSubtitle?: string;
  latestSectionTitle?: string;
  latestSectionSubtitle?: string;
};

export default function ClassifiedsClientSections({
  listings,
  forcedVehicleType,
  featuredSectionTitle,
  featuredSectionSubtitle,
  latestSectionTitle,
  latestSectionSubtitle
}: Props) {
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const { overrides } = useListingOverrides();
  const [featuredCursor, setFeaturedCursor] = useState(0);
  const [makeFilter, setMakeFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [blackPlateFilter, setBlackPlateFilter] = useState("all");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>(
    forcedVehicleType ?? "all"
  );
  const [page, setPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const now = Date.now();

  const entityPluralLabel = getVehiclePluralLabel(forcedVehicleType);
  const entitySingularLabel = forcedVehicleType === "motorcycle" ? "moto" : "veículo";
  const resolvedFeaturedTitle =
    featuredSectionTitle ?? (forcedVehicleType === "motorcycle" ? "Motos em destaque" : "Em destaque");
  const resolvedFeaturedSubtitle =
    featuredSectionSubtitle ??
    (forcedVehicleType === "motorcycle"
      ? "Motos destacadas aparecem em uma vitrine exclusiva."
      : "Veículos destacados aparecem nesta vitrine.");
  const resolvedLatestTitle =
    latestSectionTitle ??
    (forcedVehicleType === "motorcycle" ? "Ultimas motos" : "Ultimos veículos");
  const resolvedLatestSubtitle =
    latestSectionSubtitle ??
    (forcedVehicleType === "motorcycle"
      ? "Lista das motos mais recentes aprovadas pela plataforma."
      : "Lista dos veículos mais recentes, incluindo carros e motos.");

  useEffect(() => {
    setVehicleTypeFilter(forcedVehicleType ?? "all");
  }, [forcedVehicleType]);

  const effectiveListings = applyListingOverrides(listings, overrides);
  const scopedListings = effectiveListings.filter((listing) =>
    matchesForcedVehicleType(listing, forcedVehicleType)
  );

  const pending = scopedListings
    .filter((listing) => listing.status === "pending")
    .sort(byCreatedAtDesc);

  const approved = scopedListings.filter(
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

  const featuredSignature = featuredActive.map((listing) => listing.id).join("|");
  const featuredRotationStart = useMemo(() => {
    const signature = featuredSignature;
    void signature;
    if (featuredActive.length <= 1) return 0;
    return Math.floor(Math.random() * featuredActive.length);
  }, [featuredActive.length, featuredSignature]);

  const featuredRotated = useMemo(() => {
    if (featuredActive.length <= 1) return featuredActive;
    return [
      ...featuredActive.slice(featuredRotationStart),
      ...featuredActive.slice(0, featuredRotationStart)
    ];
  }, [featuredActive, featuredRotationStart]);

  useEffect(() => {
    setFeaturedCursor(0);
  }, [featuredSignature]);

  useEffect(() => {
    setPage(1);
  }, [blackPlateFilter, makeFilter, modelFilter, stateFilter, vehicleTypeFilter, yearFilter]);

  useEffect(() => {
    setPendingPage(1);
  }, [pending.length]);

  const canSlideFeatured = featuredRotated.length > 3;
  const visibleFeatured = canSlideFeatured
    ? Array.from({ length: 3 }, (_, index) => featuredRotated[(featuredCursor + index) % featuredRotated.length])
    : featuredRotated;

  const allMakes = Array.from(new Set(latest.map((listing) => listing.make).filter(Boolean))).sort();
  const allStates = Array.from(new Set(latest.map((listing) => listing.state).filter(Boolean))).sort();
  const allYears = Array.from(
    new Set(latest.map((listing) => String(listing.modelYear || listing.year)).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));
  const vehicleTypeOptions = Array.from(
    new Set(latest.map((listing) => getVehicleTypeValue(listing)))
  );
  const modelOptions = Array.from(
    new Set(
      latest
        .filter((listing) => makeFilter === "all" || listing.make === makeFilter)
        .map((listing) => listing.model)
        .filter(Boolean)
    )
  ).sort();

  const filteredLatest = latest.filter((listing) => {
    if (makeFilter !== "all" && listing.make !== makeFilter) return false;
    if (modelFilter !== "all" && listing.model !== modelFilter) return false;
    if (stateFilter !== "all" && listing.state !== stateFilter) return false;
    if (yearFilter !== "all" && String(listing.modelYear || listing.year) !== yearFilter) {
      return false;
    }
    if (!forcedVehicleType && vehicleTypeFilter !== "all" && getVehicleTypeValue(listing) !== vehicleTypeFilter) {
      return false;
    }
    if (blackPlateFilter === "sim" && !listing.specifications?.blackPlate) return false;
    if (blackPlateFilter === "não" && listing.specifications?.blackPlate) return false;
    return true;
  });

  const configuredPageSize =
    typeof settings.publicDisplay.pageSize === "number" && settings.publicDisplay.pageSize > 0
      ? settings.publicDisplay.pageSize
      : 12;
  const totalPages = Math.max(1, Math.ceil(filteredLatest.length / configuredPageSize));
  const safePage = Math.min(page, totalPages);
  const páginatedLatest = filteredLatest.slice(
    (safePage - 1) * configuredPageSize,
    safePage * configuredPageSize
  );

  const pendingPageSize = 9;
  const pendingTotalPages = Math.max(1, Math.ceil(pending.length / pendingPageSize));
  const safePendingPage = Math.min(pendingPage, pendingTotalPages);
  const páginatedPending = pending.slice(
    (safePendingPage - 1) * pendingPageSize,
    safePendingPage * pendingPageSize
  );

  return (
    <>
      {expiredCount > 0 ? (
        <Notice title="Automacao" variant="warning" className="mt-4">
          {expiredCount} {entitySingularLabel}(s) foram ocultados por expiracao automatica.
        </Notice>
      ) : null}

      {user?.role === "admin" && pending.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Pendentes (admin)</h2>
              <p className="mt-1 text-sm text-slate-600">
                Cada anúncio pendente pode ser aprovado, rejeitado, editado ou excluido no proprio card.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {páginatedPending.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                detailHref={`/veiculos/gerenciar/${listing.id}`}
                showContact={Boolean(user)}
                onStatusChange={() => window.location.reload()}
              />
            ))}
          </div>

          {pending.length > 0 ? (
            <div className="mt-5 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-600">
                Página {safePendingPage} de {pendingTotalPages} ({pending.length} cadastro(s))
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
                  disabled={safePendingPage <= 1}
                  onClick={() => setPendingPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
                  disabled={safePendingPage >= pendingTotalPages}
                  onClick={() => setPendingPage((current) => Math.min(pendingTotalPages, current + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section id="classificados-destaques" className="mt-10 scroll-mt-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{resolvedFeaturedTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{resolvedFeaturedSubtitle}</p>
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
                aria-label="Ver próximos destaques"
              >
                {">"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleFeatured.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              featuredTag
              showContact={Boolean(user)}
            />
          ))}

          {featuredActive.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum {entitySingularLabel} em destaque no momento.
            </div>
          ) : null}
        </div>
      </section>

      <section id="classificados-recentes" className="mt-14 scroll-mt-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{resolvedLatestTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{resolvedLatestSubtitle}</p>
          </div>
        </div>

        <div
          className={`mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 ${
            forcedVehicleType ? "lg:grid-cols-5" : "lg:grid-cols-6"
          }`}
        >
          <select
            className="h-10 rounded-md border border-slate-300 px-2 text-sm"
            value={makeFilter}
            onChange={(event) => {
              setMakeFilter(event.target.value);
              setModelFilter("all");
            }}
          >
            <option value="all">Todas as marcas</option>
            {allMakes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border border-slate-300 px-2 text-sm"
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
          >
            <option value="all">Todos os modelos</option>
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border border-slate-300 px-2 text-sm"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
          >
            <option value="all">Todos os estados</option>
            {allStates.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border border-slate-300 px-2 text-sm"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          >
            <option value="all">Todos os anos</option>
            {allYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          {!forcedVehicleType ? (
            <select
              className="h-10 rounded-md border border-slate-300 px-2 text-sm"
              value={vehicleTypeFilter}
              onChange={(event) => setVehicleTypeFilter(event.target.value)}
            >
              <option value="all">Tipo: todos</option>
              {vehicleTypeOptions.map((item) => (
                <option key={item} value={item}>
                  {item === "motorcycle" ? "Motos" : "Carros"}
                </option>
              ))}
            </select>
          ) : null}

          <select
            className="h-10 rounded-md border border-slate-300 px-2 text-sm"
            value={blackPlateFilter}
            onChange={(event) => setBlackPlateFilter(event.target.value)}
          >
            <option value="all">Placa preta: todos</option>
            <option value="sim">Placa preta: sim</option>
            <option value="não">Placa preta: não</option>
          </select>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {páginatedLatest.map((listing) => (
            <ListingCard key={listing.id} listing={listing} showContact={Boolean(user)} />
          ))}

          {páginatedLatest.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum {entitySingularLabel} disponível no momento.
            </div>
          ) : null}
        </div>

        {filteredLatest.length > 0 ? (
          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600">
              Página {safePage} de {totalPages} ({filteredLatest.length} {entityPluralLabel})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
                disabled={safePage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
