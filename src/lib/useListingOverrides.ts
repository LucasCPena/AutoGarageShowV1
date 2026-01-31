"use client";

import { useCallback, useEffect, useState } from "react";

import type { ListingOverride, ListingOverrideMap } from "@/lib/listingOverrides";

const STORAGE_KEY = "ags.listingOverrides.v1";

function normalizeOverride(id: string, input: unknown): ListingOverride {
  const fallback: ListingOverride = { id };

  if (!input || typeof input !== "object") return fallback;

  const obj = input as Record<string, unknown>;

  const next: ListingOverride = {
    id
  };

  if (typeof obj.reactivatedAt === "string") {
    next.reactivatedAt = obj.reactivatedAt;
  }

  if (typeof obj.isFeatured === "boolean") {
    next.isFeatured = obj.isFeatured;
  }

  if (obj.featuredUntil === null) {
    next.featuredUntil = null;
  } else if (typeof obj.featuredUntil === "string") {
    next.featuredUntil = obj.featuredUntil;
  }

  return { ...fallback, ...next };
}

function normalizeOverrideMap(input: unknown): ListingOverrideMap {
  if (!input || typeof input !== "object") return {};

  const obj = input as Record<string, unknown>;
  const normalized: ListingOverrideMap = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!key) continue;
    normalized[key] = normalizeOverride(key, value);
  }

  return normalized;
}

function readFromStorage() {
  if (typeof window === "undefined") return {} as ListingOverrideMap;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return normalizeOverrideMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeToStorage(overrides: ListingOverrideMap) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    return;
  }
}

function removeFromStorage() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function useListingOverrides() {
  const [overrides, setOverrides] = useState<ListingOverrideMap>(() => ({}));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setOverrides(readFromStorage());
    setIsReady(true);

    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setOverrides(readFromStorage());
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setOverride = useCallback(
    (listingId: string, patch: Omit<ListingOverride, "id">) => {
      setOverrides((current) => {
        const next = normalizeOverrideMap({ ...current });
        const existing = next[listingId] ?? { id: listingId };
        next[listingId] = normalizeOverride(listingId, { ...existing, ...patch });
        writeToStorage(next);
        return next;
      });
    },
    []
  );

  const clearOverride = useCallback((listingId: string) => {
    setOverrides((current) => {
      const next = normalizeOverrideMap({ ...current });
      delete next[listingId];
      writeToStorage(next);
      return next;
    });
  }, []);

  const resetOverrides = useCallback(() => {
    removeFromStorage();
    setOverrides({});
  }, []);

  return {
    overrides,
    isReady,
    setOverride,
    clearOverride,
    resetOverrides
  };
}

export { STORAGE_KEY as LISTING_OVERRIDES_STORAGE_KEY };
