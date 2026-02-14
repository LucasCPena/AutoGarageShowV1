export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
  document?: string; // CPF ou CNPJ
  phone?: string;
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
  contactEmail?: string;
  startAt: string;
  endAt?: string;
  status: "pending" | "approved" | "completed";
  recurrence: EventRecurrence;
  websiteUrl?: string;
  coverImage?: string;
  images?: string[];
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
  };
  status: "pending" | "approved" | "active" | "inactive" | "sold" | "rejected";
  featured: boolean;
  featuredUntil?: string;
  createdBy: string; // User ID
  document: string; // CPF ou CNPJ do criador
  city: string;
  state: string;
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
  status: "active" | "inactive";
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
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
  branding?: {
    logoUrl?: string;
    faviconUrl?: string;
  };
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
