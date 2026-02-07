const fs = require("fs/promises");
const path = require("path");
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
  const news = (await readJson("news.json")) || [];
  const pastEvents = (await readJson("pastEvents.json")) || [];
  const settings = await readJson("settings.json");
  const vehicleCatalog = await readJson("vehicleCatalog.json");

  for (const user of users) {
    const createdAt = user.createdAt || nowIso();
    const updatedAt = user.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO users (id, name, email, password, role, document, phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), password=VALUES(password), role=VALUES(role), document=VALUES(document), phone=VALUES(phone), updated_at=VALUES(updated_at)`,
      [
        user.id,
        user.name,
        user.email,
        user.password,
        user.role,
        user.document || null,
        user.phone || null,
        createdAt,
        updatedAt
      ]
    );
  }

  for (const event of events) {
    const createdAt = event.createdAt || nowIso();
    const updatedAt = event.updatedAt || createdAt;
    await pool.query(
      `INSERT INTO events (id, slug, title, description, city, state, location, contact_name, contact_document, contact_phone, contact_email, start_at, end_at, status, recurrence, website_url, cover_image, images, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), city=VALUES(city), state=VALUES(state), location=VALUES(location), contact_name=VALUES(contact_name), contact_document=VALUES(contact_document), contact_phone=VALUES(contact_phone), contact_email=VALUES(contact_email), start_at=VALUES(start_at), end_at=VALUES(end_at), status=VALUES(status), recurrence=VALUES(recurrence), website_url=VALUES(website_url), cover_image=VALUES(cover_image), images=VALUES(images), created_by=VALUES(created_by), updated_at=VALUES(updated_at)`,
      [
        event.id,
        event.slug,
        event.title,
        event.description,
        event.city,
        event.state,
        event.location,
        event.contactName,
        event.contactDocument,
        event.contactPhone || null,
        event.contactEmail || null,
        event.startAt,
        event.endAt || null,
        event.status,
        JSON.stringify(event.recurrence || { type: "single" }),
        event.websiteUrl || null,
        event.coverImage || null,
        JSON.stringify(event.images || []),
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
      `INSERT INTO listings (id, slug, title, description, make, model, model_year, manufacture_year, year, mileage, price, images, contact, specifications, status, featured, featured_until, created_by, document, city, state, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), make=VALUES(make), model=VALUES(model), model_year=VALUES(model_year), manufacture_year=VALUES(manufacture_year), year=VALUES(year), mileage=VALUES(mileage), price=VALUES(price), images=VALUES(images), contact=VALUES(contact), specifications=VALUES(specifications), status=VALUES(status), featured=VALUES(featured), featured_until=VALUES(featured_until), created_by=VALUES(created_by), document=VALUES(document), city=VALUES(city), state=VALUES(state), updated_at=VALUES(updated_at)`,
      [
        listing.id,
        listing.slug,
        listing.title,
        listing.description,
        listing.make,
        listing.model,
        listing.modelYear,
        listing.manufactureYear,
        year,
        listing.mileage,
        listing.price,
        JSON.stringify(listing.images || []),
        JSON.stringify(listing.contact || { name: "", email: "", phone: "" }),
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
        listing.document || "",
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
      `INSERT INTO banners (id, title, image, link, section, position, status, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title=VALUES(title), image=VALUES(image), link=VALUES(link), section=VALUES(section), position=VALUES(position), status=VALUES(status), start_date=VALUES(start_date), end_date=VALUES(end_date), updated_at=VALUES(updated_at)`,
      [
        banner.id,
        banner.title,
        banner.image,
        banner.link || null,
        banner.section,
        banner.position || 0,
        banner.status || "active",
        banner.startDate,
        banner.endDate || null,
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
