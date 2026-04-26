const fs = require("fs/promises");
const path = require("path");
const { createCipheriv, createHash, createHmac, randomBytes, scryptSync } = require("crypto");
const mysql = require("mysql2/promise");

require("dotenv").config({ path: ".env.local" });

function getConfig() {
  const url = process.env.MYSQL_URL;
  if (url) {
    return { uri: url };
  }

  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = Number(process.env.MYSQL_PORT || 3306);

  if (!host || !user || !database) {
    throw new Error(
      "Defina MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE (e opcional MYSQL_PORT)"
    );
  }

  return { host, user, password, database, port };
}

async function readJson(file) {
  try {
    const data = await fs.readFile(path.join(process.cwd(), "data", file), "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

const PASSWORD_HASH_PREFIX = "scrypt:v1";
const ENCRYPTED_FIELD_PREFIX = "enc:v1";

function getSecuritySecret() {
  return (
    process.env.APP_FIELD_ENCRYPTION_KEY ||
    process.env.AUTH_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    null
  );
}

function hashPassword(password) {
  const normalized = String(password || "");
  if (!normalized || normalized.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    return normalized;
  }

  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(normalized, salt, 64).toString("base64url");
  return `${PASSWORD_HASH_PREFIX}$${salt}$${hash}`;
}

function encryptValue(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized.startsWith(`${ENCRYPTED_FIELD_PREFIX}:`)) {
    return normalized || null;
  }

  const secret = getSecuritySecret();
  if (!secret) return normalized;

  const key = createHash("sha256").update(`field-encryption:${secret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    ENCRYPTED_FIELD_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(":");
}

function fingerprintValue(value, purpose) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;

  const secret = getSecuritySecret();
  if (!secret) {
    return createHash("sha256").update(`${purpose}:${normalized}`).digest("hex");
  }

  return createHmac("sha256", createHash("sha256").update(`fp:${secret}`).digest())
    .update(`${purpose}:${normalized}`)
    .digest("hex");
}

function sanitizeMetricPath(pathValue) {
  const normalized = String(pathValue || "/").trim();
  if (!normalized) return "/";
  return normalized.split("?")[0].split("#")[0].slice(0, 255) || "/";
}

function sanitizeMetricLabel(labelValue, eventType) {
  const normalized = String(labelValue || "").trim();
  if (!normalized) return null;
  if (eventType === "search") return "Busca interna";
  return normalized.slice(0, 120);
}

function sanitizeMetricMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};

  const entries = Object.entries(metadata)
    .filter(([key]) => !/(email|phone|document|cpf|cnpj|query|message|password|token)/i.test(key))
    .slice(0, 10)
    .flatMap(([key, value]) => {
      if (typeof value === "boolean") return [[key, value]];
      if (typeof value === "number" && Number.isFinite(value)) return [[key, value]];
      if (typeof value === "string") return [[key, value.trim().slice(0, 120)]];
      return [];
    });

  return Object.fromEntries(entries);
}

async function seed() {
  const pool = mysql.createPool({
    ...getConfig(),
    waitForConnections: true,
    connectionLimit: 10
  });

  const users = (await readJson("users.json")) || [];
  const events = (await readJson("events.json")) || [];
  const listings = (await readJson("listings.json")) || [];
  const comments = (await readJson("comments.json")) || [];
  const banners = (await readJson("banners.json")) || [];
  const organizers = (await readJson("organizers.json")) || [];
  const news = (await readJson("news.json")) || [];
  const pastEvents = (await readJson("pastEvents.json")) || [];
  const messages = (await readJson("messages.json")) || [];
  const metrics = (await readJson("metrics.json")) || [];
  const settings = await readJson("settings.json");
  const vehicleCatalog = await readJson("vehicleCatalog.json");

  for (const user of users) {
    const createdAt = user.createdAt || nowIso();
    const updatedAt = user.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO users (
        id, name, email, password, role, document, document_type, phone,
        account_type, company_name, logo_url, approval_status, verification_status,
        listing_limit_override, marketplace_profile, document_hash, created_at, updated_at
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name=VALUES(name), email=VALUES(email), password=VALUES(password), role=VALUES(role),
        document=VALUES(document), document_type=VALUES(document_type), phone=VALUES(phone),
        account_type=VALUES(account_type), company_name=VALUES(company_name), logo_url=VALUES(logo_url),
        approval_status=VALUES(approval_status), verification_status=VALUES(verification_status),
        listing_limit_override=VALUES(listing_limit_override), marketplace_profile=VALUES(marketplace_profile), document_hash=VALUES(document_hash),
        updated_at=VALUES(updated_at)`,
      [
        user.id,
        user.name,
        user.email,
        hashPassword(user.password),
        user.role,
        encryptValue(user.document),
        user.documentType || null,
        encryptValue(user.phone),
        user.accountType || null,
        user.companyName || null,
        user.logoUrl || null,
        user.approvalStatus || "approved",
        user.verificationStatus || "unverified",
        typeof user.listingLimitOverride === "number" ? user.listingLimitOverride : null,
        user.marketplaceProfile || null,
        fingerprintValue(user.document, "user-document"),
        createdAt,
        updatedAt
      ]
    );
  }

  for (const event of events) {
    const createdAt = event.createdAt || nowIso();
    const updatedAt = event.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO events (id, slug, title, description, city, state, location, contact_name, contact_document, contact_phone, contact_phone_secondary, contact_email, start_at, end_at, status, recurrence, website_url, live_url, organizer_logo, cover_image, images, featured, featured_until, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), city=VALUES(city), state=VALUES(state), location=VALUES(location), contact_name=VALUES(contact_name), contact_document=VALUES(contact_document), contact_phone=VALUES(contact_phone), contact_phone_secondary=VALUES(contact_phone_secondary), contact_email=VALUES(contact_email), start_at=VALUES(start_at), end_at=VALUES(end_at), status=VALUES(status), recurrence=VALUES(recurrence), website_url=VALUES(website_url), live_url=VALUES(live_url), organizer_logo=VALUES(organizer_logo), cover_image=VALUES(cover_image), images=VALUES(images), featured=VALUES(featured), featured_until=VALUES(featured_until), created_by=VALUES(created_by), updated_at=VALUES(updated_at)`,
      [
        event.id,
        event.slug,
        event.title,
        event.description,
        event.city,
        event.state,
        event.location,
        event.contactName,
        encryptValue(event.contactDocument),
        encryptValue(event.contactPhone),
        encryptValue(event.contactPhoneSecondary),
        encryptValue(event.contactEmail),
        event.startAt,
        event.endAt || null,
        event.status,
        JSON.stringify(event.recurrence || { type: "single" }),
        event.websiteUrl || null,
        event.liveUrl || null,
        event.organizerLogo || null,
        event.coverImage || null,
        JSON.stringify(event.images || []),
        event.featured ? 1 : 0,
        event.featuredUntil || null,
        event.createdBy || "admin-default",
        createdAt,
        updatedAt
      ]
    );
  }

  for (const listing of listings) {
    const createdAt = listing.createdAt || nowIso();
    const updatedAt = listing.updatedAt || createdAt;
    const year = listing.year || listing.modelYear || listing.manufactureYear || 0;
    await pool.query(
      `INSERT INTO listings (id, slug, title, vehicle_type, description, make, model, model_year, manufacture_year, year, mileage, price, images, contact, specifications, status, featured, featured_until, created_by, document, document_hash, city, state, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), vehicle_type=VALUES(vehicle_type), description=VALUES(description), make=VALUES(make), model=VALUES(model), model_year=VALUES(model_year), manufacture_year=VALUES(manufacture_year), year=VALUES(year), mileage=VALUES(mileage), price=VALUES(price), images=VALUES(images), contact=VALUES(contact), specifications=VALUES(specifications), status=VALUES(status), featured=VALUES(featured), featured_until=VALUES(featured_until), created_by=VALUES(created_by), document=VALUES(document), document_hash=VALUES(document_hash), city=VALUES(city), state=VALUES(state), updated_at=VALUES(updated_at)`,
      [
        listing.id,
        listing.slug,
        listing.title,
        listing.vehicleType || "car",
        listing.description,
        listing.make,
        listing.model,
        listing.modelYear,
        listing.manufactureYear,
        year,
        listing.mileage,
        listing.price,
        JSON.stringify(listing.images || []),
        JSON.stringify({
          name: encryptValue(listing.contact?.name) || "",
          email: encryptValue(listing.contact?.email) || "",
          phone: encryptValue(listing.contact?.phone) || ""
        }),
        JSON.stringify(
          listing.specifications || {
            singleOwner: false,
            blackPlate: false,
            showPlate: true,
            auctionVehicle: false,
            ipvaPaid: false,
            vehicleStatus: "paid"
          }
        ),
        listing.status,
        listing.featured ? 1 : 0,
        listing.featuredUntil || null,
        listing.createdBy || "admin-default",
        encryptValue(listing.document) || "",
        fingerprintValue(listing.document, "listing-document"),
        listing.city,
        listing.state,
        createdAt,
        updatedAt
      ]
    );
  }

  for (const comment of comments) {
    const createdAt = comment.createdAt || nowIso();
    const updatedAt = comment.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO comments (id, listing_id, event_id, name, email, message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE listing_id=VALUES(listing_id), event_id=VALUES(event_id), name=VALUES(name), email=VALUES(email), message=VALUES(message), status=VALUES(status), updated_at=VALUES(updated_at)`,
      [
        comment.id,
        comment.listingId || null,
        comment.eventId || null,
        comment.name,
        comment.email,
        comment.message,
        comment.status,
        createdAt,
        updatedAt
      ]
    );
  }

  for (const banner of banners) {
    const createdAt = banner.createdAt || nowIso();
    const updatedAt = banner.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO banners (id, title, image, link, section, position, image_scale, image_position_x, image_position_y, status, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), image=VALUES(image), link=VALUES(link), section=VALUES(section), position=VALUES(position), image_scale=VALUES(image_scale), image_position_x=VALUES(image_position_x), image_position_y=VALUES(image_position_y), status=VALUES(status), start_date=VALUES(start_date), end_date=VALUES(end_date), updated_at=VALUES(updated_at)`,
      [
        banner.id,
        banner.title,
        banner.image,
        banner.link || null,
        banner.section,
        banner.position || 0,
        banner.imageScale || 100,
        banner.imagePositionX ?? 50,
        banner.imagePositionY ?? 50,
        banner.status || "active",
        banner.startDate,
        banner.endDate || null,
        createdAt,
        updatedAt
      ]
    );
  }

  for (const organizer of organizers) {
    const createdAt = organizer.createdAt || nowIso();
    const updatedAt = organizer.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO organizers (id, name, logo, alt_text, banner_top, link, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), logo=VALUES(logo), alt_text=VALUES(alt_text), banner_top=VALUES(banner_top), link=VALUES(link), updated_at=VALUES(updated_at)`,
      [
        organizer.id,
        organizer.name || "Organizador",
        organizer.logo,
        organizer.altText || null,
        organizer.bannerTop || null,
        organizer.link || null,
        createdAt,
        updatedAt
      ]
    );
  }

  for (const item of news) {
    const createdAt = item.createdAt || nowIso();
    const updatedAt = item.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO news (id, slug, title, content, excerpt, category, cover_image, author, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), content=VALUES(content), excerpt=VALUES(excerpt), category=VALUES(category), cover_image=VALUES(cover_image), author=VALUES(author), status=VALUES(status), updated_at=VALUES(updated_at)`,
      [
        item.id,
        item.slug,
        item.title,
        item.content,
        item.excerpt,
        item.category,
        item.coverImage,
        item.author,
        item.status,
        createdAt,
        updatedAt
      ]
    );
  }

  for (const past of pastEvents) {
    const createdAt = past.createdAt || nowIso();
    const updatedAt = past.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO past_events (id, event_id, slug, title, city, state, date, images, description, attendance, videos, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), city=VALUES(city), state=VALUES(state), date=VALUES(date), images=VALUES(images), description=VALUES(description), attendance=VALUES(attendance), videos=VALUES(videos), updated_at=VALUES(updated_at)`,
      [
        past.id,
        past.eventId || null,
        past.slug,
        past.title,
        past.city,
        past.state,
        past.date,
        JSON.stringify(past.images || []),
        past.description || null,
        past.attendance || null,
        JSON.stringify(past.videos || []),
        createdAt,
        updatedAt
      ]
    );
  }

  for (const item of messages) {
    const createdAt = item.createdAt || nowIso();
    const updatedAt = item.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO advertiser_messages (
        id, sender_user_id, sender_name, sender_email, sender_phone,
        recipient_user_id, listing_id, subject, message, status, created_at, updated_at
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        sender_user_id=VALUES(sender_user_id), sender_name=VALUES(sender_name), sender_email=VALUES(sender_email),
        sender_phone=VALUES(sender_phone), recipient_user_id=VALUES(recipient_user_id), listing_id=VALUES(listing_id),
        subject=VALUES(subject), message=VALUES(message), status=VALUES(status), updated_at=VALUES(updated_at)`,
      [
        item.id,
        item.senderUserId || null,
        encryptValue(item.senderName) || "",
        encryptValue(item.senderEmail) || "",
        encryptValue(item.senderPhone),
        item.recipientUserId,
        item.listingId || null,
        item.subject || null,
        encryptValue(item.message) || "",
        item.status,
        createdAt,
        updatedAt
      ]
    );
  }

  for (const item of metrics) {
    const createdAt = item.createdAt || nowIso();
    await pool.query(
      `INSERT INTO metric_events (id, event_type, entity_type, entity_id, owner_user_id, user_id, path, label, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE event_type=VALUES(event_type), entity_type=VALUES(entity_type), entity_id=VALUES(entity_id), owner_user_id=VALUES(owner_user_id), user_id=VALUES(user_id), path=VALUES(path), label=VALUES(label), metadata=VALUES(metadata), created_at=VALUES(created_at)`,
      [
        item.id,
        item.eventType,
        item.entityType,
        item.entityId || null,
        item.ownerUserId || null,
        item.userId || null,
        sanitizeMetricPath(item.path),
        sanitizeMetricLabel(item.label, item.eventType),
        JSON.stringify(sanitizeMetricMetadata(item.metadata)),
        createdAt
      ]
    );
  }

  if (settings) {
    await pool.query(
      "INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data=VALUES(data)",
      [JSON.stringify(settings)]
    );
  }

  if (vehicleCatalog?.brands) {
    for (const brand of vehicleCatalog.brands) {
      await pool.query(
        "INSERT INTO vehicle_brands (id, name, models) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), models=VALUES(models)",
        [brand.id, brand.name, JSON.stringify(brand.models || [])]
      );
    }
  }

  await pool.end();
  console.log("Seed finalizado.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
