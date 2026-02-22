import mysql from "mysql2/promise";

import type {
  Banner,
  Comment,
  Event,
  Listing,
  News,
  PastEvent,
  Settings,
  User,
  VehicleBrand
} from "./database.types";
import { toPublicAssetUrl, toPublicAssetUrls } from "./site-url";
import { loadRuntimeEnvFiles } from "./runtime-env";

type Row = Record<string, any>;

let pool: mysql.Pool | null = null;

function getPool() {
  loadRuntimeEnvFiles();

  if (pool) return pool;

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = Number(process.env.MYSQL_PORT || 3306);
  const connectTimeoutMsRaw = Number(process.env.MYSQL_CONNECT_TIMEOUT_MS || 8000);
  const connectTimeoutMs =
    Number.isFinite(connectTimeoutMsRaw) && connectTimeoutMsRaw > 0
      ? connectTimeoutMsRaw
      : 8000;
  const normalizedHost =
    host === "localhost" && process.env.MYSQL_FORCE_IPV4 === "true"
      ? "127.0.0.1"
      : host;

  const hasDirectConfig = Boolean(host && user && database);

  if (hasDirectConfig) {
    pool = mysql.createPool({
      host: normalizedHost,
      user,
      password,
      database,
      port,
      connectTimeout: connectTimeoutMs,
      waitForConnections: true,
      connectionLimit: 10
    });
    return pool;
  }

  const url = process.env.MYSQL_URL;
  if (url) {
    pool = mysql.createPool({
      uri: url,
      connectTimeout: connectTimeoutMs,
      waitForConnections: true,
      connectionLimit: 10
    });
    return pool;
  }

  throw new Error("MySQL não configurado. Defina MYSQL_HOST, MYSQL_USER e MYSQL_DATABASE.");
}

async function query<T = Row>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

async function queryOne<T = Row>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

const tableColumnsCache = new Map<string, Set<string> | null>();

