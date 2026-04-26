import type { ListingPlan } from "./listingPlans";

export type UserRole = "admin" | "user";
export type UserAccountType = "individual" | "company" | "agency";
export type UserApprovalStatus = "approved" | "pending";
export type UserVerificationStatus = "unverified" | "verified";
export type ListingVehicleType = "car" | "motorcycle";
export type UserMarketplaceProfile = "mercado-de-pulgas" | "services";

export interface ListingOwnerProfile {
  id: string;
  accountType: UserAccountType;
  displayName: string;
  companyName?: string;
  logoUrl?: string;
  approvalStatus: UserApprovalStatus;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  document?: string; // CPF ou CNPJ
  documentType?: "cpf" | "cnpj";
  phone?: string;
  accountType?: UserAccountType;
  companyName?: string;
  logoUrl?: string;
  approvalStatus?: UserApprovalStatus;
  verificationStatus?: UserVerificationStatus;
  listingLimitOverride?: number | null;
  marketplaceProfile?: UserMarketplaceProfile;
  activityType?: string;
  shortDescription?: string;
  websiteUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRecurrence {
  type: "single" | "weekly" | "monthly" | "monthly_weekday" | "annual" | "specific";
  dayOfWeek?: number; // 0=Sunday..6=Saturday
  dayOfMonth?: number; // 1..31
  weekday?: number; // 0..6 for monthly_weekday
  nth?: number; // 1..5 for monthly_weekday
  month?: number; // 1..12
  day?: number; // 1..31
  generateWeeks?: number;
  generateMonths?: number;
  generateYears?: number;
  dates?: string[]; // ISO dates (start times)
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  city: string;
  state: string;
  location: string;
  contactName: string;
  contactDocument?: string; // legado (nao obrigatorio para eventos)
  contactPhone?: string;
  contactPhoneSecondary?: string;
  contactEmail?: string;
  startAt: string;
  endAt?: string;
  status: "pending" | "approved" | "completed";
  recurrence: EventRecurrence;
  websiteUrl?: string;
  liveUrl?: string;
  organizerLogo?: string;
  coverImage?: string;
  images?: string[];
  featured?: boolean;
  featuredUntil?: string;
  createdBy: string; // User ID
  createdAt: string;
  updatedAt: string;
}

export interface PastEvent {
  id: string;
  eventId?: string; // Referência ao evento original
  slug: string;
  title: string;
  city: string;
  state: string;
  date: string;
  images: string[];
  description?: string;
  attendance?: number;
  videos?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: string; // Gerado automaticamente
  vehicleType?: ListingVehicleType;
  description: string;
  make: string;
  model: string;
  modelYear: number; // Ano do modelo
  manufactureYear: number; // Ano de fabricação
  year: number; // Campo para compatibilidade (alias de modelYear)
  mileage: number;
  price: number;
  images: string[];
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  specifications: {
    singleOwner: boolean;
    blackPlate: boolean;
    showPlate: boolean;
    auctionVehicle: boolean;
    ipvaPaid: boolean;
    vehicleStatus: "paid" | "alienated";
    mediaVideoUrl?: string;
    mediaVideoType?: "youtube" | "upload";
    mediaVideoPosition?: number;
  };
  status: "pending" | "approved" | "active" | "inactive" | "sold" | "rejected";
  featured: boolean;
  featuredUntil?: string;
  createdBy: string; // User ID
  document: string; // CPF ou CNPJ do criador
  city: string;
  state: string;
  ownerProfile?: ListingOwnerProfile;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  listingId: string;
  eventId?: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  image: string;
  link?: string;
  section: string;
  position: number;
  imageScale?: number;
  imagePositionX?: number;
  imagePositionY?: number;
  status: "active" | "inactive";
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organizer {
  id: string;
  name: string;
  logo: string;
  altText?: string;
  bannerTop?: string;
  link?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SitePageContentSettings {
  title?: string;
  subtitle?: string;
  body?: string;
  footerSummary?: string;
}

export interface Settings {
  listings: {
    maxYearOffset: number;
    maxImages: number;
    freeListingsPerCPF: number;
    freeListingsPerCNPJ: number;
    autoInactiveMonths: number;
    highlightOptions: number[];
  };
  events: {
    requireApproval: boolean;
    maxImageSize: string;
    allowedImageTypes: string[];
  };
  banners: {
    sections: string[];
  };
  comments: {
    requireApproval: boolean;
    maxLength: number;
  };
  social?: {
    links: { platform: string; url: string }[];
  };
  listingPlans?: ListingPlan[];
  vehicleMinAgeYears?: number;
  vehicleModelYearMin?: number;
  listingLimits?: {
    cpf: number;
    cnpj: number;
  };
  listingFeaturedDurationsDays?: number[];
  listingAutoExpireDays?: number;
  listingExpireNoticeDays?: number;
  content?: {
    about?: SitePageContentSettings;
    privacy?: SitePageContentSettings;
  };
  branding?: {
    logoUrl?: string;
    faviconUrl?: string;
    youtubeLiveUrl?: string;
  };
  analytics?: {
    googleAnalyticsId?: string;
  };
  publicDisplay?: {
    pageSize?: number;
    homeSectionSize?: number;
  };
  qrAccess?: {
    autoApproveAccounts?: boolean;
  };
  couponCampaigns?: CouponCampaign[];
}

export interface VehicleBrand {
  id: string;
  name: string;
  models: string[];
}

export interface News {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: "eventos" | "classificados" | "geral" | "dicas";
  coverImage: string;
  author: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

export interface CouponCampaign {
  id: string;
  title: string;
  description?: string;
  code?: string;
  targetPlanIds: string[];
  discountType: "percentage" | "fixed" | "free";
  discountValue?: number;
  badgeText?: string;
  active: boolean;
  startAt: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertiserMessage {
  id: string;
  senderUserId?: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  recipientUserId: string;
  listingId?: string;
  subject?: string;
  message: string;
  status: "new" | "read" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface MetricEvent {
  id: string;
  eventType:
    | "page_view"
    | "listing_view"
    | "company_page_view"
    | "banner_click"
    | "contact_click"
    | "message_sent"
    | "search";
  entityType: "page" | "listing" | "company" | "banner" | "search";
  entityId?: string;
  ownerUserId?: string;
  userId?: string;
  path: string;
  label?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorUserId?: string;
  action: string;
  entityType: "auth" | "user" | "listing" | "event" | "message" | "upload" | "settings";
  entityId?: string;
  status: "success" | "failure";
  path?: string;
  metadata?: Record<string, string | number | boolean>;
  createdAt: string;
}
