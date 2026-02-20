"use client";

import Image from "next/image";
import Link from "next/link";

import ListingCrudActions from "@/components/ListingCrudActions";
import Notice from "@/components/Notice";
import type { Listing } from "@/lib/database";
import { formatCurrencyBRL } from "@/lib/format";
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

  return parts.join(" • ");
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
  detailHref
}: {
  listing: Listing;
  featuredTag?: boolean;
  detailHref?: string;
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
          alt={listing.title}
          width={1200}
          height={800}
          className="h-44 w-full object-cover"
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
          {featuredTag ? (
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
              Destaque
            </span>
          ) : null}
        </div>

        <div className="mt-1 text-sm text-slate-600">{formatListingMeta(listing)}</div>
        <div className="mt-3 text-sm font-semibold text-slate-900">
          {formatCurrencyBRL(listing.price)}
        </div>

        {(contact.email || contact.phone) ? (
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

  const visible = approved
    .filter((listing) => !isExpired(listing, settings.listingAutoExpireDays, now))
    .sort(byCreatedAtDesc);

  const featuredActive = visible
    .filter((listing) => isFeaturedActive(listing, now))
    .sort(byFeaturedUntilDesc);

  const latest = visible
    .filter((listing) => !isFeaturedActive(listing, now))
    .sort(byCreatedAtDesc);

  const maxAllowedYear = new Date().getFullYear() - settings.vehicleMinAgeYears;

  const noticeText =
    settings.listingAutoExpireDays > 0
      ? `Anuncios sao inativados automaticamente apos ${settings.listingAutoExpireDays} dias.`
      : "Inativacao automatica desativada.";

  return (
    <>
      <Notice title="Regras e seguranca (planejado)" variant="info">
        Anuncios dependem de aprovacao. Limites por documento: CPF ate {settings.listingLimits.cpf} anuncios ativos e CNPJ ate {settings.listingLimits.cnpj}. Apenas veiculos com {settings.vehicleMinAgeYears}+ anos (ano maximo: {maxAllowedYear}). {noticeText}
      </Notice>

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
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Em destaque</h2>
            <p className="mt-1 text-sm text-slate-600">
              Destaque pago: o anuncio volta ao topo por um periodo configuravel.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredActive.map((listing) => (
            <ListingCard key={listing.id} listing={listing} featuredTag />
          ))}

          {featuredActive.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum anuncio em destaque.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Ultimos anuncios</h2>
            <p className="mt-1 text-sm text-slate-600">
              Ordenacao tipo OLX: os anuncios mais recentes aparecem primeiro.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}

          {latest.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum anuncio disponivel no momento.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
