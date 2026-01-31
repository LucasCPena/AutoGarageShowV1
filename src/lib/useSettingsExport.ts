"use client";

import { useCallback } from "react";

import { useSiteSettings } from "@/lib/useSiteSettings";
import { COMMENTS_STORAGE_KEY } from "@/lib/useComments";
import { LISTING_OVERRIDES_STORAGE_KEY } from "@/lib/useListingOverrides";
import { AUTH_STORAGE_KEY } from "@/lib/useAuth";

export function useSettingsExport() {
  const { settings } = useSiteSettings();

  const exportAll = useCallback(() => {
    const data = {
      siteSettings: settings,
      comments: localStorage.getItem(COMMENTS_STORAGE_KEY),
      listingOverrides: localStorage.getItem(LISTING_OVERRIDES_STORAGE_KEY),
      auth: localStorage.getItem(AUTH_STORAGE_KEY),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ags-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [settings]);

  const importAll = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.siteSettings) {
            // TODO: apply site settings via useSiteSettings setter
            console.warn("Import of siteSettings not implemented in this mock");
          }
          if (data.comments) {
            localStorage.setItem(COMMENTS_STORAGE_KEY, data.comments);
          }
          if (data.listingOverrides) {
            localStorage.setItem(LISTING_OVERRIDES_STORAGE_KEY, data.listingOverrides);
          }
          if (data.auth) {
            localStorage.setItem(AUTH_STORAGE_KEY, data.auth);
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }, []);

  return { exportAll, importAll };
}
