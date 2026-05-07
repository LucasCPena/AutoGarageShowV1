import { describe, expect, it } from "vitest";

import {
  LISTING_DOCUMENT_MAX_LENGTH,
  getAdminListingDocumentFallback,
  getListingDocumentForStorage,
  resolveEffectiveListingLimit
} from "../listingRules";

describe("listingRules document storage", () => {
  it("keeps CPF/CNPJ digits for storage", () => {
    expect(getListingDocumentForStorage("529.982.247-25")).toBe("52998224725");
    expect(getListingDocumentForStorage("12.345.678/0001-95")).toBe("12345678000195");
  });

  it("generates a short fallback for admin users", () => {
    const value = getAdminListingDocumentFallback("550e8400-e29b-41d4-a716-446655440000");

    expect(value).toBe("admin-550e8400e29b41d4a7164466");
    expect(value.length).toBeLessThanOrEqual(LISTING_DOCUMENT_MAX_LENGTH);
  });

  it("falls back to a short admin document when the provided value is too long", () => {
    const value = getListingDocumentForStorage("9".repeat(40), {
      isAdmin: true,
      userId: "550e8400-e29b-41d4-a716-446655440000"
    });

    expect(value).toBe("admin-550e8400e29b41d4a7164466");
    expect(value.length).toBeLessThanOrEqual(LISTING_DOCUMENT_MAX_LENGTH);
  });
});

describe("listingRules listing limits", () => {
  it("usa limite especial da loja quando configurado", () => {
    const limit = resolveEffectiveListingLimit(
      { listingLimits: { cpf: 1, cnpj: 20 } },
      { listingLimitOverride: 50 },
      "cnpj"
    );

    expect(limit).toBe(50);
  });

  it("mantem limite padrao quando a loja nao tem configuracao especial", () => {
    const limit = resolveEffectiveListingLimit(
      { listingLimits: { cpf: 1, cnpj: 20 } },
      { listingLimitOverride: null },
      "cnpj"
    );

    expect(limit).toBe(20);
  });
});
