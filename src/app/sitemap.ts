import type { MetadataRoute } from "next";

import { db } from "@/lib/database";
import { listings, news, pastEvents } from "@/lib/mockData";
import { siteUrl } from "@/lib/site-url";

const baseUrl = siteUrl;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const events = await db.events.getAll();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${baseUrl}/eventos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${baseUrl}/realizados`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: `${baseUrl}/classificados`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${baseUrl}/noticias`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8
    }
  ];

  const eventRoutes: MetadataRoute.Sitemap = events
    .filter((e) => e.status === "approved")
    .map((e) => ({
      url: `${baseUrl}/eventos/${e.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    }));

  const pastRoutes: MetadataRoute.Sitemap = pastEvents.map((p) => ({
    url: `${baseUrl}/realizados/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6
  }));

  const listingRoutes: MetadataRoute.Sitemap = listings
    .filter((l) => l.status === "approved")
    .map((l) => ({
      url: `${baseUrl}/classificados/${l.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    }));

  const newsRoutes: MetadataRoute.Sitemap = news.map((n) => ({
    url: `${baseUrl}/noticias/${n.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  return [...staticRoutes, ...eventRoutes, ...pastRoutes, ...listingRoutes, ...newsRoutes];
}
