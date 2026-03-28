import Link from "next/link";

import Notice from "@/components/Notice";
import { resolvePlanOffers } from "@/lib/couponCampaigns";
import { db } from "@/lib/database";
import {
  cloneDefaultListingPlans,
  isListingPlanReadyForPublic,
  normalizeListingPlans,
  type ListingPlan
} from "@/lib/listingPlans";

type Props = {
  className?: string;
  showTitle?: boolean;
};

async function loadPlans() {
  try {
    const settings = await db.settings.get();
    return {
      plans: Array.isArray(settings?.listingPlans)
        ? normalizeListingPlans(settings.listingPlans)
        : cloneDefaultListingPlans(),
      campaigns: Array.isArray(settings?.couponCampaigns) ? settings.couponCampaigns : []
    };
  } catch (error) {
    console.error("Erro ao carregar planos:", error);
  }

  return {
    plans: cloneDefaultListingPlans(),
    campaigns: []
  };
}

function cardClasses(plan: ListingPlan) {
  return plan.featured
    ? "rounded-2xl border border-brand-200 bg-brand-50 p-6"
    : "rounded-2xl border border-slate-200 bg-white p-6";
}

function badgeClasses(plan: ListingPlan) {
  return plan.featured
    ? "text-sm font-semibold text-brand-700"
    : "text-sm font-semibold text-slate-500";
}

function buttonClasses(plan: ListingPlan) {
  return plan.featured
    ? "mt-4 inline-flex rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800"
    : "mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50";
}

export default async function ListingPlansSection({
  className = "",
  showTitle = true
}: Props) {
  const { plans, campaigns } = await loadPlans();
  const visiblePlans = plans.filter(
    (plan) => plan.active && isListingPlanReadyForPublic(plan)
  );
  const offers = resolvePlanOffers(visiblePlans, campaigns);

  return (
    <section className={className}>
      {showTitle ? (
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Planos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Veja os planos disponiveis para anunciar na plataforma.
            </p>
          </div>
        </div>
      ) : null}

      {offers.length === 0 ? (
        <Notice title="Sem planos" variant="info">
          Nenhum plano ativo foi cadastrado no momento.
        </Notice>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map((offer) => (
            <article key={offer.plan.id} className={cardClasses(offer.plan)}>
              {offer.plan.badge ? <div className={badgeClasses(offer.plan)}>{offer.plan.badge}</div> : null}
              <h3 className="mt-2 text-xl font-bold text-slate-900">{offer.plan.name}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {offer.promotionalPriceLabel ? (
                  <span className="text-lg font-semibold text-slate-400 line-through">
                    {offer.originalPriceLabel}
                  </span>
                ) : null}
                <span className="text-2xl font-bold text-slate-900">
                  {offer.promotionalPriceLabel || offer.originalPriceLabel}
                </span>
              </div>
              {offer.campaign?.badgeText ? (
                <div className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  {offer.campaign.badgeText}
                </div>
              ) : null}
              {offer.plan.durationDays > 0 ? (
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duracao: {offer.plan.durationDays} dias
                </div>
              ) : null}
              <p className="mt-3 text-sm text-slate-700">{offer.plan.description}</p>
              {offer.campaign?.description ? (
                <p className="mt-2 text-xs text-emerald-700">{offer.campaign.description}</p>
              ) : null}
              <Link href={offer.plan.ctaHref} className={buttonClasses(offer.plan)}>
                {offer.plan.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
