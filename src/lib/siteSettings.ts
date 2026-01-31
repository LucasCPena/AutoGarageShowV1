export type SiteSettings = {
  vehicleMinAgeYears: number;
  vehicleModelYearMin: number;
  listingLimits: {
    cpf: number;
    cnpj: number;
  };
  listingFeaturedDurationsDays: number[];
  listingAutoExpireDays: number;
  listingExpireNoticeDays: number;
};

export const defaultSiteSettings: SiteSettings = {
  vehicleMinAgeYears: 10,
  vehicleModelYearMin: 1908,
  listingLimits: {
    cpf: 4,
    cnpj: 20
  },
  listingFeaturedDurationsDays: [7, 14, 21, 30],
  listingAutoExpireDays: 120,
  listingExpireNoticeDays: 7
};

function clampInt(value: number, min: number, max: number) {
  const safe = Number.isFinite(value) ? Math.round(value) : min;
  return Math.min(max, Math.max(min, safe));
}

function normalizeNumberArray(input: unknown) {
  if (!Array.isArray(input)) return null;

  const values = input
    .filter((v) => typeof v === "number" && Number.isFinite(v))
    .map((v) => Math.round(v))
    .filter((v) => v > 0);

  if (values.length === 0) return [];

  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function normalizeSiteSettings(input: unknown): SiteSettings {
  const currentYear = new Date().getFullYear();

  const normalized: SiteSettings = {
    ...defaultSiteSettings,
    listingLimits: { ...defaultSiteSettings.listingLimits },
    listingFeaturedDurationsDays: [...defaultSiteSettings.listingFeaturedDurationsDays]
  };

  if (!input || typeof input !== "object") {
    return normalized;
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.vehicleMinAgeYears === "number") {
    normalized.vehicleMinAgeYears = clampInt(obj.vehicleMinAgeYears, 0, 80);
  }

  if (typeof obj.vehicleModelYearMin === "number") {
    normalized.vehicleModelYearMin = clampInt(obj.vehicleModelYearMin, 1908, currentYear);
  }

  if (obj.listingLimits && typeof obj.listingLimits === "object") {
    const limits = obj.listingLimits as Record<string, unknown>;

    if (typeof limits.cpf === "number") {
      normalized.listingLimits.cpf = clampInt(limits.cpf, 0, 999);
    }

    if (typeof limits.cnpj === "number") {
      normalized.listingLimits.cnpj = clampInt(limits.cnpj, 0, 999);
    }
  }

  const durations = normalizeNumberArray(obj.listingFeaturedDurationsDays);
  if (durations) {
    normalized.listingFeaturedDurationsDays = durations.length
      ? durations
      : [...defaultSiteSettings.listingFeaturedDurationsDays];
  }

  if (typeof obj.listingAutoExpireDays === "number") {
    normalized.listingAutoExpireDays = clampInt(obj.listingAutoExpireDays, 0, 3650);
  }

  if (typeof obj.listingExpireNoticeDays === "number") {
    normalized.listingExpireNoticeDays = clampInt(obj.listingExpireNoticeDays, 0, 365);
  }

  return normalized;
}

export function getVehicleMaxAllowedYear(settings: SiteSettings, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  return year - settings.vehicleMinAgeYears;
}
