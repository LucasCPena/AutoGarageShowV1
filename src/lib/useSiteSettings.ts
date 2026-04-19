"use client";

import { useCallback, useEffect, useState } from "react";

import {
  buildSiteSettingsUpdate,
  defaultSiteSettings,
  normalizeSiteSettings,
  type SiteSettings
} from "@/lib/siteSettings";

export const SITE_SETTINGS_EVENT = "ags-site-settings-update";

async function fetchSettingsFromApi() {
  const response = await fetch("/api/settings", {
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" && data.error
        ? data.error
        : "Não foi possível carregar configurações."
    );
  }

  return normalizeSiteSettings(data?.settings);
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(() =>
    defaultSiteSettings
  );
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadSettings = useCallback(async () => {
    try {
      const next = await fetchSettingsFromApi();
      setSettings(next);
      setError(null);
    } catch (loadError) {
      setSettings(defaultSiteSettings);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar configurações."
      );
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    reloadSettings();

    function onSettingsUpdated() {
      reloadSettings();
    }

    window.addEventListener(SITE_SETTINGS_EVENT, onSettingsUpdated);
    return () => window.removeEventListener(SITE_SETTINGS_EVENT, onSettingsUpdated);
  }, [reloadSettings]);

  const saveSettings = useCallback(
    async (next: SiteSettings, token?: string | null) => {
      if (!token) {
        throw new Error("Sessão expirada. Faça login novamente como admin.");
      }

      const normalized = normalizeSiteSettings(next);
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(buildSiteSettingsUpdate(normalized))
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" && data.error
            ? data.error
            : "Não foi possível salvar configurações."
        );
      }

      const savedSettings = normalizeSiteSettings(data?.settings);
      setSettings(savedSettings);
      setError(null);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(SITE_SETTINGS_EVENT));
      }

      return savedSettings;
    },
    []
  );

  const resetSettings = useCallback(
    async (token?: string | null) => saveSettings(defaultSiteSettings, token),
    [saveSettings]
  );

  return { settings, isReady, error, reloadSettings, saveSettings, resetSettings };
}
