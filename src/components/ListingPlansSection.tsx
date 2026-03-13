import Link from "next/link";

import Notice from "@/components/Notice";
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
    if (Array.isArray(settings?.listingPlans)) {
      return normalizeListingPlans(settings.listingPlans);
    }
  } catch (error) {
    console.error("Erro ao carregar planos:", error);
  }

  return cloneDefaultListingPlans();
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
  const plans = (await loadPlans()).filter(
    (plan) => plan.active && isListingPlanReadyForPublic(plan)
  );

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

      {plans.length === 0 ? (
        <Notice title="Sem planos" variant="info">
          Nenhum plano ativo foi cadastrado no momento.
        </Notice>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.id} className={cardClasses(plan)}>
              {plan.badge ? <div className={badgeClasses(plan)}>{plan.badge}</div> : null}
              <h3 className="mt-2 text-xl font-bold text-slate-900">{plan.name}</h3>
              <div className="mt-3 text-2xl font-bold text-slate-900">{plan.priceLabel}</div>
              {plan.durationDays > 0 ? (
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duracao: {plan.durationDays} dias
                </div>
              ) : null}
              <p className="mt-3 text-sm text-slate-700">{plan.description}</p>
              <Link href={plan.ctaHref} className={buttonClasses(plan)}>
                {plan.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
