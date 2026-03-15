import { onlyDigits, validateBrazilianDocument } from "@/lib/document";
import { getVehicleMaxAllowedYear, normalizeSiteSettings } from "@/lib/siteSettings";

export type ListingDocumentType = "cpf" | "cnpj";

export function getListingDocumentType(document: string): ListingDocumentType | null {
  const digits = onlyDigits(document);
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return null;
}

export function resolveListingLimit(settings: unknown, documentType: ListingDocumentType) {
  const normalized = normalizeSiteSettings(settings);
  return normalized.listingLimits[documentType];
}

export function getListingRules(settings: unknown) {
  const normalized = normalizeSiteSettings(settings);
  return {
    ...normalized,
    maxAllowedYear: getVehicleMaxAllowedYear(normalized)
  };
}

export function validateListingAdvertiserDocument(rawDocument: string) {
  const digits = onlyDigits(rawDocument);
  const documentType = getListingDocumentType(digits);

  return {
    digits,
    documentType,
    isValid: validateBrazilianDocument(digits)
  };
}
