import type { Event } from "@/lib/database";
import type { NewsArticle } from "@/lib/mockData";

const siteUrl = "https://autogarageshow.com.br";

function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl}${path}`;
}

export function eventJsonLd(event: Event) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startAt,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: event.location,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city,
        addressRegion: event.state,
        addressCountry: "BR"
      }
    },
    url: absoluteUrl(`/eventos/${event.slug}`)
  };
}

type ListingJsonLdInput = {
  title: string;
  make: string;
  model: string;
  year?: number;
  modelYear?: number;
  description: string;
  images: string[];
  price: number;
  slug: string;
};

export function listingJsonLd(listing: ListingJsonLdInput) {
  const yearValue = listing.year ?? listing.modelYear ?? new Date().getFullYear();
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: listing.title,
    brand: {
      "@type": "Brand",
      name: listing.make
    },
    model: listing.model,
    vehicleModelDate: String(yearValue),
    description: listing.description,
    image: listing.images.map((img) => absoluteUrl(img)),
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: listing.price,
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/classificados/${listing.slug}`)
    }
  };
}

export function newsJsonLd(article: NewsArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    articleSection: article.category,
    image: [absoluteUrl(article.coverImage)],
    mainEntityOfPage: absoluteUrl(`/noticias/${article.slug}`)
  };
}
