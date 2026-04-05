import { db, type Event, type Listing, type News, type User } from "@/lib/database";
import { attachListingOwnerProfiles } from "@/lib/listingOwners";
import { isCompanyAccount, normalizeUserRecord } from "@/lib/userProfiles";

export type SearchResultType = "listing" | "event" | "news" | "company";

export type SearchResultItem = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  image?: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesQuery(parts: Array<string | undefined>, query: string) {
  const haystack = normalizeText(parts.filter(Boolean).join(" "));
  return haystack.includes(normalizeText(query));
}

function isVisibleListing(listing: Listing) {
  return listing.status === "approved" || listing.status === "active";
}

function isVisibleNews(item: News) {
  return item.status === "published";
}

function isVisibleEvent(item: Event) {
  return item.status === "approved" || item.status === "completed";
}

function isVisibleCompany(user: User) {
  const normalized = normalizeUserRecord(user);
  return isCompanyAccount(normalized) && normalized.approvalStatus !== "pending";
}

export async function searchSiteContent(query: string, filter: SearchResultType | "all" = "all") {
  const term = query.trim();
  if (!term) return [] as SearchResultItem[];

  const [listingsRaw, events, news, users] = await Promise.all([
    db.listings.getAll(),
    db.events.getAll(),
    db.news.getAll(),
    db.users.getAll()
  ]);

  const listings = await attachListingOwnerProfiles(listingsRaw);
  const items: SearchResultItem[] = [];

  if (filter === "all" || filter === "listing") {
    items.push(
      ...listings
        .filter(isVisibleListing)
        .filter((listing) =>
          matchesQuery(
            [
              listing.title,
              listing.make,
              listing.model,
              listing.description,
              listing.ownerProfile?.displayName,
              listing.ownerProfile?.companyName
            ],
            term
          )
        )
        .map((listing) => ({
          id: listing.id,
          type: "listing" as const,
          title: listing.title,
          subtitle: `${listing.make} ${listing.model} | ${listing.city}/${listing.state}`,
          href: `/veiculos/${listing.slug}`,
          image: listing.images?.[0]
        }))
    );
  }

  if (filter === "all" || filter === "event") {
    items.push(
      ...events
        .filter(isVisibleEvent)
        .filter((event) =>
          matchesQuery([event.title, event.description, event.city, event.location], term)
        )
        .map((event) => ({
          id: event.id,
          type: "event" as const,
          title: event.title,
          subtitle: `${event.city}/${event.state} | ${event.location}`,
          href: `/eventos/${event.slug}`,
          image: event.coverImage || event.images?.[0]
        }))
    );
  }

  if (filter === "all" || filter === "news") {
    items.push(
      ...news
        .filter(isVisibleNews)
        .filter((item) => matchesQuery([item.title, item.excerpt, item.content], term))
        .map((item) => ({
          id: item.id,
          type: "news" as const,
          title: item.title,
          subtitle: item.excerpt,
          href: `/noticias/${item.slug}`,
          image: item.coverImage
        }))
    );
  }

  if (filter === "all" || filter === "company") {
    items.push(
      ...users
        .filter(isVisibleCompany)
        .filter((user) => matchesQuery([user.companyName, user.name], term))
        .map((user) => {
          const normalized = normalizeUserRecord(user);
          const isServiceProvider = normalized.marketplaceProfile === "services";

          return {
            id: user.id,
            type: "company" as const,
            title: user.companyName || user.name,
            subtitle: isServiceProvider
              ? normalized.activityType || "Prestador de servicos"
              : user.accountType === "agency"
                ? "Agencia"
                : "Empresa anunciante",
            href: isServiceProvider ? `/servicos/${user.id}` : `/empresas/${user.id}`,
            image: user.logoUrl
          };
        })
    );
  }

  return items.slice(0, 60);
}
