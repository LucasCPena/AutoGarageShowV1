"use client";

import { useEffect, useMemo, useState } from "react";

import { normalizeAssetReference } from "@/lib/site-url";

type Banner = {
  id: string;
  title: string;
  image: string;
  link?: string;
  section: string;
  position: number;
  status: "active" | "inactive";
  startDate: string;
  endDate?: string;
  updatedAt?: string;
};

type Props = {
  title?: string;
  maxVisible?: number;
  rotationMs?: number;
};

function isBannerActiveNow(banner: Banner, now: number) {
  if (banner.status !== "active") return false;

  const start = new Date(banner.startDate).getTime();
  if (Number.isFinite(start) && start > now) return false;

  const end = banner.endDate ? new Date(banner.endDate).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isFinite(end) && end < now) return false;

  return true;
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export default function SidebarBannerStack({
  title = "Publicidade",
  maxVisible = 5,
  rotationMs = 12000
}: Props) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [rotationKey, setRotationKey] = useState(0);

  useEffect(() => {
    fetch("/api/banners?section=sidebar", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setBanners(Array.isArray(data.banners) ? data.banners : []);
      })
      .catch(() => setBanners([]));
  }, []);

  const activeBanners = useMemo(() => {
    const now = Date.now();
    return banners
      .filter((banner) => isBannerActiveNow(banner, now))
      .sort((a, b) => {
        const byPosition = (a.position ?? 0) - (b.position ?? 0);
        if (byPosition !== 0) return byPosition;

        const aUpdated = new Date(a.updatedAt || a.startDate).getTime();
        const bUpdated = new Date(b.updatedAt || b.startDate).getTime();
        return bUpdated - aUpdated;
      });
  }, [banners]);

  useEffect(() => {
    if (activeBanners.length <= maxVisible) return;

    const id = window.setInterval(() => {
      setRotationKey((current) => current + 1);
    }, rotationMs);

    return () => window.clearInterval(id);
  }, [activeBanners.length, maxVisible, rotationMs]);

  const visibleBanners = useMemo(() => {
    if (activeBanners.length <= maxVisible) return activeBanners;
    return shuffle(activeBanners).slice(0, maxVisible);
  }, [activeBanners, maxVisible, rotationKey]);

  if (visibleBanners.length === 0) {
    return null;
  }

  return (
    <aside className="grid gap-3">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>

      {visibleBanners.map((banner) => {
        const image = normalizeAssetReference(banner.image);
        if (!image) return null;

        const content = (
          <>
            <img
              src={image}
              alt={banner.title}
              className="h-44 w-full object-cover"
            />
            <div className="p-3 text-sm font-semibold text-slate-900">{banner.title}</div>
          </>
        );

        if (!banner.link) {
          return (
            <div
              key={banner.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {content}
            </div>
          );
        }

        return (
          <a
            key={banner.id}
            href={banner.link}
            className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300"
            target={banner.link.startsWith("/") ? undefined : "_blank"}
            rel={banner.link.startsWith("/") ? undefined : "noreferrer noopener"}
          >
            {content}
          </a>
        );
      })}
    </aside>
  );
}
