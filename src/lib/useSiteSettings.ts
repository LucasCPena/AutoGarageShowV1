"use client";

import { useCallback, useEffect, useState } from "react";

import {
  normalizeSiteSettings,
  type SiteSettings
} from "@/lib/siteSettings";

const STORAGE_KEY = "ags.siteSettings.v1";

function readFromStorage() {
  if (typeof window === "undefined") return normalizeSiteSettings(undefined);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeSiteSettings(undefined);
    return normalizeSiteSettings(JSON.parse(raw));
  } catch {
    return normalizeSiteSettings(undefined);
  }
}

function writeToStorage(settings: SiteSettings) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(() =>
    normalizeSiteSettings(undefined)
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSettings(readFromStorage());
    setIsReady(true);

    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setSettings(readFromStorage());
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveSettings = useCallback((next: SiteSettings) => {
    const normalized = normalizeSiteSettings(next);
    writeToStorage(normalized);
    setSettings(normalized);
  }, []);

  const resetSettings = useCallback(() => {
    removeFromStorage();
    setSettings(normalizeSiteSettings(undefined));
  }, []);

  return { settings, isReady, saveSettings, resetSettings };
}

export { STORAGE_KEY as SITE_SETTINGS_STORAGE_KEY };
