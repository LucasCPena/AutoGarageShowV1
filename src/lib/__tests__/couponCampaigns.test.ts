import { describe, expect, it } from "vitest";

import { resolvePlanOffer, resolvePriceLabelsFromDiscount } from "@/lib/couponCampaigns";
import type { CouponCampaign } from "@/lib/database";
import type { ListingPlan } from "@/lib/listingPlans";

function createPlan(overrides: Partial<ListingPlan> = {}): ListingPlan {
  return {
    id: "featured-30",
    badge: "Plano destaque",
    name: "Destaque por 30 dias",
    description: "Plano de teste",
    priceLabel: "R$ 100,00",
    discountType: "none",
    discountValue: null,
    durationDays: 30,
    ctaLabel: "Quero destacar",
    ctaHref: "/veiculos/anunciar",
    featured: true,
    active: true,
    ...overrides
  };
}

function createCampaign(overrides: Partial<CouponCampaign> = {}): CouponCampaign {
  return {
    id: "campaign-1",
    title: "Campanha",
    targetPlanIds: ["featured-30"],
    discountType: "percentage",
    discountValue: 25,
    active: true,
    startAt: "2026-01-01T00:00:00.000Z",
    endAt: "2026-12-31T23:59:59.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function normalizeCurrencySpacing(value: string | undefined) {
  return value?.replace(/\u00A0/g, " ");
}

describe("couponCampaigns", () => {
  it("calcula desconto direto do plano", () => {
    const preview = resolvePriceLabelsFromDiscount({
      originalPriceLabel: "R$ 100,00",
      discountType: "percentage",
      discountValue: 50
    });

    expect(preview.originalPriceLabel).toBe("R$ 100,00");
    expect(normalizeCurrencySpacing(preview.promotionalPriceLabel)).toBe("R$ 50,00");
    expect(preview.isFree).toBe(false);
  });

  it("aplica desconto configurado no plano quando nao existe campanha ativa", () => {
    const offer = resolvePlanOffer(
      createPlan({ discountType: "fixed", discountValue: 20 }),
      []
    );

    expect(offer.originalPriceLabel).toBe("R$ 100,00");
    expect(normalizeCurrencySpacing(offer.promotionalPriceLabel)).toBe("R$ 80,00");
  });

  it("prioriza campanha ativa sobre o desconto direto do plano", () => {
    const offer = resolvePlanOffer(
      createPlan({ discountType: "percentage", discountValue: 10 }),
      [createCampaign()],
      new Date("2026-06-01T00:00:00.000Z")
    );

    expect(normalizeCurrencySpacing(offer.promotionalPriceLabel)).toBe("R$ 75,00");
    expect(offer.campaign?.id).toBe("campaign-1");
  });
});
