import type { Settings } from "@/lib/database.types";
import { normalizeAssetReference } from "@/lib/site-url";

export type SiteBranding = {
  logoUrl?: string;
  faviconUrl?: string;
};

export const SITE_BRANDING_EVENT = "ags-site-branding-update";

function normalizeAssetUrl(value: unknown) {
  const normalized = normalizeAssetReference(value);
  if (!normalized) return undefined;

  if (normalized.startsWith("/") || /^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return undefined;
}

export function normalizeSiteBranding(input: unknown): SiteBranding {
  if (!input || typeof input !== "object") {
    return {};
  }

  const raw = input as Record<string, unknown>;

  return {
    logoUrl: normalizeAssetUrl(raw.logoUrl),
    faviconUrl: normalizeAssetUrl(raw.faviconUrl)
  };
}

export function getSiteBrandingFromSettings(settings: Settings | null | undefined) {
  return normalizeSiteBranding(settings?.branding);
}
