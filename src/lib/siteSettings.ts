import { normalizeCouponCampaigns } from "@/lib/couponCampaigns";

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
  publicDisplay: {
    pageSize: number;
    homeSectionSize: number;
  };
  analytics: {
    googleAnalyticsId: string;
  };
  qrAccess: {
    autoApproveAccounts: boolean;
  };
  couponCampaigns: ReturnType<typeof normalizeCouponCampaigns>;
};

export const defaultSiteSettings: SiteSettings = {
  vehicleMinAgeYears: 20,
  vehicleModelYearMin: 1908,
  listingLimits: {
    cpf: 1,
    cnpj: 20
  },
  listingFeaturedDurationsDays: [30],
  listingAutoExpireDays: 120,
  listingExpireNoticeDays: 7,
  publicDisplay: {
    pageSize: 30,
    homeSectionSize: 30
  },
  analytics: {
    googleAnalyticsId: ""
  },
  qrAccess: {
    autoApproveAccounts: false
  },
  couponCampaigns: []
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
    listingFeaturedDurationsDays: [...defaultSiteSettings.listingFeaturedDurationsDays],
    publicDisplay: { ...defaultSiteSettings.publicDisplay },
    analytics: { ...defaultSiteSettings.analytics },
    qrAccess: { ...defaultSiteSettings.qrAccess },
    couponCampaigns: [...defaultSiteSettings.couponCampaigns]
  };

  if (!input || typeof input !== "object") {
    return normalized;
  }

  const obj = input as Record<string, unknown>;
  const listings =
    obj.listings && typeof obj.listings === "object"
      ? (obj.listings as Record<string, unknown>)
      : null;
  const modernLimits =
    obj.listingLimits && typeof obj.listingLimits === "object"
      ? (obj.listingLimits as Record<string, unknown>)
      : null;

  const vehicleMinAgeYears =
    typeof obj.vehicleMinAgeYears === "number"
      ? obj.vehicleMinAgeYears
      : typeof listings?.maxYearOffset === "number"
        ? listings.maxYearOffset
        : undefined;
  if (typeof vehicleMinAgeYears === "number") {
    normalized.vehicleMinAgeYears = clampInt(vehicleMinAgeYears, 0, 80);
  }

  if (typeof obj.vehicleModelYearMin === "number") {
    normalized.vehicleModelYearMin = clampInt(obj.vehicleModelYearMin, 1908, currentYear);
  }

  const cpfLimit =
    typeof modernLimits?.cpf === "number"
      ? modernLimits.cpf
      : typeof listings?.freeListingsPerCPF === "number"
        ? listings.freeListingsPerCPF
        : undefined;
  if (typeof cpfLimit === "number") {
    normalized.listingLimits.cpf = clampInt(cpfLimit, 0, 999);
  }

  const cnpjLimit =
    typeof modernLimits?.cnpj === "number"
      ? modernLimits.cnpj
      : typeof listings?.freeListingsPerCNPJ === "number"
        ? listings.freeListingsPerCNPJ
        : undefined;
  if (typeof cnpjLimit === "number") {
    normalized.listingLimits.cnpj = clampInt(cnpjLimit, 0, 999);
  }

  const featuredDurations =
    normalizeNumberArray(obj.listingFeaturedDurationsDays) ??
    normalizeNumberArray(listings?.highlightOptions) ??
    [30];
  normalized.listingFeaturedDurationsDays =
    featuredDurations.length > 0 ? featuredDurations : [30];

  const listingAutoExpireDays =
    typeof obj.listingAutoExpireDays === "number"
      ? obj.listingAutoExpireDays
      : typeof listings?.autoInactiveMonths === "number"
        ? Math.max(0, Math.round(listings.autoInactiveMonths * 30))
        : undefined;
  if (typeof listingAutoExpireDays === "number") {
    normalized.listingAutoExpireDays = clampInt(listingAutoExpireDays, 0, 3650);
  }

  if (typeof obj.listingExpireNoticeDays === "number") {
    normalized.listingExpireNoticeDays = clampInt(obj.listingExpireNoticeDays, 0, 365);
  }

  const publicDisplay =
    obj.publicDisplay && typeof obj.publicDisplay === "object"
      ? (obj.publicDisplay as Record<string, unknown>)
      : null;
  if (typeof publicDisplay?.pageSize === "number") {
    normalized.publicDisplay.pageSize = clampInt(publicDisplay.pageSize, 1, 100);
  }
  if (typeof publicDisplay?.homeSectionSize === "number") {
    normalized.publicDisplay.homeSectionSize = clampInt(publicDisplay.homeSectionSize, 1, 100);
  }

  const analytics =
    obj.analytics && typeof obj.analytics === "object"
      ? (obj.analytics as Record<string, unknown>)
      : null;
  if (typeof analytics?.googleAnalyticsId === "string") {
    normalized.analytics.googleAnalyticsId = analytics.googleAnalyticsId.trim();
  }

  const qrAccess =
    obj.qrAccess && typeof obj.qrAccess === "object"
      ? (obj.qrAccess as Record<string, unknown>)
      : null;
  if (typeof qrAccess?.autoApproveAccounts === "boolean") {
    normalized.qrAccess.autoApproveAccounts = qrAccess.autoApproveAccounts;
  }

  normalized.couponCampaigns = normalizeCouponCampaigns(obj.couponCampaigns);

  return normalized;
}

export function getVehicleMaxAllowedYear(settings: SiteSettings, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  return year - settings.vehicleMinAgeYears;
}

export function buildSiteSettingsUpdate(settings: SiteSettings) {
  const normalized = normalizeSiteSettings(settings);

  return {
    vehicleMinAgeYears: normalized.vehicleMinAgeYears,
    vehicleModelYearMin: normalized.vehicleModelYearMin,
    listingLimits: {
      ...normalized.listingLimits
    },
    listingFeaturedDurationsDays: [...normalized.listingFeaturedDurationsDays],
    listingAutoExpireDays: normalized.listingAutoExpireDays,
    listingExpireNoticeDays: normalized.listingExpireNoticeDays,
    publicDisplay: {
      ...normalized.publicDisplay
    },
    analytics: {
      ...normalized.analytics
    },
    qrAccess: {
      ...normalized.qrAccess
    },
    couponCampaigns: [...normalized.couponCampaigns],
    listings: {
      maxYearOffset: normalized.vehicleMinAgeYears,
      freeListingsPerCPF: normalized.listingLimits.cpf,
      freeListingsPerCNPJ: normalized.listingLimits.cnpj,
      autoInactiveMonths:
        normalized.listingAutoExpireDays > 0
          ? Math.ceil(normalized.listingAutoExpireDays / 30)
          : 0,
      highlightOptions: [...normalized.listingFeaturedDurationsDays]
    }
  };
}
