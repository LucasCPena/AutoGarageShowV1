import type { Listing, User } from "@/lib/database";
import { db } from "@/lib/database";
import { isCompanyAccount, toListingOwnerProfile } from "@/lib/userProfiles";

export async function attachListingOwnerProfiles<T extends Listing>(listings: T[]) {
  if (listings.length === 0) return listings;

  const userIds = Array.from(
    new Set(
      listings
        .map((listing) => listing.createdBy)
        .filter((value): value is string => typeof value === "string" && Boolean(value))
    )
  );

  if (userIds.length === 0) return listings;

  const users = await db.users.getAll();
  const byId = new Map(users.map((user) => [user.id, user]));

  return listings.map((listing) => ({
    ...listing,
    ownerProfile: toListingOwnerProfile(byId.get(listing.createdBy))
  }));
}

export function canExposeListingCompany(user: User | null | undefined) {
  return Boolean(user && isCompanyAccount(user));
}

