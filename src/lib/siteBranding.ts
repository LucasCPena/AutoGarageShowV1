import type { Settings } from "@/lib/database.types";

export type SiteBranding = {
  logoUrl?: string;
  faviconUrl?: string;
};

export const SITE_BRANDING_EVENT = "ags-site-branding-update";

function normalizeAssetUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (
    trimmed.startsWith("/") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
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

