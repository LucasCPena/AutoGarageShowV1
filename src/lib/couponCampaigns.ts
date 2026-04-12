import type { CouponCampaign } from "@/lib/database";
import type { ListingPlan } from "@/lib/listingPlans";

type ResolvedPlanOffer = {
  plan: ListingPlan;
  campaign?: CouponCampaign;
  originalPriceLabel: string;
  promotionalPriceLabel?: string;
  isFree: boolean;
};

function normalizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePositiveNumber(value: unknown, fallback = 0) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function normalizeDiscountValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function normalizeCouponCampaigns(input: unknown) {
  if (!Array.isArray(input)) return [] as CouponCampaign[];

  return input
    .map((raw, index) => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as Record<string, unknown>;
      const now = new Date().toISOString();

      const normalized: CouponCampaign = {
        id: normalizeText(item.id, `coupon-${index + 1}`),
        title: normalizeText(item.title, "Campanha promocional"),
        description: normalizeText(item.description) || undefined,
        code: normalizeText(item.code) || undefined,
        targetPlanIds: Array.isArray(item.targetPlanIds)
          ? item.targetPlanIds
              .filter((value): value is string => typeof value === "string")
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        discountType:
          item.discountType === "percentage" ||
          item.discountType === "fixed" ||
          item.discountType === "free"
            ? item.discountType
            : "free",
        discountValue: normalizePositiveNumber(item.discountValue, 0),
        badgeText: normalizeText(item.badgeText) || undefined,
        active: normalizeBoolean(item.active, true),
        startAt: normalizeText(item.startAt, now),
        endAt: normalizeText(item.endAt) || undefined,
        createdAt: normalizeText(item.createdAt, now),
        updatedAt: normalizeText(item.updatedAt, now)
      };

      return normalized;
    })
    .filter((campaign): campaign is CouponCampaign => campaign !== null);
}

export function isCouponCampaignActive(campaign: CouponCampaign, referenceDate = new Date()) {
  if (!campaign.active) return false;

  const now = referenceDate.getTime();
  const start = new Date(campaign.startAt).getTime();
  if (Number.isFinite(start) && now < start) return false;

  const end = campaign.endAt ? new Date(campaign.endAt).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isFinite(end) && now > end) return false;

  return true;
}

export function parsePriceLabel(priceLabel: string) {
  const normalized = priceLabel.replace(/[^\d,.-]/g, "").trim();
  if (!normalized) return null;
  const digits = normalized.replace(/\./g, "").replace(",", ".");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatPriceLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function resolvePriceLabelsFromDiscount(options: {
  originalPriceLabel: string;
  discountType?: ListingPlan["discountType"];
  discountValue?: number | null;
}) {
  const originalPriceLabel = options.originalPriceLabel.trim();
  const discountType = options.discountType ?? "none";
  const discountValue = normalizeDiscountValue(options.discountValue);

  if (!originalPriceLabel) {
    return {
      originalPriceLabel,
      promotionalPriceLabel: undefined,
      isFree: false
    };
  }

  if (discountType === "none") {
    return {
      originalPriceLabel,
      promotionalPriceLabel: undefined,
      isFree: originalPriceLabel.toLowerCase() === "gratis"
    };
  }

  if (discountType === "free") {
    return {
      originalPriceLabel,
      promotionalPriceLabel: "Gratis",
      isFree: true
    };
  }

  const baseValue = parsePriceLabel(originalPriceLabel);
  if (baseValue === null) {
    return {
      originalPriceLabel,
      promotionalPriceLabel: undefined,
      isFree: false
    };
  }

  const discounted =
    discountType === "fixed"
      ? Math.max(0, baseValue - discountValue)
      : Math.max(0, baseValue * (1 - discountValue / 100));

  return {
    originalPriceLabel,
    promotionalPriceLabel: discounted <= 0 ? "Gratis" : formatPriceLabel(discounted),
    isFree: discounted <= 0
  };
}

function getBestCampaign(plan: ListingPlan, campaigns: CouponCampaign[], referenceDate = new Date()) {
  return campaigns.find(
    (campaign) =>
      isCouponCampaignActive(campaign, referenceDate) &&
      campaign.targetPlanIds.includes(plan.id)
  );
}

export function resolvePlanOffer(
  plan: ListingPlan,
  campaigns: CouponCampaign[],
  referenceDate = new Date()
): ResolvedPlanOffer {
  const planOffer = resolvePriceLabelsFromDiscount({
    originalPriceLabel: plan.priceLabel,
    discountType: plan.discountType,
    discountValue: plan.discountValue
  });
  const campaign = getBestCampaign(plan, campaigns, referenceDate);

  if (!campaign) {
    return {
      plan,
      originalPriceLabel: planOffer.originalPriceLabel,
      promotionalPriceLabel: planOffer.promotionalPriceLabel,
      isFree: planOffer.isFree
    };
  }

  if (campaign.discountType === "free") {
    return {
      plan,
      campaign,
      originalPriceLabel: planOffer.originalPriceLabel,
      promotionalPriceLabel: "Gratis",
      isFree: true
    };
  }

  const baseValue = parsePriceLabel(planOffer.originalPriceLabel);
  if (baseValue === null) {
    return {
      plan,
      campaign,
      originalPriceLabel: planOffer.originalPriceLabel,
      promotionalPriceLabel: undefined,
      isFree: false
    };
  }

  const discounted =
    campaign.discountType === "fixed"
      ? Math.max(0, baseValue - (campaign.discountValue ?? 0))
      : Math.max(0, baseValue * (1 - (campaign.discountValue ?? 0) / 100));

  return {
    plan,
    campaign,
    originalPriceLabel: planOffer.originalPriceLabel,
    promotionalPriceLabel: discounted <= 0 ? "Gratis" : formatPriceLabel(discounted),
    isFree: discounted <= 0
  };
}

export function resolvePlanOffers(
  plans: ListingPlan[],
  campaigns: CouponCampaign[],
  referenceDate = new Date()
) {
  return plans.map((plan) => resolvePlanOffer(plan, campaigns, referenceDate));
}
