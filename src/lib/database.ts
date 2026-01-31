import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  document?: string; // CPF ou CNPJ
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventRecurrence {
  type: 'single' | 'weekly' | 'monthly' | 'annual' | 'specific';
  dayOfWeek?: number; // 0=Sunday..6=Saturday
  dayOfMonth?: number; // 1..31
  month?: number; // 1..12
  day?: number; // 1..31
  generateWeeks?: number;
  generateMonths?: number;
  generateYears?: number;
  dates?: string[]; // ISO dates
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  city: string;
  state: string;
  location: string;
  startAt: string;
  endAt?: string;
  status: 'pending' | 'approved' | 'completed';
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
    vehicleStatus: 'paid' | 'alienated';
  };
  status: 'pending' | 'approved' | 'active' | 'inactive' | 'sold' | 'rejected';
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
  status: 'pending' | 'approved' | 'rejected';
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
  status: 'active' | 'inactive';
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
  category: 'eventos' | 'classificados' | 'geral' | 'dicas';
  coverImage: string;
  author: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

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

export const db = {
  users: {
    getAll: () => readData<User>('users.json'),
    findById: (id: string) => readData<User>('users.json').then(users => users.find(u => u.id === id)),
    findByEmail: (email: string) => readData<User>('users.json').then(users => users.find(u => u.email === email)),
    findByDocument: (document: string) => readData<User>('users.json').then(users => users.find(u => u.document === document)),
    create: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
      const users = await readData<User>('users.json');
      const newUser: User = {
        ...user,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      users.push(newUser);
      await writeData('users.json', users);
      return newUser;
    },
    update: async (id: string, updates: Partial<User>) => {
      const users = await readData<User>('users.json');
      const index = users.findIndex(u => u.id === id);
      if (index === -1) return null;
      users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
      await writeData('users.json', users);
      return users[index];
    }
  },
  events: {
    getAll: () => readData<Event>('events.json'),
    findById: (id: string) => readData<Event>('events.json').then(events => events.find(e => e.id === id)),
    findBySlug: (slug: string) => readData<Event>('events.json').then(events => events.find(e => e.slug === slug)),
    create: async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
      const events = await readData<Event>('events.json');
      const newEvent: Event = {
        ...event,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      events.push(newEvent);
      await writeData('events.json', events);
      return newEvent;
    },
    update: async (id: string, updates: Partial<Event>) => {
      const events = await readData<Event>('events.json');
      const index = events.findIndex(e => e.id === id);
      if (index === -1) return null;
      events[index] = { 
        ...events[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      await writeData('events.json', events);
      return events[index];
    },
    delete: async (id: string) => {
      const events = await readData<Event>('events.json');
      const filtered = events.filter(e => e.id !== id);
      await writeData('events.json', filtered);
      return true;
    }
  },
  pastEvents: {
    getAll: () => readData<PastEvent>('pastEvents.json'),
    create: async (pastEvent: Omit<PastEvent, 'id' | 'createdAt'>) => {
      const pastEvents = await readData<PastEvent>('pastEvents.json');
      const newPastEvent: PastEvent = {
        ...pastEvent,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
      };
      pastEvents.push(newPastEvent);
      await writeData('pastEvents.json', pastEvents);
      return newPastEvent;
    }
  },
  listings: {
    getAll: () => readData<Listing>('listings.json'),
    findById: (id: string) => readData<Listing>('listings.json').then(listings => listings.find(l => l.id === id)),
    findBySlug: (slug: string) => readData<Listing>('listings.json').then(listings => listings.find(l => l.slug === slug)),
    findByUser: (userId: string) => readData<Listing>('listings.json').then(listings => listings.filter(l => l.createdBy === userId)),
    findByDocument: (document: string) => readData<Listing>('listings.json').then(listings => listings.filter(l => l.document === document)),
    getActiveCount: (document: string) => readData<Listing>('listings.json').then(listings => 
      listings.filter(l => l.document === document && l.status === 'active').length
    ),
    create: async (listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => {
      const listings = await readData<Listing>('listings.json');
      const newListing: Listing = {
        ...listing,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      listings.push(newListing);
      await writeData('listings.json', listings);
      return newListing;
    },
    update: async (id: string, updates: Partial<Listing>) => {
      const listings = await readData<Listing>('listings.json');
      const index = listings.findIndex(l => l.id === id);
      if (index === -1) return null;
      listings[index] = { 
        ...listings[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      await writeData('listings.json', listings);
      return listings[index];
    },
    delete: async (id: string) => {
      const listings = await readData<Listing>('listings.json');
      const filtered = listings.filter(l => l.id !== id);
      await writeData('listings.json', filtered);
      return true;
    },
    updateFeaturedStatus: async () => {
      const listings = await readData<Listing>('listings.json');
      const now = new Date();
      
      listings.forEach(listing => {
        if (listing.featured && listing.featuredUntil && new Date(listing.featuredUntil) < now) {
          listing.featured = false;
          listing.featuredUntil = undefined;
        }
      });
      
      await writeData('listings.json', listings);
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
      const updated = { ...current, ...settings };
      await writeSingleData('settings.json', updated);
      return updated;
    }
  },
  vehicleCatalog: {
    get: () => readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json'),
    getBrands: () => readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json').then(data => data?.brands || []),
    getModels: (brandId: string) => readSingleData<{ brands: VehicleBrand[] }>('vehicleCatalog.json').then(data => 
      data?.brands.find(b => b.id === brandId)?.models || []
    )
  }
};
