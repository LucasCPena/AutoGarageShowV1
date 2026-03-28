import { promises as fs } from "fs";
import path from "path";

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
  VehicleBrand,
} from "./database.types";
import { deepMerge } from "./deep-merge";
import {
  decryptSensitiveString,
  encryptSensitiveString,
  fingerprintSensitiveValue
} from "./secure-fields";
import {
  sanitizeMetricLabel,
  sanitizeMetricMetadata,
  sanitizeMetricPath
} from "./privacy";
import { normalizeUserRecord } from "./userProfiles";

const DATA_DIR = path.join(process.cwd(), "data");
async function readData<T>(filename: string): Promise<T[]> {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function readSingleData<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeData<T>(filename: string, data: T[]): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function writeSingleData<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

type StoredUser = User & { documentHash?: string | null };
type StoredListing = Listing & { documentHash?: string | null };

const DEFAULT_LISTING_CONTACT = {
  name: "",
  email: "",
  phone: ""
};

function areSameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toStoredUser(user: User): StoredUser {
  const normalized = normalizeUserRecord(user);
  return {
    ...normalized,
    document: encryptSensitiveString(normalized.document) ?? undefined,
    phone: encryptSensitiveString(normalized.phone) ?? undefined,
    documentHash: fingerprintSensitiveValue(normalized.document, "user-document")
  };
}

function fromStoredUser(user: StoredUser): User {
  return normalizeUserRecord({
    ...user,
    document: decryptSensitiveString(user.document),
    phone: decryptSensitiveString(user.phone)
  });
}

function toStoredEvent(event: Event): Event {
  return {
    ...event,
    contactDocument: encryptSensitiveString(event.contactDocument) ?? undefined,
    contactPhone: encryptSensitiveString(event.contactPhone) ?? undefined,
    contactPhoneSecondary: encryptSensitiveString(event.contactPhoneSecondary) ?? undefined,
    contactEmail: encryptSensitiveString(event.contactEmail) ?? undefined
  };
}

function fromStoredEvent(event: Event): Event {
  return {
    ...event,
    contactDocument: decryptSensitiveString(event.contactDocument),
    contactPhone: decryptSensitiveString(event.contactPhone),
    contactPhoneSecondary: decryptSensitiveString(event.contactPhoneSecondary),
    contactEmail: decryptSensitiveString(event.contactEmail)
  };
}

function toStoredListing(listing: Listing): StoredListing {
  return {
    ...listing,
    document: encryptSensitiveString(listing.document) ?? listing.document,
    documentHash: fingerprintSensitiveValue(listing.document, "listing-document"),
    contact: {
      name: encryptSensitiveString(listing.contact?.name) ?? "",
      email: encryptSensitiveString(listing.contact?.email) ?? "",
      phone: encryptSensitiveString(listing.contact?.phone) ?? ""
    }
  };
}

function fromStoredListing(listing: StoredListing): Listing {
  return {
    ...listing,
    document: decryptSensitiveString(listing.document) ?? "",
    contact: {
      name: decryptSensitiveString(listing.contact?.name) ?? "",
      email: decryptSensitiveString(listing.contact?.email) ?? "",
      phone: decryptSensitiveString(listing.contact?.phone) ?? ""
    }
  };
}

function toStoredMessage(message: AdvertiserMessage): AdvertiserMessage {
  return {
    ...message,
    senderName: encryptSensitiveString(message.senderName) ?? "",
    senderEmail: encryptSensitiveString(message.senderEmail) ?? "",
    senderPhone: encryptSensitiveString(message.senderPhone) ?? undefined,
    message: encryptSensitiveString(message.message) ?? ""
  };
}

function fromStoredMessage(message: AdvertiserMessage): AdvertiserMessage {
  return {
    ...message,
    senderName: decryptSensitiveString(message.senderName) ?? "",
    senderEmail: decryptSensitiveString(message.senderEmail) ?? "",
    senderPhone: decryptSensitiveString(message.senderPhone) ?? undefined,
    message: decryptSensitiveString(message.message) ?? ""
  };
}

function toStoredMetric(event: MetricEvent): MetricEvent {
  return {
    ...event,
    path: sanitizeMetricPath(event.path),
    label: sanitizeMetricLabel(event.label, event.eventType),
    metadata: sanitizeMetricMetadata(event.metadata)
  };
}

function toStoredAudit(event: AuditEvent): AuditEvent {
  return {
    ...event,
    path: event.path ? sanitizeMetricPath(event.path) : undefined,
    metadata: sanitizeMetricMetadata(event.metadata)
  };
}

async function loadProtectedCollection<TStored, TRuntime>(
  filename: string,
  fromStored: (value: TStored) => TRuntime,
  toStored: (value: TRuntime) => TStored
) {
  const raw = await readData<TStored>(filename);
  const storedItems: TStored[] = [];
  const items: TRuntime[] = [];
  let changed = false;

  for (const rawItem of raw) {
    const runtimeItem = fromStored(rawItem);
    const storedItem = toStored(runtimeItem);
    items.push(runtimeItem);
    storedItems.push(storedItem);
    if (!areSameJson(rawItem, storedItem)) {
      changed = true;
    }
  }

  if (changed) {
    await writeData(filename, storedItems);
  }

  return { items, storedItems };
}

export const dbFile = {
  users: {
    getAll: async () => (await loadProtectedCollection<StoredUser, User>("users.json", fromStoredUser, toStoredUser)).items,
    findById: async (id: string) =>
      (await loadProtectedCollection<StoredUser, User>("users.json", fromStoredUser, toStoredUser)).items.find(
        (user) => user.id === id
      ),
    findByEmail: async (email: string) =>
      (await loadProtectedCollection<StoredUser, User>("users.json", fromStoredUser, toStoredUser)).items.find(
        (user) => user.email === email
      ),
    findByDocument: async (document: string) =>
      (await loadProtectedCollection<StoredUser, User>("users.json", fromStoredUser, toStoredUser)).items.find(
        (user) => user.document === document
      ),
    create: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newUser = normalizeUserRecord({
        ...user,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as User);
      const { storedItems } = await loadProtectedCollection<StoredUser, User>(
        "users.json",
        fromStoredUser,
        toStoredUser
      );
      storedItems.push(toStoredUser(newUser));
      await writeData('users.json', storedItems);
      return newUser;
    },
    update: async (id: string, updates: Partial<User>) => {
      const { items, storedItems } = await loadProtectedCollection<StoredUser, User>(
        "users.json",
        fromStoredUser,
        toStoredUser
      );
      const index = items.findIndex(u => u.id === id);
      if (index === -1) return null;
      const next = normalizeUserRecord({
        ...items[index],
        ...updates,
        updatedAt: new Date().toISOString()
      } as User);
      storedItems[index] = toStoredUser(next);
      await writeData('users.json', storedItems);
      return next;
    }
  },
  events: {
    getAll: async () => (await loadProtectedCollection<Event, Event>("events.json", fromStoredEvent, toStoredEvent)).items,
    findById: async (id: string) =>
      (await loadProtectedCollection<Event, Event>("events.json", fromStoredEvent, toStoredEvent)).items.find(
        (event) => event.id === id
      ),
    findBySlug: async (slug: string) =>
      (await loadProtectedCollection<Event, Event>("events.json", fromStoredEvent, toStoredEvent)).items.find(
        (event) => event.slug === slug
      ),
    create: async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newEvent: Event = {
        ...event,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const { storedItems } = await loadProtectedCollection<Event, Event>(
        "events.json",
        fromStoredEvent,
        toStoredEvent
      );
      storedItems.push(toStoredEvent(newEvent));
      await writeData('events.json', storedItems);
      return newEvent;
    },
    update: async (id: string, updates: Partial<Event>) => {
      const { items, storedItems } = await loadProtectedCollection<Event, Event>(
        "events.json",
        fromStoredEvent,
        toStoredEvent
      );
      const index = items.findIndex(e => e.id === id);
      if (index === -1) return null;
      const nextEvent: Event = {
        ...items[index],
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      storedItems[index] = toStoredEvent(nextEvent);
      await writeData('events.json', storedItems);
      return nextEvent;
    },
    delete: async (id: string) => {
      const { items, storedItems } = await loadProtectedCollection<Event, Event>(
        "events.json",
        fromStoredEvent,
        toStoredEvent
      );
      const filtered = storedItems.filter((_, index) => items[index]?.id !== id);
      await writeData('events.json', filtered);
      return true;
    }
  },
  pastEvents: {
    getAll: () => readData<PastEvent>('pastEvents.json'),
    findById: (id: string) => readData<PastEvent>('pastEvents.json').then(pastEvents => pastEvents.find(e => e.id === id)),
    findBySlug: (slug: string) => readData<PastEvent>('pastEvents.json').then(pastEvents => pastEvents.find(e => e.slug === slug)),
    findByEventId: (eventId: string) => readData<PastEvent>('pastEvents.json').then(pastEvents => pastEvents.find(e => e.eventId === eventId)),
    create: async (pastEvent: Omit<PastEvent, 'id' | 'createdAt'>) => {
      const pastEvents = await readData<PastEvent>('pastEvents.json');
      const newPastEvent: PastEvent = {
        ...pastEvent,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: pastEvent.updatedAt ?? new Date().toISOString()
      };
      pastEvents.push(newPastEvent);
      await writeData('pastEvents.json', pastEvents);
      return newPastEvent;
    },
    update: async (id: string, updates: Partial<PastEvent>) => {
      const pastEvents = await readData<PastEvent>('pastEvents.json');
      const index = pastEvents.findIndex(e => e.id === id);
      if (index === -1) return null;
      pastEvents[index] = {
        ...pastEvents[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await writeData('pastEvents.json', pastEvents);
      return pastEvents[index];
    }
  },
  listings: {
    getAll: async () =>
      (await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      )).items,
    findById: async (id: string) =>
      (await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      )).items.find((listing) => listing.id === id),
    findBySlug: async (slug: string) =>
      (await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      )).items.find((listing) => listing.slug === slug),
    findByUser: async (userId: string) =>
      (await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      )).items.filter((listing) => listing.createdBy === userId),
    findByDocument: async (document: string) =>
      (await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      )).items.filter((listing) => listing.document === document),
    getActiveCount: async (document: string) =>
      (await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      )).items.filter((listing) => listing.document === document && listing.status === 'active').length,
    create: async (listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newListing: Listing = {
        ...listing,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const { storedItems } = await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      );
      storedItems.push(toStoredListing({
        ...newListing,
        contact: {
          ...DEFAULT_LISTING_CONTACT,
          ...(newListing.contact || {})
        }
      }));
      await writeData('listings.json', storedItems);
      return newListing;
    },
    update: async (id: string, updates: Partial<Listing>) => {
      const { items, storedItems } = await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      );
      const index = items.findIndex(l => l.id === id);
      if (index === -1) return null;
      const nextListing: Listing = {
        ...items[index],
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      storedItems[index] = toStoredListing({
        ...nextListing,
        contact: {
          ...DEFAULT_LISTING_CONTACT,
          ...(nextListing.contact || {})
        }
      });
      await writeData('listings.json', storedItems);
      return nextListing;
    },
    delete: async (id: string) => {
      const { items, storedItems } = await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      );
      const filtered = storedItems.filter((_, index) => items[index]?.id !== id);
      await writeData('listings.json', filtered);
      return true;
    },
    updateFeaturedStatus: async () => {
      const { items } = await loadProtectedCollection<StoredListing, Listing>(
        "listings.json",
        fromStoredListing,
        toStoredListing
      );
      const now = new Date();
      
      for (const listing of items) {
        if (listing.featured && listing.featuredUntil && new Date(listing.featuredUntil) < now) {
          await dbFile.listings.update(listing.id, {
            featured: false,
            featuredUntil: undefined
          });
        }
      }
    }
  },
  comments: {
    getAll: () => readData<Comment>('comments.json'),
    findByListing: (listingId: string) => readData<Comment>('comments.json').then(comments => 
      comments.filter(c => c.listingId === listingId && c.status === 'approved')
    ),
    findByEvent: (eventId: string) => readData<Comment>('comments.json').then(comments => 
      comments.filter(c => c.eventId === eventId && c.status === 'approved')
    ),
    getPending: () => readData<Comment>('comments.json').then(comments => 
      comments.filter(c => c.status === 'pending')
    ),
    create: async (comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const comments = await readData<Comment>('comments.json');
      const newComment: Comment = {
        ...comment,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      comments.push(newComment);
      await writeData('comments.json', comments);
      return newComment;
    },
    update: async (id: string, updates: Partial<Comment>) => {
      const comments = await readData<Comment>('comments.json');
      const index = comments.findIndex(c => c.id === id);
      if (index === -1) return null;
      comments[index] = { 
        ...comments[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      await writeData('comments.json', comments);
      return comments[index];
    }
  },
  banners: {
    getAll: () => readData<Banner>('banners.json'),
    findBySection: (section: string) => readData<Banner>('banners.json').then(banners => 
      banners.filter(b => b.section === section && b.status === 'active')
    ),
    create: async (banner: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>) => {
      const banners = await readData<Banner>('banners.json');
      const newBanner: Banner = {
        ...banner,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      banners.push(newBanner);
      await writeData('banners.json', banners);
      return newBanner;
    },
    update: async (id: string, updates: Partial<Banner>) => {
      const banners = await readData<Banner>('banners.json');
      const index = banners.findIndex(b => b.id === id);
      if (index === -1) return null;
      banners[index] = { 
        ...banners[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      await writeData('banners.json', banners);
      return banners[index];
    },
    delete: async (id: string) => {
      const banners = await readData<Banner>('banners.json');
      const filtered = banners.filter(b => b.id !== id);
      await writeData('banners.json', filtered);
      return true;
    }
  },
  organizers: {
    getAll: () => readData<Organizer>('organizers.json'),
    findById: (id: string) =>
      readData<Organizer>('organizers.json').then((organizers) =>
        organizers.find((organizer) => organizer.id === id)
      ),
    create: async (organizer: Omit<Organizer, 'id' | 'createdAt' | 'updatedAt'>) => {
      const organizers = await readData<Organizer>('organizers.json');
      const now = new Date().toISOString();
      const newOrganizer: Organizer = {
        ...organizer,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      organizers.push(newOrganizer);
      await writeData('organizers.json', organizers);
      return newOrganizer;
    },
    update: async (id: string, updates: Partial<Organizer>) => {
      const organizers = await readData<Organizer>('organizers.json');
      const index = organizers.findIndex((organizer) => organizer.id === id);
      if (index === -1) return null;
      organizers[index] = {
        ...organizers[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await writeData('organizers.json', organizers);
      return organizers[index];
    },
    delete: async (id: string) => {
      const organizers = await readData<Organizer>('organizers.json');
      const filtered = organizers.filter((organizer) => organizer.id !== id);
      await writeData('organizers.json', filtered);
      return true;
    }
  },
  news: {
    getAll: () => readData<News>('news.json'),
    findById: (id: string) => readData<News>('news.json').then(news => news.find(n => n.id === id)),
    findBySlug: (slug: string) => readData<News>('news.json').then(news => news.find(n => n.slug === slug)),
    create: async (news: Omit<News, 'id' | 'createdAt' | 'updatedAt'>) => {
      const allNews = await readData<News>('news.json');
      const newNews: News = {
        ...news,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      allNews.push(newNews);
      await writeData('news.json', allNews);
      return newNews;
    },
    update: async (id: string, updates: Partial<News>) => {
      const allNews = await readData<News>('news.json');
      const index = allNews.findIndex(n => n.id === id);
      if (index === -1) return null;
      allNews[index] = { 
        ...allNews[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      await writeData('news.json', allNews);
      return allNews[index];
    },
    delete: async (id: string) => {
      const allNews = await readData<News>('news.json');
      const filtered = allNews.filter(n => n.id !== id);
      await writeData('news.json', filtered);
      return true;
    }
  },
  settings: {
    get: () => readSingleData<Settings>('settings.json'),
    update: async (settings: Partial<Settings>) => {
      const current = await readSingleData<Settings>('settings.json') || {} as Settings;
      const updated = deepMerge(current, settings);
      await writeSingleData('settings.json', updated);
      return updated;
    }
  },
  vehicleCatalog: {
    get: () => readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json'),
    getBrands: () => readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json').then(data => data?.brands || []),
    getModels: (brandId: string) => readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json').then(data => 
      data?.brands.find(b => b.id === brandId)?.models || []
    ),
    saveBrands: async (brands: VehicleBrand[]) => {
      await writeSingleData('vehicleCatalog.json', { brands });
      return brands;
    },
    upsertBrand: async (brand: VehicleBrand) => {
      const data = await readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json') || { brands: [] as VehicleBrand[] };
      const index = data.brands.findIndex((b) => b.id === brand.id);
      if (index >= 0) {
        data.brands[index] = {
          ...data.brands[index],
          ...brand,
          models: brand.models ?? data.brands[index].models
        };
      } else {
        data.brands.push({ ...brand, models: brand.models ?? [] });
      }
      await writeSingleData('vehicleCatalog.json', data);
      return data.brands;
    },
    addModel: async (brandId: string, model: string) => {
      const data = await readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json') || { brands: [] as VehicleBrand[] };
      const brand = data.brands.find((b) => b.id === brandId);
      if (!brand) return null;
      const normalized = model.trim();
      if (normalized && !brand.models.includes(normalized)) {
        brand.models.push(normalized);
        brand.models.sort((a, b) => a.localeCompare(b));
        await writeSingleData('vehicleCatalog.json', data);
      }
      return brand.models;
    },
    removeModel: async (brandId: string, model: string) => {
      const data = await readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json') || { brands: [] as VehicleBrand[] };
      const brand = data.brands.find((b) => b.id === brandId);
      if (!brand) return null;
      brand.models = brand.models.filter((m) => m !== model);
      await writeSingleData('vehicleCatalog.json', data);
      return brand.models;
    },
    deleteBrand: async (brandId: string) => {
      const data = await readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json') || { brands: [] as VehicleBrand[] };
      const next = data.brands.filter((b) => b.id !== brandId);
      await writeSingleData('vehicleCatalog.json', { brands: next });
      return next;
    }
  },
  messages: {
    getAll: async () =>
      (await loadProtectedCollection<AdvertiserMessage, AdvertiserMessage>(
        "messages.json",
        fromStoredMessage,
        toStoredMessage
      )).items,
    findByRecipientUser: async (userId: string) =>
      (await loadProtectedCollection<AdvertiserMessage, AdvertiserMessage>(
        "messages.json",
        fromStoredMessage,
        toStoredMessage
      )).items
        .filter((message) => message.recipientUserId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    create: async (message: Omit<AdvertiserMessage, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newMessage: AdvertiserMessage = {
        ...message,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const { storedItems } = await loadProtectedCollection<AdvertiserMessage, AdvertiserMessage>(
        "messages.json",
        fromStoredMessage,
        toStoredMessage
      );
      storedItems.push(toStoredMessage(newMessage));
      await writeData('messages.json', storedItems);
      return newMessage;
    },
    update: async (id: string, updates: Partial<AdvertiserMessage>) => {
      const { items, storedItems } = await loadProtectedCollection<
        AdvertiserMessage,
        AdvertiserMessage
      >("messages.json", fromStoredMessage, toStoredMessage);
      const index = items.findIndex((message) => message.id === id);
      if (index === -1) return null;
      const nextMessage: AdvertiserMessage = {
        ...items[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      storedItems[index] = toStoredMessage(nextMessage);
      await writeData('messages.json', storedItems);
      return nextMessage;
    }
  },
  metrics: {
    getAll: async () =>
      (await loadProtectedCollection<MetricEvent, MetricEvent>(
        "metrics.json",
        (event) => event,
        toStoredMetric
      )).items,
    create: async (event: Omit<MetricEvent, 'id' | 'createdAt'>) => {
      const newEvent: MetricEvent = {
        ...event,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      const { storedItems } = await loadProtectedCollection<MetricEvent, MetricEvent>(
        "metrics.json",
        (item) => item,
        toStoredMetric
      );
      storedItems.push(toStoredMetric(newEvent));
      await writeData('metrics.json', storedItems);
      return toStoredMetric(newEvent);
    }
  },
  audit: {
    getAll: async () =>
      (await loadProtectedCollection<AuditEvent, AuditEvent>(
        "audit.json",
        (event) => event,
        toStoredAudit
      )).items,
    create: async (event: Omit<AuditEvent, "id" | "createdAt">) => {
      const newEvent: AuditEvent = {
        ...event,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      const { storedItems } = await loadProtectedCollection<AuditEvent, AuditEvent>(
        "audit.json",
        (item) => item,
        toStoredAudit
      );
      storedItems.push(toStoredAudit(newEvent));
      await writeData("audit.json", storedItems);
      return toStoredAudit(newEvent);
    }
  }
};

