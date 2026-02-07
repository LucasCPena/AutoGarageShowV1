export type ListingOverride = {
  id: string;
  reactivatedAt?: string;
  isFeatured?: boolean;
  featuredUntil?: string | null;
};

export type ListingOverrideMap = Record<string, ListingOverride | undefined>;

type OverrideableListing = {
  id: string;
  createdAt: string;
  featured: boolean;
  featuredUntil?: string;
};

export function applyListingOverride<T extends OverrideableListing>(
  listing: T,
  override?: ListingOverride
): T {
  if (!override) return listing;

  const next: T = {
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

export function applyListingOverrides<T extends OverrideableListing>(
  listings: T[],
  overrides: ListingOverrideMap
): T[] {
  return listings.map((listing) => applyListingOverride(listing, overrides[listing.id]));
}
