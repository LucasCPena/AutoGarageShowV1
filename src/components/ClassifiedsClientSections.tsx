"use client";

import Image from "next/image";
import Link from "next/link";

import Notice from "@/components/Notice";
import { formatCurrencyBRL } from "@/lib/format";
import { applyListingOverrides } from "@/lib/listingOverrides";
import type { Listing } from "@/lib/mockData";
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

type Props = {
  listings: Listing[];
};

export default function ClassifiedsClientSections({ listings }: Props) {
  const { settings } = useSiteSettings();
  const { overrides } = useListingOverrides();
  const now = Date.now();

  const effectiveListings = applyListingOverrides(listings, overrides);
  const approved = effectiveListings.filter((l) => l.status === "approved" || l.status === "active");
  const expiredCount = approved.filter((l) => isExpired(l, settings.listingAutoExpireDays, now)).length;

  const visible = approved
    .filter((l) => !isExpired(l, settings.listingAutoExpireDays, now))
    .sort(byCreatedAtDesc);

  const featuredActive = visible
    .filter((l) => isFeaturedActive(l, now))
    .sort(byFeaturedUntilDesc);

  const latest = visible
    .filter((l) => !isFeaturedActive(l, now))
    .sort(byCreatedAtDesc);

  const maxAllowedYear = new Date().getFullYear() - settings.vehicleMinAgeYears;

  const noticeText =
    settings.listingAutoExpireDays > 0
      ? `Anúncios são inativados automaticamente após ${settings.listingAutoExpireDays} dias.`
      : "Inativação automática desativada.";

  return (
    <>
      <Notice title="Regras e segurança (planejado)" variant="info">
        Anúncios dependem de aprovação. Limites por documento: CPF até {settings.listingLimits.cpf} anúncios ativos e CNPJ até {settings.listingLimits.cnpj}. Apenas veículos com {settings.vehicleMinAgeYears}+ anos (ano máximo: {maxAllowedYear}). {noticeText}
      </Notice>

      {expiredCount > 0 ? (
        <Notice title="Automação" variant="warning" className="mt-4">
          {expiredCount} anúncio(s) foram ocultados por expiração automática. No sistema final, o anunciante será notificado e poderá reativar pelo painel.
        </Notice>
      ) : null}

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Em destaque</h2>
            <p className="mt-1 text-sm text-slate-600">
              Destaque pago: o anúncio volta ao topo por um período configurável.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredActive.map((l) => (
            <Link
              key={l.id}
              href={`/classificados/${l.slug}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-brand-200"
            >
              <Image
                src={l.images[0]}
                alt={l.title}
                width={1200}
                height={800}
                className="h-44 w-full object-cover"
              />
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-brand-800">
                    {l.title}
                  </div>
                  <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                    Destaque
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {l.city}/{l.state} • {l.year}
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">
                  {formatCurrencyBRL(l.price)}
                </div>
              </div>
            </Link>
          ))}

          {featuredActive.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum anúncio em destaque.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Últimos anúncios</h2>
            <p className="mt-1 text-sm text-slate-600">
              Ordenação tipo OLX: os anúncios mais recentes aparecem primeiro.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((l) => (
            <Link
              key={l.id}
              href={`/classificados/${l.slug}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-brand-200"
            >
              <Image
                src={l.images[0]}
                alt={l.title}
                width={1200}
                height={800}
                className="h-44 w-full object-cover"
                loading="lazy"
              />
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-brand-800">
                    {l.title}
                  </div>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {l.city}/{l.state} • {l.year}
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">
                  {formatCurrencyBRL(l.price)}
                </div>
              </div>
            </Link>
          ))}

          {latest.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum anúncio disponível no momento.
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