async function getTableColumnsSafe(table: string): Promise<Set<string> | null> {
  if (tableColumnsCache.has(table)) {
    return tableColumnsCache.get(table) ?? null;
  }

  try {
    const rows = await query<Row>(`SHOW COLUMNS FROM \`${table}\``);
    const columns = new Set(
      rows
        .map((row) => String(row.Field || row.COLUMN_NAME || "").toLowerCase())
        .filter(Boolean)
    );
    tableColumnsCache.set(table, columns);
    return columns;
  } catch (error) {
    console.warn(`[db] Falha ao mapear colunas da tabela ${table}:`, error);
    tableColumnsCache.set(table, null);
    return null;
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function mapUser(row: Row): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    document: row.document ?? undefined,
    phone: row.phone ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEvent(row: Row): Event {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    city: row.city,
    state: row.state,
    location: row.location,
    contactName: row.contact_name,
    contactDocument: row.contact_document ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    contactPhoneSecondary: row.contact_phone_secondary ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at ?? undefined,
    status: row.status,
    recurrence: parseJson(row.recurrence, { type: "single" }),
    websiteUrl: row.website_url ?? undefined,
    liveUrl: row.live_url ?? undefined,
    organizerLogo: toPublicAssetUrl(row.organizer_logo, { uploadType: "event" }) || row.organizer_logo,
    coverImage: toPublicAssetUrl(row.cover_image, { uploadType: "event" }),
    images: toPublicAssetUrls(parseJson(row.images, []), { uploadType: "event" }),
    featured: Boolean(row.featured),
    featuredUntil: row.featured_until ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPastEvent(row: Row): PastEvent {
  return {
    id: row.id,
    eventId: row.event_id ?? undefined,
    slug: row.slug,
    title: row.title,
    city: row.city,
    state: row.state,
    date: row.date,
    images: toPublicAssetUrls(parseJson(row.images, []), { uploadType: "event" }),
    description: row.description ?? undefined,
    attendance: row.attendance ?? undefined,
    videos: parseJson(row.videos, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapListing(row: Row): Listing {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    make: row.make,
    model: row.model,
    modelYear: Number(row.model_year),
    manufactureYear: Number(row.manufacture_year),
    year: Number(row.year ?? row.model_year),
    mileage: Number(row.mileage),
    price: Number(row.price),
    images: toPublicAssetUrls(parseJson(row.images, []), { uploadType: "listing" }),
    contact: parseJson(row.contact, { name: "", email: "", phone: "" }),
    specifications: parseJson(row.specifications, {
      singleOwner: false,
      blackPlate: false,
      showPlate: true,
      auctionVehicle: false,
      ipvaPaid: false,
      vehicleStatus: "paid"
    }),
    status: row.status,
    featured: Boolean(row.featured),
    featuredUntil: row.featured_until ?? undefined,
    createdBy: row.created_by,
    document: row.document,
    city: row.city,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapComment(row: Row): Comment {
  return {
    id: row.id,
    listingId: row.listing_id,
    eventId: row.event_id ?? undefined,
    name: row.name,
    email: row.email,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBanner(row: Row): Banner {
  return {
    id: row.id,
    title: row.title,
    image: toPublicAssetUrl(row.image, { uploadType: "banner" }) || row.image,
    link: row.link ?? undefined,
    section: row.section,
    position: Number(row.position),
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapNews(row: Row): News {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    category: row.category,
    coverImage: toPublicAssetUrl(row.cover_image, { uploadType: "news" }) || row.cover_image,
    author: row.author,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapBrand(row: Row): VehicleBrand {
  return {
    id: row.id,
    name: row.name,
    models: parseJson(row.models, [])
  };
}

export const dbMysql = {
  users: {
    getAll: async () => (await query("SELECT * FROM users")).map(mapUser),
    findById: async (id: string) => {
      const row = await queryOne("SELECT * FROM users WHERE id = ?", [id]);
      return row ? mapUser(row) : null;
    },
    findByEmail: async (email: string) => {
      const row = await queryOne("SELECT * FROM users WHERE email = ?", [email]);
      return row ? mapUser(row) : null;
    },
    findByDocument: async (document: string) => {
      const row = await queryOne("SELECT * FROM users WHERE document = ?", [document]);
      return row ? mapUser(row) : null;
    },
    create: async (user: Omit<User, "id" | "createdAt" | "updatedAt">) => {
      const now = nowIso();
      const newUser: User = {
        ...user,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      await query(
        "INSERT INTO users (id, name, email, password, role, document, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          newUser.id,
          newUser.name,
          newUser.email,
          newUser.password,
          newUser.role,
          newUser.document ?? null,
          newUser.phone ?? null,
          newUser.createdAt,
          newUser.updatedAt
        ]
      );
      return newUser;
    },
    update: async (id: string, updates: Partial<User>) => {
      const current = await dbMysql.users.findById(id);
      if (!current) return null;
      const next: User = {
        ...current,
        ...updates,
        updatedAt: nowIso()
      };
      await query(
        "UPDATE users SET name=?, email=?, password=?, role=?, document=?, phone=?, updated_at=? WHERE id=?",
        [
          next.name,
          next.email,
          next.password,
          next.role,
          next.document ?? null,
          next.phone ?? null,
          next.updatedAt,
          id
        ]
      );
      return next;
    }
  },
  events: {
    getAll: async () => (await query("SELECT * FROM events")).map(mapEvent),
    findById: async (id: string) => {
      const row = await queryOne("SELECT * FROM events WHERE id = ?", [id]);
      return row ? mapEvent(row) : null;
    },
    findBySlug: async (slug: string) => {
      const row = await queryOne("SELECT * FROM events WHERE slug = ?", [slug]);
      return row ? mapEvent(row) : null;
    },
    create: async (event: Omit<Event, "id" | "createdAt" | "updatedAt">) => {
      const now = nowIso();
      const newEvent: Event = {
        ...event,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };

      const columns = await getTableColumnsSafe("events");

      if (columns) {
        const insertColumns: string[] = [];
        const values: unknown[] = [];
        const add = (column: string, value: unknown) => {
          if (!columns.has(column)) return;
          insertColumns.push(column);
          values.push(value);
        };

        add("id", newEvent.id);
        add("slug", newEvent.slug);
        add("title", newEvent.title);
        add("description", newEvent.description);
        add("city", newEvent.city);
        add("state", newEvent.state);
        add("location", newEvent.location);
        add("contact_name", newEvent.contactName);
        add("contact_document", newEvent.contactDocument ?? "nao informado");
        add("contact_phone", newEvent.contactPhone ?? null);
        add("contact_phone_secondary", newEvent.contactPhoneSecondary ?? null);
        add("contact_email", newEvent.contactEmail ?? null);
        add("start_at", newEvent.startAt);
        add("end_at", newEvent.endAt ?? null);
        add("status", newEvent.status);
        add("recurrence", JSON.stringify(newEvent.recurrence ?? { type: "single" }));
        add("website_url", newEvent.websiteUrl ?? null);
        add("live_url", newEvent.liveUrl ?? null);
        add("organizer_logo", newEvent.organizerLogo ?? null);
        add("cover_image", newEvent.coverImage ?? null);
        add("images", JSON.stringify(newEvent.images ?? []));
        add("featured", newEvent.featured ? 1 : 0);
        add("featured_until", newEvent.featuredUntil ?? null);
        add("created_by", newEvent.createdBy);
        add("created_at", newEvent.createdAt);
        add("updated_at", newEvent.updatedAt);

        if (insertColumns.length === 0) {
          throw new Error("Tabela events sem colunas mapeadas para insercao.");
        }

        const placeholders = insertColumns.map(() => "?").join(", ");
        const sql = `INSERT INTO events (${insertColumns.map((column) => `\`${column}\``).join(", ")}) VALUES (${placeholders})`;
        await query(sql, values as any[]);
        return newEvent;
      }

      await query(
        `INSERT INTO events (id, slug, title, description, city, state, location, contact_name, contact_document, contact_phone, contact_phone_secondary, contact_email, start_at, end_at, status, recurrence, website_url, live_url, cover_image, images, featured, featured_until, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newEvent.id,
          newEvent.slug,
          newEvent.title,
          newEvent.description,
          newEvent.city,
          newEvent.state,
          newEvent.location,
          newEvent.contactName,
          newEvent.contactDocument ?? "",
          newEvent.contactPhone ?? null,
          newEvent.contactPhoneSecondary ?? null,
          newEvent.contactEmail ?? null,
          newEvent.startAt,
          newEvent.endAt ?? null,
          newEvent.status,
          JSON.stringify(newEvent.recurrence),
          newEvent.websiteUrl ?? null,
          newEvent.liveUrl ?? null,
          newEvent.coverImage ?? null,
          JSON.stringify(newEvent.images ?? []),
          newEvent.featured ? 1 : 0,
          newEvent.featuredUntil ?? null,
          newEvent.createdBy,
          newEvent.createdAt,
          newEvent.updatedAt
        ]
      );
      return newEvent;
    },
    update: async (id: string, updates: Partial<Event>) => {
      const current = await dbMysql.events.findById(id);
      if (!current) return null;
      const next: Event = {
        ...current,
        ...updates,
        updatedAt: nowIso()
      };
      const columns = await getTableColumnsSafe("events");

      if (columns) {
        const assignments: string[] = [];
        const values: unknown[] = [];
        const set = (column: string, value: unknown) => {
          if (!columns.has(column)) return;
          assignments.push(`\`${column}\` = ?`);
          values.push(value);
        };

        set("slug", next.slug);
        set("title", next.title);
        set("description", next.description);
        set("city", next.city);
        set("state", next.state);
        set("location", next.location);
        set("contact_name", next.contactName);
        set("contact_document", next.contactDocument ?? "nao informado");
        set("contact_phone", next.contactPhone ?? null);
        set("contact_phone_secondary", next.contactPhoneSecondary ?? null);
        set("contact_email", next.contactEmail ?? null);
        set("start_at", next.startAt);
        set("end_at", next.endAt ?? null);
        set("status", next.status);
        set("recurrence", JSON.stringify(next.recurrence ?? { type: "single" }));
        set("website_url", next.websiteUrl ?? null);
        set("live_url", next.liveUrl ?? null);
        set("organizer_logo", next.organizerLogo ?? null);
        set("cover_image", next.coverImage ?? null);
        set("images", JSON.stringify(next.images ?? []));
        set("featured", next.featured ? 1 : 0);
        set("featured_until", next.featuredUntil ?? null);
        set("created_by", next.createdBy);
        set("updated_at", next.updatedAt);

        if (assignments.length > 0) {
          values.push(id);
          const sql = `UPDATE events SET ${assignments.join(", ")} WHERE id = ?`;
          await query(sql, values as any[]);
        }

        return next;
      }

      await query(
        `UPDATE events SET slug=?, title=?, description=?, city=?, state=?, location=?, contact_name=?, contact_document=?, contact_phone=?, contact_phone_secondary=?, contact_email=?, start_at=?, end_at=?, status=?, recurrence=?, website_url=?, live_url=?, cover_image=?, images=?, featured=?, featured_until=?, created_by=?, updated_at=? WHERE id=?`,
        [
          next.slug,
          next.title,
          next.description,
          next.city,
          next.state,
          next.location,
          next.contactName,
          next.contactDocument ?? "",
          next.contactPhone ?? null,
          next.contactPhoneSecondary ?? null,
          next.contactEmail ?? null,
          next.startAt,
          next.endAt ?? null,
          next.status,
          JSON.stringify(next.recurrence),
          next.websiteUrl ?? null,
          next.liveUrl ?? null,
          next.coverImage ?? null,
          JSON.stringify(next.images ?? []),
          next.featured ? 1 : 0,
          next.featuredUntil ?? null,
          next.createdBy,
          next.updatedAt,
          id
        ]
      );
      return next;
    },
    delete: async (id: string) => {
      await query("DELETE FROM events WHERE id = ?", [id]);
      return true;
    }
  },
  pastEvents: {
    getAll: async () => (await query("SELECT * FROM past_events")).map(mapPastEvent),
    findById: async (id: string) => {
      const row = await queryOne("SELECT * FROM past_events WHERE id = ?", [id]);
      return row ? mapPastEvent(row) : null;
    },
    findBySlug: async (slug: string) => {
      const row = await queryOne("SELECT * FROM past_events WHERE slug = ?", [slug]);
      return row ? mapPastEvent(row) : null;
    },
    findByEventId: async (eventId: string) => {
      const row = await queryOne(
        "SELECT * FROM past_events WHERE event_id = ? ORDER BY created_at DESC LIMIT 1",
        [eventId]
      );
      return row ? mapPastEvent(row) : null;
    },
    create: async (pastEvent: Omit<PastEvent, "id" | "createdAt">) => {
      const now = nowIso();
      const newPast: PastEvent = {
        ...pastEvent,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: pastEvent.updatedAt ?? now
      };
      await query(
        `INSERT INTO past_events (id, event_id, slug, title, city, state, date, images, description, attendance, videos, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newPast.id,
          newPast.eventId ?? null,
          newPast.slug,
          newPast.title,
          newPast.city,
          newPast.state,
          newPast.date,
          JSON.stringify(newPast.images ?? []),
          newPast.description ?? null,
          newPast.attendance ?? null,
          JSON.stringify(newPast.videos ?? []),
          newPast.createdAt,
          newPast.updatedAt
        ]
      );
      return newPast;
    },
    update: async (id: string, updates: Partial<PastEvent>) => {
      const current = await dbMysql.pastEvents.findById(id);
      if (!current) return null;
      const next: PastEvent = {
        ...current,
        ...updates,
        updatedAt: nowIso()
      };
      await query(
        `UPDATE past_events SET event_id=?, slug=?, title=?, city=?, state=?, date=?, images=?, description=?, attendance=?, videos=?, updated_at=? WHERE id=?`,
        [
          next.eventId ?? null,
          next.slug,
          next.title,
          next.city,
          next.state,
          next.date,
          JSON.stringify(next.images ?? []),
          next.description ?? null,
          next.attendance ?? null,
          JSON.stringify(next.videos ?? []),
          next.updatedAt,
          id
        ]
      );
      return next;
    }
  },
  listings: {
    getAll: async () => (await query("SELECT * FROM listings")).map(mapListing),
    findById: async (id: string) => {
      const row = await queryOne("SELECT * FROM listings WHERE id = ?", [id]);
      return row ? mapListing(row) : null;
    },
    findBySlug: async (slug: string) => {
      const row = await queryOne("SELECT * FROM listings WHERE slug = ?", [slug]);
      return row ? mapListing(row) : null;
    },
    findByUser: async (userId: string) => {
      const rows = await query("SELECT * FROM listings WHERE created_by = ?", [userId]);
      return rows.map(mapListing);
    },
    findByDocument: async (document: string) => {
      const rows = await query("SELECT * FROM listings WHERE document = ?", [document]);
      return rows.map(mapListing);
    },
    getActiveCount: async (document: string) => {
      const row = await queryOne<{ total: number }>(
        "SELECT COUNT(*) as total FROM listings WHERE document = ? AND status = 'active'",
        [document]
      );
      return Number(row?.total || 0);
    },
    create: async (listing: Omit<Listing, "id" | "createdAt" | "updatedAt">) => {
      const now = nowIso();
      const newListing: Listing = {
        ...listing,
        year: listing.year ?? listing.modelYear,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      await query(
        `INSERT INTO listings (id, slug, title, description, make, model, model_year, manufacture_year, year, mileage, price, images, contact, specifications, status, featured, featured_until, created_by, document, city, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newListing.id,
          newListing.slug,
          newListing.title,
          newListing.description,
          newListing.make,
          newListing.model,
          newListing.modelYear,
          newListing.manufactureYear,
          newListing.year,
          newListing.mileage,
          newListing.price,
          JSON.stringify(newListing.images ?? []),
          JSON.stringify(newListing.contact ?? { name: "", email: "", phone: "" }),
          JSON.stringify(
            newListing.specifications ?? {
              singleOwner: false,
              blackPlate: false,
              showPlate: true,
              auctionVehicle: false,
              ipvaPaid: false,
              vehicleStatus: "paid"
            }
          ),
          newListing.status,
          newListing.featured ? 1 : 0,
          newListing.featuredUntil ?? null,
          newListing.createdBy,
          newListing.document,
          newListing.city,
          newListing.state,
          newListing.createdAt,
          newListing.updatedAt
        ]
      );
      return newListing;
    },
    update: async (id: string, updates: Partial<Listing>) => {
      const current = await dbMysql.listings.findById(id);
      if (!current) return null;
      const next: Listing = {
        ...current,
        ...updates,
        year: updates.year ?? updates.modelYear ?? current.year ?? current.modelYear,
        updatedAt: nowIso()
      };
      await query(
        `UPDATE listings SET slug=?, title=?, description=?, make=?, model=?, model_year=?, manufacture_year=?, year=?, mileage=?, price=?, images=?, contact=?, specifications=?, status=?, featured=?, featured_until=?, created_by=?, document=?, city=?, state=?, updated_at=? WHERE id=?`,
        [
          next.slug,
          next.title,
          next.description,
          next.make,
          next.model,
          next.modelYear,
          next.manufactureYear,
          next.year,
          next.mileage,
          next.price,
          JSON.stringify(next.images ?? []),
          JSON.stringify(next.contact ?? { name: "", email: "", phone: "" }),
          JSON.stringify(next.specifications ?? {
            singleOwner: false,
            blackPlate: false,
            showPlate: true,
            auctionVehicle: false,
            ipvaPaid: false,
            vehicleStatus: "paid"
          }),
          next.status,
          next.featured ? 1 : 0,
          next.featuredUntil ?? null,
          next.createdBy,
          next.document,
          next.city,
          next.state,
          next.updatedAt,
          id
        ]
      );
      return next;
    },
    delete: async (id: string) => {
      await query("DELETE FROM listings WHERE id = ?", [id]);
      return true;
    },
    updateFeaturedStatus: async () => {
      const listings = await dbMysql.listings.getAll();
      const now = Date.now();
      for (const listing of listings) {
        if (listing.featured && listing.featuredUntil) {
          const until = new Date(listing.featuredUntil).getTime();
          if (Number.isFinite(until) && until < now) {
            await dbMysql.listings.update(listing.id, {
              featured: false,
              featuredUntil: undefined
            });
          }
        }
      }
    }
  },
  comments: {
    getAll: async () => (await query("SELECT * FROM comments")).map(mapComment),
    findByListing: async (listingId: string) => {
      const rows = await query(
        "SELECT * FROM comments WHERE listing_id = ? AND status = 'approved'",
        [listingId]
      );
      return rows.map(mapComment);
    },
    findByEvent: async (eventId: string) => {
      const rows = await query(
        "SELECT * FROM comments WHERE event_id = ? AND status = 'approved'",
        [eventId]
      );
      return rows.map(mapComment);
    },
    getPending: async () => {
      const rows = await query("SELECT * FROM comments WHERE status = 'pending'");
      return rows.map(mapComment);
    },
    create: async (comment: Omit<Comment, "id" | "createdAt" | "updatedAt">) => {
      const now = nowIso();
      const newComment: Comment = {
        ...comment,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      await query(
        `INSERT INTO comments (id, listing_id, event_id, name, email, message, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newComment.id,
          newComment.listingId,
          newComment.eventId ?? null,
          newComment.name,
          newComment.email,
          newComment.message,
          newComment.status,
          newComment.createdAt,
          newComment.updatedAt
        ]
      );
      return newComment;
    },
    update: async (id: string, updates: Partial<Comment>) => {
      const current = await queryOne("SELECT * FROM comments WHERE id = ?", [id]);
      if (!current) return null;
      const mapped = mapComment(current);
      const next: Comment = {
        ...mapped,
        ...updates,
        updatedAt: nowIso()
      };
      await query(
        `UPDATE comments SET listing_id=?, event_id=?, name=?, email=?, message=?, status=?, updated_at=? WHERE id=?`,
        [
          next.listingId,
          next.eventId ?? null,
          next.name,
          next.email,
          next.message,
          next.status,
          next.updatedAt,
          id
        ]
      );
      return next;
    }
  },
  banners: {
    getAll: async () => (await query("SELECT * FROM banners")).map(mapBanner),
    findBySection: async (section: string) => {
      const rows = await query("SELECT * FROM banners WHERE section = ? AND status = 'active'", [
        section
      ]);
      return rows.map(mapBanner);
    },
    create: async (banner: Omit<Banner, "id" | "createdAt" | "updatedAt">) => {
      const now = nowIso();
      const newBanner: Banner = {
        ...banner,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      await query(
        `INSERT INTO banners (id, title, image, link, section, position, status, start_date, end_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newBanner.id,
          newBanner.title,
          newBanner.image,
          newBanner.link ?? null,
          newBanner.section,
          newBanner.position,
          newBanner.status,
          newBanner.startDate,
          newBanner.endDate ?? null,
          newBanner.createdAt,
          newBanner.updatedAt
        ]
      );
      return newBanner;
    },
    update: async (id: string, updates: Partial<Banner>) => {
      const current = await queryOne("SELECT * FROM banners WHERE id = ?", [id]);
      if (!current) return null;
      const mapped = mapBanner(current);
      const next: Banner = {
        ...mapped,
        ...updates,
        updatedAt: nowIso()
      };
      await query(
        `UPDATE banners SET title=?, image=?, link=?, section=?, position=?, status=?, start_date=?, end_date=?, updated_at=? WHERE id=?`,
        [
          next.title,
          next.image,
          next.link ?? null,
          next.section,
          next.position,
          next.status,
          next.startDate,
          next.endDate ?? null,
          next.updatedAt,
          id
        ]
      );
      return next;
    },
    delete: async (id: string) => {
      await query("DELETE FROM banners WHERE id = ?", [id]);
      return true;
    }
  },
  news: {
    getAll: async () => (await query("SELECT * FROM news")).map(mapNews),
    findById: async (id: string) => {
      const row = await queryOne("SELECT * FROM news WHERE id = ?", [id]);
      return row ? mapNews(row) : null;
    },
    findBySlug: async (slug: string) => {
      const row = await queryOne("SELECT * FROM news WHERE slug = ?", [slug]);
      return row ? mapNews(row) : null;
    },
    create: async (news: Omit<News, "id" | "createdAt" | "updatedAt">) => {
      const now = nowIso();
      const newNews: News = {
        ...news,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      await query(
        `INSERT INTO news (id, slug, title, content, excerpt, category, cover_image, author, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newNews.id,
          newNews.slug,
          newNews.title,
          newNews.content,
          newNews.excerpt,
          newNews.category,
          newNews.coverImage,
          newNews.author,
          newNews.status,
          newNews.createdAt,
          newNews.updatedAt
        ]
      );
      return newNews;
    },
    update: async (id: string, updates: Partial<News>) => {
      const current = await dbMysql.news.findById(id);
      if (!current) return null;
      const next: News = {
        ...current,
        ...updates,
        updatedAt: nowIso()
      };
      await query(
        `UPDATE news SET slug=?, title=?, content=?, excerpt=?, category=?, cover_image=?, author=?, status=?, updated_at=? WHERE id=?`,
        [
          next.slug,
          next.title,
          next.content,
          next.excerpt,
          next.category,
          next.coverImage,
          next.author,
          next.status,
          next.updatedAt,
          id
        ]
      );
      return next;
    },
    delete: async (id: string) => {
      await query("DELETE FROM news WHERE id = ?", [id]);
      return true;
    }
  },
  settings: {
    get: async () => {
      const row = await queryOne<{ data: any }>("SELECT data FROM settings WHERE id = 1");
      if (!row) return null;
      const settings = parseJson<Settings | null>(row.data, null);
      if (!settings) return null;

      if (settings.branding) {
        settings.branding = {
          ...settings.branding,
          logoUrl: toPublicAssetUrl(settings.branding.logoUrl, { uploadType: "site" }),
          faviconUrl: toPublicAssetUrl(settings.branding.faviconUrl, { uploadType: "site" })
        };
      }

      return settings;
    },
    update: async (settings: Partial<Settings>) => {
      const current = (await dbMysql.settings.get()) || ({} as Settings);
      const updated = { ...current, ...settings };
      await query(
        "INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
        [JSON.stringify(updated)]
      );
      return updated;
    }
  },
  vehicleCatalog: {
    get: async () => {
      const brands = await dbMysql.vehicleCatalog.getBrands();
      return { brands };
    },
    getBrands: async () => (await query("SELECT * FROM vehicle_brands")).map(mapBrand),
    getModels: async (brandId: string) => {
      const row = await queryOne("SELECT * FROM vehicle_brands WHERE id = ?", [brandId]);
      if (!row) return [];
      return mapBrand(row).models;
    },
    saveBrands: async (brands: VehicleBrand[]) => {
      for (const brand of brands) {
        await query(
          "INSERT INTO vehicle_brands (id, name, models) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), models = VALUES(models)",
          [brand.id, brand.name, JSON.stringify(brand.models ?? [])]
        );
      }
      return brands;
    },
    upsertBrand: async (brand: VehicleBrand) => {
      await query(
        "INSERT INTO vehicle_brands (id, name, models) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), models = VALUES(models)",
        [brand.id, brand.name, JSON.stringify(brand.models ?? [])]
      );
      return dbMysql.vehicleCatalog.getBrands();
    },
    addModel: async (brandId: string, model: string) => {
      const row = await queryOne("SELECT * FROM vehicle_brands WHERE id = ?", [brandId]);
      if (!row) return null;
      const brand = mapBrand(row);
      const normalized = model.trim();
      if (normalized && !brand.models.includes(normalized)) {
        brand.models.push(normalized);
        brand.models.sort((a, b) => a.localeCompare(b));
        await query(
          "UPDATE vehicle_brands SET models = ? WHERE id = ?",
          [JSON.stringify(brand.models), brandId]
        );
      }
      return brand.models;
    },
    removeModel: async (brandId: string, model: string) => {
      const row = await queryOne("SELECT * FROM vehicle_brands WHERE id = ?", [brandId]);
      if (!row) return null;
      const brand = mapBrand(row);
      brand.models = brand.models.filter((item) => item !== model);
      await query(
        "UPDATE vehicle_brands SET models = ? WHERE id = ?",
        [JSON.stringify(brand.models), brandId]
      );
      return brand.models;
    },
    deleteBrand: async (brandId: string) => {
      await query("DELETE FROM vehicle_brands WHERE id = ?", [brandId]);
      return dbMysql.vehicleCatalog.getBrands();
    }
  }
};
