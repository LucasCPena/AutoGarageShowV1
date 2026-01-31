import type { Listing } from "@/lib/mockData";

export type ListingOverride = {
  id: string;
  reactivatedAt?: string;
  isFeatured?: boolean;
  featuredUntil?: string | null;
};

export type ListingOverrideMap = Record<string, ListingOverride | undefined>;

export function applyListingOverride(listing: Listing, override?: ListingOverride): Listing {
  if (!override) return listing;

  const next: Listing = {
    ...listing
  };

  if (override.reactivatedAt) {
    next.createdAt = override.reactivatedAt;
  }

  if (typeof override.isFeatured === "boolean") {
    next.featured = override.isFeatured;
  }

  if (override.featuredUntil === null) {
    next.featuredUntil = undefined;
  } else if (typeof override.featuredUntil === "string") {
    next.featuredUntil = override.featuredUntil;
  }

  return next;
}

export function applyListingOverrides(
  listings: Listing[],
  overrides: ListingOverrideMap
): Listing[] {
  return listings.map((listing) => applyListingOverride(listing, overrides[listing.id]));
}
