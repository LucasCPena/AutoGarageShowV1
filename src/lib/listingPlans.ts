export type ListingPlan = {
  id: string;
  badge: string;
  name: string;
  description: string;
  priceLabel: string;
  durationDays: number;
  ctaLabel: string;
  ctaHref: string;
  featured: boolean;
  active: boolean;
};

const DEFAULT_LISTING_PLANS: ListingPlan[] = [
  {
    id: "free",
    badge: "Plano gratuito",
    name: "Publicacao padrao",
    description: "Anuncio em ordem cronologica, sujeito a aprovacao.",
    priceLabel: "Gratis",
    durationDays: 0,
    ctaLabel: "Publicar gratis",
    ctaHref: "/classificados/anunciar",
    featured: false,
    active: true
  },
  {
    id: "featured-30",
    badge: "Plano destaque",
    name: "Destaque por 30 dias",
    description: "Seu anuncio vai para a vitrine de destaques por um periodo fixo de 30 dias.",
    priceLabel: "Sob consulta",
    durationDays: 30,
    ctaLabel: "Quero destacar",
    ctaHref: "/classificados/anunciar",
    featured: true,
    active: true
  }
];

function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePositiveInt(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
}

export function cloneDefaultListingPlans() {
  return DEFAULT_LISTING_PLANS.map((plan) => ({ ...plan }));
}

export function normalizeListingPlans(input: unknown) {
  if (!Array.isArray(input)) {
    return cloneDefaultListingPlans();
  }

  return input
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;

      const item = raw as Record<string, unknown>;
      const name = normalizeText(item.name);
      const description = normalizeText(item.description);
      const badge = normalizeText(item.badge);
      const priceLabel = normalizeText(item.priceLabel);
      const ctaLabel = normalizeText(item.ctaLabel, "Saiba mais");
      const ctaHref = normalizeText(item.ctaHref, "/classificados/anunciar");

      if (!name || !description || !priceLabel) return null;

      return {
        id: normalizeText(item.id, `plan-${index + 1}`),
        badge,
        name,
        description,
        priceLabel,
        durationDays: normalizePositiveInt(item.durationDays, 0),
        ctaLabel,
        ctaHref,
        featured: normalizeBoolean(item.featured, false),
        active: normalizeBoolean(item.active, true)
      } as ListingPlan;
    })
    .filter((plan): plan is ListingPlan => Boolean(plan));
}
