import { onlyDigits, validateBrazilianDocument } from "@/lib/document";
import { getVehicleMaxAllowedYear, normalizeSiteSettings } from "@/lib/siteSettings";

export type ListingDocumentType = "cpf" | "cnpj";
export const LISTING_DOCUMENT_MAX_LENGTH = 30;

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

export function getAdminListingDocumentFallback(userId: string) {
  const normalizedUserId = String(userId || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const suffixMaxLength = LISTING_DOCUMENT_MAX_LENGTH - "admin-".length;

  return `admin-${normalizedUserId.slice(0, Math.max(suffixMaxLength, 0))}`;
}

export function getListingDocumentForStorage(rawDocument: string, options?: { isAdmin?: boolean; userId?: string }) {
  const trimmed = String(rawDocument || "").trim();
  const digits = onlyDigits(trimmed);

  if (digits && digits.length <= LISTING_DOCUMENT_MAX_LENGTH) {
    return digits;
  }

  if (trimmed && trimmed.length <= LISTING_DOCUMENT_MAX_LENGTH) {
    return trimmed;
  }

  if (options?.isAdmin && options.userId) {
    return getAdminListingDocumentFallback(options.userId);
  }

  return digits || trimmed;
}
