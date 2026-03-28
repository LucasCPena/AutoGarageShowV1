import mysql from "mysql2/promise";

import type {
  AuditEvent,
  AdvertiserMessage,
  Banner,
  Comment,
  Event,
  Listing,
  MetricEvent,
  News,
  Organizer,
  PastEvent,
  Settings,
  User,
  VehicleBrand
} from "./database.types";
import { deepMerge } from "./deep-merge";
import {
  decryptSensitiveString,
  encryptSensitiveString,
  fingerprintSensitiveValue
} from "./secure-fields";
import { toPublicAssetUrl, toPublicAssetUrls } from "./site-url";
import { loadRuntimeEnvFiles } from "./runtime-env";
import {
  sanitizeMetricLabel,
  sanitizeMetricMetadata,
  sanitizeMetricPath
} from "./privacy";
import { normalizeUserRecord } from "./userProfiles";

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
let usersTableEnsured = false;
let organizersTableEnsured = false;
let listingsTableEnsured = false;
let messagesTableEnsured = false;
let metricsTableEnsured = false;
let auditTableEnsured = false;

const DEFAULT_LISTING_CONTACT = {
  name: "",
  email: "",
  phone: ""
};

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
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[db] Falha ao mapear colunas da tabela ${table}: ${message}`);
    tableColumnsCache.set(table, null);
    return null;
  }
}

function clearTableColumnsCache(table: string) {
  tableColumnsCache.delete(table);
}

async function ensureUsersTable() {
  if (usersTableEnsured) return;

  const columns = await getTableColumnsSafe("users");
  if (columns && !columns.has("document_type")) {
    await query("ALTER TABLE users ADD COLUMN document_type VARCHAR(8) NULL");
    clearTableColumnsCache("users");
  }
  if (columns && !columns.has("account_type")) {
    await query("ALTER TABLE users ADD COLUMN account_type VARCHAR(20) NULL");
    clearTableColumnsCache("users");
  }
  if (columns && !columns.has("company_name")) {
    await query("ALTER TABLE users ADD COLUMN company_name VARCHAR(160) NULL");
    clearTableColumnsCache("users");
  }
  if (columns && !columns.has("logo_url")) {
    await query("ALTER TABLE users ADD COLUMN logo_url VARCHAR(255) NULL");
    clearTableColumnsCache("users");
  }
  if (columns && !columns.has("approval_status")) {
    await query("ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) NULL");
    clearTableColumnsCache("users");
  }
  if (columns && !columns.has("verification_status")) {
    await query("ALTER TABLE users ADD COLUMN verification_status VARCHAR(20) NULL");
    clearTableColumnsCache("users");
  }
  if (columns && !columns.has("listing_limit_override")) {
    await query("ALTER TABLE users ADD COLUMN listing_limit_override INT NULL");
    clearTableColumnsCache("users");
  }
  if (columns && !columns.has("marketplace_profile")) {
    await query("ALTER TABLE users ADD COLUMN marketplace_profile VARCHAR(40) NULL");
    clearTableColumnsCache("users");
  }
  if (columns && !columns.has("document_hash")) {
    await query("ALTER TABLE users ADD COLUMN document_hash VARCHAR(64) NULL");
    clearTableColumnsCache("users");
  }

  usersTableEnsured = true;
}

async function ensureOrganizersTable() {
  if (organizersTableEnsured) return;
  await query(
    `CREATE TABLE IF NOT EXISTS organizers (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      logo VARCHAR(255) NOT NULL,
      alt_text VARCHAR(180),
      banner_top VARCHAR(255),
      link VARCHAR(255),
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    )`
  );

  const columns = await getTableColumnsSafe("organizers");
  if (columns && !columns.has("name")) {
    await query("ALTER TABLE organizers ADD COLUMN name VARCHAR(120) NOT NULL DEFAULT 'Organizador'");
  }
  if (columns && !columns.has("alt_text")) {
    await query("ALTER TABLE organizers ADD COLUMN alt_text VARCHAR(180) NULL");
  }
  if (columns && !columns.has("banner_top")) {
    await query("ALTER TABLE organizers ADD COLUMN banner_top VARCHAR(255) NULL");
  }

  organizersTableEnsured = true;
}

async function ensureListingsTable() {
  if (listingsTableEnsured) return;

  const columns = await getTableColumnsSafe("listings");
  if (columns && !columns.has("vehicle_type")) {
    await query("ALTER TABLE listings ADD COLUMN vehicle_type VARCHAR(20) NULL");
    clearTableColumnsCache("listings");
  }
  if (columns && !columns.has("document_hash")) {
    await query("ALTER TABLE listings ADD COLUMN document_hash VARCHAR(64) NULL");
    clearTableColumnsCache("listings");
  }

  listingsTableEnsured = true;
}

async function ensureMessagesTable() {
  if (messagesTableEnsured) return;

  await query(
    `CREATE TABLE IF NOT EXISTS advertiser_messages (
      id VARCHAR(36) PRIMARY KEY,
      sender_user_id VARCHAR(36),
      sender_name VARCHAR(160) NOT NULL,
      sender_email VARCHAR(160) NOT NULL,
      sender_phone VARCHAR(30),
      recipient_user_id VARCHAR(36) NOT NULL,
      listing_id VARCHAR(36),
      subject VARCHAR(200),
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    )`
  );

  messagesTableEnsured = true;
}

async function ensureMetricsTable() {
  if (metricsTableEnsured) return;

  await query(
    `CREATE TABLE IF NOT EXISTS metric_events (
      id VARCHAR(36) PRIMARY KEY,
      event_type VARCHAR(40) NOT NULL,
      entity_type VARCHAR(20) NOT NULL,
      entity_id VARCHAR(80),
      owner_user_id VARCHAR(36),
      user_id VARCHAR(36),
      path VARCHAR(255) NOT NULL,
      label VARCHAR(255),
      metadata JSON,
      created_at VARCHAR(32) NOT NULL
    )`
  );

  metricsTableEnsured = true;
}

async function ensureAuditTable() {
  if (auditTableEnsured) return;

  await query(
    `CREATE TABLE IF NOT EXISTS audit_events (
      id VARCHAR(36) PRIMARY KEY,
      actor_user_id VARCHAR(36),
      action VARCHAR(80) NOT NULL,
      entity_type VARCHAR(30) NOT NULL,
      entity_id VARCHAR(80),
      status VARCHAR(20) NOT NULL,
      path VARCHAR(255),
      metadata JSON,
      created_at VARCHAR(32) NOT NULL
    )`
  );

  auditTableEnsured = true;
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

function buildStoredUser(user: User) {
  const normalized = normalizeUserRecord(user);
  return {
    ...normalized,
    document: encryptSensitiveString(normalized.document) ?? null,
    phone: encryptSensitiveString(normalized.phone) ?? null,
    documentHash: fingerprintSensitiveValue(normalized.document, "user-document")
  };
}

function buildStoredEvent(event: Event) {
  return {
    ...event,
    contactDocument: encryptSensitiveString(event.contactDocument) ?? null,
    contactPhone: encryptSensitiveString(event.contactPhone) ?? null,
    contactPhoneSecondary: encryptSensitiveString(event.contactPhoneSecondary) ?? null,
    contactEmail: encryptSensitiveString(event.contactEmail) ?? null
  };
}

function buildStoredListing(listing: Listing) {
  return {
    ...listing,
    contact: {
      ...DEFAULT_LISTING_CONTACT,
      ...(listing.contact ?? {}),
      name: encryptSensitiveString(listing.contact?.name) ?? "",
      email: encryptSensitiveString(listing.contact?.email) ?? "",
      phone: encryptSensitiveString(listing.contact?.phone) ?? ""
    },
    document: encryptSensitiveString(listing.document) ?? listing.document,
    documentHash: fingerprintSensitiveValue(listing.document, "listing-document")
  };
}

function buildStoredMessage(message: AdvertiserMessage) {
  return {
    ...message,
    senderName: encryptSensitiveString(message.senderName) ?? "",
    senderEmail: encryptSensitiveString(message.senderEmail) ?? "",
    senderPhone: encryptSensitiveString(message.senderPhone) ?? null,
    message: encryptSensitiveString(message.message) ?? ""
  };
}

function buildStoredMetricEvent(event: MetricEvent) {
  return {
    ...event,
    path: sanitizeMetricPath(event.path),
    label: sanitizeMetricLabel(event.label, event.eventType) ?? null,
    metadata: sanitizeMetricMetadata(event.metadata)
  };
}

function buildStoredAuditEvent(event: AuditEvent) {
  return {
    ...event,
    path: event.path ? sanitizeMetricPath(event.path) : null,
    metadata: sanitizeMetricMetadata(event.metadata)
  };
}

function mapUser(row: Row): User {
  return normalizeUserRecord({
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    document: decryptSensitiveString(row.document ?? undefined),
    documentType: row.document_type ?? undefined,
    phone: decryptSensitiveString(row.phone ?? undefined),
    accountType: row.account_type ?? undefined,
    companyName: row.company_name ?? undefined,
    logoUrl: toPublicAssetUrl(row.logo_url, { uploadType: "site" }) || row.logo_url,
    approvalStatus: row.approval_status ?? undefined,
    verificationStatus: row.verification_status ?? undefined,
    listingLimitOverride:
      row.listing_limit_override === null || row.listing_limit_override === undefined
        ? null
        : Number(row.listing_limit_override),
    marketplaceProfile: row.marketplace_profile ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
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
    contactDocument: decryptSensitiveString(row.contact_document ?? undefined),
    contactPhone: decryptSensitiveString(row.contact_phone ?? undefined),
    contactPhoneSecondary: decryptSensitiveString(row.contact_phone_secondary ?? undefined),
    contactEmail: decryptSensitiveString(row.contact_email ?? undefined),
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
  const contact = parseJson(row.contact, DEFAULT_LISTING_CONTACT);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    vehicleType: row.vehicle_type ?? "car",
    description: row.description,
    make: row.make,
    model: row.model,
    modelYear: Number(row.model_year),
    manufactureYear: Number(row.manufacture_year),
    year: Number(row.year ?? row.model_year),
    mileage: Number(row.mileage),
    price: Number(row.price),
    images: toPublicAssetUrls(parseJson(row.images, []), { uploadType: "listing" }),
    contact: {
      name: decryptSensitiveString(contact?.name) ?? "",
      email: decryptSensitiveString(contact?.email) ?? "",
      phone: decryptSensitiveString(contact?.phone) ?? ""
    },
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
    document: decryptSensitiveString(row.document) ?? "",
    city: row.city,
    state: row.state,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapAdvertiserMessage(row: Row): AdvertiserMessage {
  return {
    id: row.id,
    senderUserId: row.sender_user_id ?? undefined,
    senderName: decryptSensitiveString(row.sender_name) ?? "",
    senderEmail: decryptSensitiveString(row.sender_email) ?? "",
    senderPhone: decryptSensitiveString(row.sender_phone ?? undefined),
    recipientUserId: row.recipient_user_id,
    listingId: row.listing_id ?? undefined,
    subject: row.subject ?? undefined,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMetricEvent(row: Row): MetricEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id ?? undefined,
    ownerUserId: row.owner_user_id ?? undefined,
    userId: row.user_id ?? undefined,
    path: sanitizeMetricPath(row.path),
    label: sanitizeMetricLabel(row.label ?? undefined, row.event_type) ?? undefined,
    metadata: sanitizeMetricMetadata(parseJson(row.metadata, {})),
    createdAt: row.created_at
  };
}

function mapAuditEvent(row: Row): AuditEvent {
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? undefined,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? undefined,
    status: row.status,
    path: row.path ? sanitizeMetricPath(row.path) : undefined,
    metadata: sanitizeMetricMetadata(parseJson(row.metadata, {})),
    createdAt: row.created_at
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
    title: row.title ?? "",
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

function mapOrganizer(row: Row): Organizer {
  return {
    id: row.id,
    name: row.name || "Organizador",
    logo: toPublicAssetUrl(row.logo, { uploadType: "event" }) || row.logo,
    altText: row.alt_text ?? undefined,
    bannerTop: toPublicAssetUrl(row.banner_top, { uploadType: "banner" }) || (row.banner_top ?? undefined),
    link: row.link ?? undefined,
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
    getAll: async () => {
      await ensureUsersTable();
      return (await query("SELECT * FROM users")).map(mapUser);
    },
    findById: async (id: string) => {
      await ensureUsersTable();
      const row = await queryOne("SELECT * FROM users WHERE id = ?", [id]);
      return row ? mapUser(row) : null;
    },
    findByEmail: async (email: string) => {
      await ensureUsersTable();
      const row = await queryOne("SELECT * FROM users WHERE email = ?", [email]);
      return row ? mapUser(row) : null;
    },
    findByDocument: async (document: string) => {
      await ensureUsersTable();
      const documentHash = fingerprintSensitiveValue(document, "user-document");
      const row = documentHash
        ? await queryOne("SELECT * FROM users WHERE document_hash = ? OR document = ?", [
            documentHash,
            document
          ])
        : await queryOne("SELECT * FROM users WHERE document = ?", [document]);
      return row ? mapUser(row) : null;
    },
    create: async (user: Omit<User, "id" | "createdAt" | "updatedAt">) => {
      await ensureUsersTable();
      const now = nowIso();
      const newUser = buildStoredUser({
        ...user,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      } as User);
      await query(
        `INSERT INTO users (
          id, name, email, password, role, document, document_type, phone,
          account_type, company_name, logo_url, approval_status, verification_status,
          listing_limit_override, marketplace_profile, document_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUser.id,
          newUser.name,
          newUser.email,
          newUser.password,
          newUser.role,
          newUser.document ?? null,
          newUser.documentType ?? null,
          newUser.phone ?? null,
          newUser.accountType ?? null,
          newUser.companyName ?? null,
          newUser.logoUrl ?? null,
          newUser.approvalStatus ?? "approved",
          newUser.verificationStatus ?? "unverified",
          newUser.listingLimitOverride ?? null,
          newUser.marketplaceProfile ?? null,
          newUser.documentHash ?? null,
          newUser.createdAt,
          newUser.updatedAt
        ]
      );
      return mapUser({
        ...newUser,
        document_type: newUser.documentType,
        account_type: newUser.accountType,
        company_name: newUser.companyName,
        logo_url: newUser.logoUrl,
        approval_status: newUser.approvalStatus,
        verification_status: newUser.verificationStatus,
        listing_limit_override: newUser.listingLimitOverride,
        marketplace_profile: newUser.marketplaceProfile,
        created_at: newUser.createdAt,
        updated_at: newUser.updatedAt
      });
    },
    update: async (id: string, updates: Partial<User>) => {
      await ensureUsersTable();
      const current = await dbMysql.users.findById(id);
      if (!current) return null;
      const next = buildStoredUser({
        ...current,
        ...updates,
        updatedAt: nowIso()
      } as User);
      await query(
        `UPDATE users SET
          name=?, email=?, password=?, role=?, document=?, document_type=?, phone=?,
          account_type=?, company_name=?, logo_url=?, approval_status=?, verification_status=?,
          listing_limit_override=?, marketplace_profile=?, document_hash=?, updated_at=?
         WHERE id=?`,
        [
          next.name,
          next.email,
          next.password,
          next.role,
          next.document ?? null,
          next.documentType ?? null,
          next.phone ?? null,
          next.accountType ?? null,
          next.companyName ?? null,
          next.logoUrl ?? null,
          next.approvalStatus ?? "approved",
          next.verificationStatus ?? "unverified",
          next.listingLimitOverride ?? null,
          next.marketplaceProfile ?? null,
          next.documentHash ?? null,
          next.updatedAt,
          id
        ]
      );
      return mapUser({
        ...next,
        document_type: next.documentType,
        account_type: next.accountType,
        company_name: next.companyName,
        logo_url: next.logoUrl,
        approval_status: next.approvalStatus,
        verification_status: next.verificationStatus,
        listing_limit_override: next.listingLimitOverride,
        marketplace_profile: next.marketplaceProfile,
        created_at: next.createdAt,
        updated_at: next.updatedAt
      });
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
      const newEvent = buildStoredEvent({
        ...event,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      });

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
        return mapEvent({
          ...newEvent,
          contact_name: newEvent.contactName,
          contact_document: newEvent.contactDocument,
          contact_phone: newEvent.contactPhone,
          contact_phone_secondary: newEvent.contactPhoneSecondary,
          contact_email: newEvent.contactEmail,
          start_at: newEvent.startAt,
          end_at: newEvent.endAt,
          website_url: newEvent.websiteUrl,
          live_url: newEvent.liveUrl,
          organizer_logo: newEvent.organizerLogo,
          cover_image: newEvent.coverImage,
          created_by: newEvent.createdBy,
          created_at: newEvent.createdAt,
          updated_at: newEvent.updatedAt
        });
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
      return mapEvent({
        ...newEvent,
        contact_name: newEvent.contactName,
        contact_document: newEvent.contactDocument,
        contact_phone: newEvent.contactPhone,
        contact_phone_secondary: newEvent.contactPhoneSecondary,
        contact_email: newEvent.contactEmail,
        start_at: newEvent.startAt,
        end_at: newEvent.endAt,
        website_url: newEvent.websiteUrl,
        live_url: newEvent.liveUrl,
        organizer_logo: newEvent.organizerLogo,
        cover_image: newEvent.coverImage,
        created_by: newEvent.createdBy,
        created_at: newEvent.createdAt,
        updated_at: newEvent.updatedAt
      });
    },
    update: async (id: string, updates: Partial<Event>) => {
      const current = await dbMysql.events.findById(id);
      if (!current) return null;
      const next = buildStoredEvent({
        ...current,
        ...updates,
        updatedAt: nowIso()
      });
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

        return mapEvent({
          ...next,
          contact_name: next.contactName,
          contact_document: next.contactDocument,
          contact_phone: next.contactPhone,
          contact_phone_secondary: next.contactPhoneSecondary,
          contact_email: next.contactEmail,
          start_at: next.startAt,
          end_at: next.endAt,
          website_url: next.websiteUrl,
          live_url: next.liveUrl,
          organizer_logo: next.organizerLogo,
          cover_image: next.coverImage,
          created_by: next.createdBy,
          created_at: next.createdAt,
          updated_at: next.updatedAt
        });
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
      return mapEvent({
        ...next,
        contact_name: next.contactName,
        contact_document: next.contactDocument,
        contact_phone: next.contactPhone,
        contact_phone_secondary: next.contactPhoneSecondary,
        contact_email: next.contactEmail,
        start_at: next.startAt,
        end_at: next.endAt,
        website_url: next.websiteUrl,
        live_url: next.liveUrl,
        organizer_logo: next.organizerLogo,
        cover_image: next.coverImage,
        created_by: next.createdBy,
        created_at: next.createdAt,
        updated_at: next.updatedAt
      });
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
    getAll: async () => {
      await ensureListingsTable();
      return (await query("SELECT * FROM listings")).map(mapListing);
    },
    findById: async (id: string) => {
      await ensureListingsTable();
      const row = await queryOne("SELECT * FROM listings WHERE id = ?", [id]);
      return row ? mapListing(row) : null;
    },
    findBySlug: async (slug: string) => {
      await ensureListingsTable();
      const row = await queryOne("SELECT * FROM listings WHERE slug = ?", [slug]);
      return row ? mapListing(row) : null;
    },
    findByUser: async (userId: string) => {
      await ensureListingsTable();
      const rows = await query("SELECT * FROM listings WHERE created_by = ?", [userId]);
      return rows.map(mapListing);
    },
    findByDocument: async (document: string) => {
      await ensureListingsTable();
      const documentHash = fingerprintSensitiveValue(document, "listing-document");
      const rows = documentHash
        ? await query("SELECT * FROM listings WHERE document_hash = ? OR document = ?", [
            documentHash,
            document
          ])
        : await query("SELECT * FROM listings WHERE document = ?", [document]);
      return rows.map(mapListing);
    },
    getActiveCount: async (document: string) => {
      await ensureListingsTable();
      const documentHash = fingerprintSensitiveValue(document, "listing-document");
      const row = await queryOne<{ total: number }>(
        documentHash
          ? "SELECT COUNT(*) as total FROM listings WHERE (document_hash = ? OR document = ?) AND status = 'active'"
          : "SELECT COUNT(*) as total FROM listings WHERE document = ? AND status = 'active'",
        documentHash ? [documentHash, document] : [document]
      );
      return Number(row?.total || 0);
    },
    create: async (listing: Omit<Listing, "id" | "createdAt" | "updatedAt">) => {
      await ensureListingsTable();
      const now = nowIso();
      const newListing = buildStoredListing({
        ...listing,
        vehicleType: listing.vehicleType ?? "car",
        year: listing.year ?? listing.modelYear,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      });
      await query(
        `INSERT INTO listings (id, slug, title, vehicle_type, description, make, model, model_year, manufacture_year, year, mileage, price, images, contact, specifications, status, featured, featured_until, created_by, document, document_hash, city, state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newListing.id,
          newListing.slug,
          newListing.title,
          newListing.vehicleType ?? "car",
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
          newListing.documentHash ?? null,
          newListing.city,
          newListing.state,
          newListing.createdAt,
          newListing.updatedAt
        ]
      );
      return mapListing({
        ...newListing,
        created_by: newListing.createdBy,
        created_at: newListing.createdAt,
        updated_at: newListing.updatedAt
      });
    },
    update: async (id: string, updates: Partial<Listing>) => {
      await ensureListingsTable();
      const current = await dbMysql.listings.findById(id);
      if (!current) return null;
      const next = buildStoredListing({
        ...current,
        ...updates,
        vehicleType: updates.vehicleType ?? current.vehicleType ?? "car",
        year: updates.year ?? updates.modelYear ?? current.year ?? current.modelYear,
        updatedAt: nowIso()
      });
      await query(
        `UPDATE listings SET slug=?, title=?, vehicle_type=?, description=?, make=?, model=?, model_year=?, manufacture_year=?, year=?, mileage=?, price=?, images=?, contact=?, specifications=?, status=?, featured=?, featured_until=?, created_by=?, document=?, document_hash=?, city=?, state=?, updated_at=? WHERE id=?`,
        [
          next.slug,
          next.title,
          next.vehicleType ?? "car",
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
          next.documentHash ?? null,
          next.city,
          next.state,
          next.updatedAt,
          id
        ]
      );
      return mapListing({
        ...next,
        created_by: next.createdBy,
        created_at: next.createdAt,
        updated_at: next.updatedAt
      });
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
  organizers: {
    getAll: async () => {
      await ensureOrganizersTable();
      return (await query("SELECT * FROM organizers ORDER BY created_at DESC")).map(mapOrganizer);
    },
    findById: async (id: string) => {
      await ensureOrganizersTable();
      const row = await queryOne("SELECT * FROM organizers WHERE id = ?", [id]);
      return row ? mapOrganizer(row) : null;
    },
    create: async (organizer: Omit<Organizer, "id" | "createdAt" | "updatedAt">) => {
      await ensureOrganizersTable();
      const now = nowIso();
      const newOrganizer: Organizer = {
        ...organizer,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      await query(
        `INSERT INTO organizers (id, name, logo, alt_text, banner_top, link, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newOrganizer.id,
          newOrganizer.name,
          newOrganizer.logo,
          newOrganizer.altText ?? null,
          newOrganizer.bannerTop ?? null,
          newOrganizer.link ?? null,
          newOrganizer.createdAt,
          newOrganizer.updatedAt
        ]
      );
      return newOrganizer;
    },
    update: async (id: string, updates: Partial<Organizer>) => {
      await ensureOrganizersTable();
      const current = await dbMysql.organizers.findById(id);
      if (!current) return null;
      const next: Organizer = {
        ...current,
        ...updates,
        updatedAt: nowIso()
      };
      await query(
        `UPDATE organizers SET name=?, logo=?, alt_text=?, banner_top=?, link=?, updated_at=? WHERE id=?`,
        [
          next.name,
          next.logo,
          next.altText ?? null,
          next.bannerTop ?? null,
          next.link ?? null,
          next.updatedAt,
          id
        ]
      );
      return next;
    },
    delete: async (id: string) => {
      await ensureOrganizersTable();
      await query("DELETE FROM organizers WHERE id = ?", [id]);
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
  messages: {
    getAll: async () => {
      await ensureMessagesTable();
      return (await query("SELECT * FROM advertiser_messages")).map(mapAdvertiserMessage);
    },
    findByRecipientUser: async (userId: string) => {
      await ensureMessagesTable();
      const rows = await query(
        "SELECT * FROM advertiser_messages WHERE recipient_user_id = ? ORDER BY created_at DESC",
        [userId]
      );
      return rows.map(mapAdvertiserMessage);
    },
    create: async (message: Omit<AdvertiserMessage, "id" | "createdAt" | "updatedAt">) => {
      await ensureMessagesTable();
      const now = nowIso();
      const newMessage = buildStoredMessage({
        ...message,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      });
      await query(
        `INSERT INTO advertiser_messages (
          id, sender_user_id, sender_name, sender_email, sender_phone,
          recipient_user_id, listing_id, subject, message, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newMessage.id,
          newMessage.senderUserId ?? null,
          newMessage.senderName,
          newMessage.senderEmail,
          newMessage.senderPhone ?? null,
          newMessage.recipientUserId,
          newMessage.listingId ?? null,
          newMessage.subject ?? null,
          newMessage.message,
          newMessage.status,
          newMessage.createdAt,
          newMessage.updatedAt
        ]
      );
      return mapAdvertiserMessage({
        ...newMessage,
        sender_user_id: newMessage.senderUserId,
        sender_name: newMessage.senderName,
        sender_email: newMessage.senderEmail,
        sender_phone: newMessage.senderPhone,
        recipient_user_id: newMessage.recipientUserId,
        listing_id: newMessage.listingId,
        created_at: newMessage.createdAt,
        updated_at: newMessage.updatedAt
      });
    },
    update: async (id: string, updates: Partial<AdvertiserMessage>) => {
      await ensureMessagesTable();
      const row = await queryOne("SELECT * FROM advertiser_messages WHERE id = ?", [id]);
      if (!row) return null;
      const current = mapAdvertiserMessage(row);
      const next = buildStoredMessage({
        ...current,
        ...updates,
        updatedAt: nowIso()
      });
      await query(
        `UPDATE advertiser_messages SET
          sender_user_id=?, sender_name=?, sender_email=?, sender_phone=?,
          recipient_user_id=?, listing_id=?, subject=?, message=?, status=?, updated_at=?
         WHERE id=?`,
        [
          next.senderUserId ?? null,
          next.senderName,
          next.senderEmail,
          next.senderPhone ?? null,
          next.recipientUserId,
          next.listingId ?? null,
          next.subject ?? null,
          next.message,
          next.status,
          next.updatedAt,
          id
        ]
      );
      return mapAdvertiserMessage({
        ...next,
        sender_user_id: next.senderUserId,
        sender_name: next.senderName,
        sender_email: next.senderEmail,
        sender_phone: next.senderPhone,
        recipient_user_id: next.recipientUserId,
        listing_id: next.listingId,
        created_at: next.createdAt,
        updated_at: next.updatedAt
      });
    }
  },
  metrics: {
    getAll: async () => {
      await ensureMetricsTable();
      return (await query("SELECT * FROM metric_events ORDER BY created_at DESC")).map(mapMetricEvent);
    },
    create: async (event: Omit<MetricEvent, "id" | "createdAt">) => {
      await ensureMetricsTable();
      const newEvent = buildStoredMetricEvent({
        ...event,
        id: crypto.randomUUID(),
        createdAt: nowIso()
      });
      await query(
        `INSERT INTO metric_events (
          id, event_type, entity_type, entity_id, owner_user_id, user_id, path, label, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newEvent.id,
          newEvent.eventType,
          newEvent.entityType,
          newEvent.entityId ?? null,
          newEvent.ownerUserId ?? null,
          newEvent.userId ?? null,
          newEvent.path,
          newEvent.label ?? null,
          JSON.stringify(newEvent.metadata ?? {}),
          newEvent.createdAt
        ]
      );
      return mapMetricEvent({
        ...newEvent,
        event_type: newEvent.eventType,
        entity_type: newEvent.entityType,
        entity_id: newEvent.entityId,
        owner_user_id: newEvent.ownerUserId,
        user_id: newEvent.userId,
        created_at: newEvent.createdAt
      });
    }
  },
  audit: {
    getAll: async () => {
      await ensureAuditTable();
      return (await query("SELECT * FROM audit_events ORDER BY created_at DESC")).map(mapAuditEvent);
    },
    create: async (event: Omit<AuditEvent, "id" | "createdAt">) => {
      await ensureAuditTable();
      const newEvent = buildStoredAuditEvent({
        ...event,
        id: crypto.randomUUID(),
        createdAt: nowIso()
      });
      await query(
        `INSERT INTO audit_events (
          id, actor_user_id, action, entity_type, entity_id, status, path, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newEvent.id,
          newEvent.actorUserId ?? null,
          newEvent.action,
          newEvent.entityType,
          newEvent.entityId ?? null,
          newEvent.status,
          newEvent.path ?? null,
          JSON.stringify(newEvent.metadata ?? {}),
          newEvent.createdAt
        ]
      );
      return mapAuditEvent({
        ...newEvent,
        actor_user_id: newEvent.actorUserId,
        entity_type: newEvent.entityType,
        entity_id: newEvent.entityId,
        created_at: newEvent.createdAt
      });
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
      const updated = deepMerge(current, settings);
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
