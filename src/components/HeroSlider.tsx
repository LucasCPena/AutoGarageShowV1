"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { normalizeAssetReference } from "@/lib/site-url";

type EventItem = {
  id: string;
  slug: string;
  title: string;
  startAt?: string;
  featured?: boolean;
  featuredUntil?: string;
  coverImage?: string;
  images?: string[];
  status?: "pending" | "approved" | "completed";
};

type BannerItem = {
  id: string;
  title: string;
  image: string;
  link?: string;
  section: string;
  position: number;
  status: "active" | "inactive";
  startDate: string;
  endDate?: string;
};

type Slide = {
  id: string;
  title: string;
  image: string;
  link?: string;
  startAt?: string;
  position?: number;
  featuredRank?: number;
};

type Props = {
  section?: string;
  maxSlides?: number;
  autoPlayMs?: number;
};

function isBannerActiveNow(banner: BannerItem, now: number) {
  if (banner.status !== "active") return false;

  const start = new Date(banner.startDate).getTime();
  if (Number.isFinite(start) && start > now) return false;

  const end = banner.endDate ? new Date(banner.endDate).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isFinite(end) && end < now) return false;

  return true;
}

function isEventFeaturedActive(event: EventItem, now: number) {
  if (!event.featured) return false;
  if (!event.featuredUntil) return true;
  const until = new Date(event.featuredUntil).getTime();
  return Number.isFinite(until) ? until > now : true;
}

export default function HeroSlider({ section = "home", maxSlides = 3, autoPlayMs = 5000 }: Props) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch(`/api/banners?section=${encodeURIComponent(section)}`)
      .then((res) => res.json())
      .then((data) => setBanners(Array.isArray(data.banners) ? data.banners : []))
      .catch(() => setBanners([]));
  }, [section]);

  useEffect(() => {
    if (section === "home") {
      setEvents([]);
      return;
    }

    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]));
  }, [section]);

  const slides = useMemo(() => {
    const now = Date.now();

    const bannerSlides = banners
      .filter((banner) => banner.section === section && isBannerActiveNow(banner, now))
      .sort((a, b) => {
        const byPosition = (a.position ?? 0) - (b.position ?? 0);
        if (byPosition !== 0) return byPosition;

        const aStart = new Date(a.startDate).getTime();
        const bStart = new Date(b.startDate).getTime();
        return bStart - aStart;
      })
      .map((banner) => {
        const image = normalizeAssetReference(banner.image);
        if (!image) return null;
        return {
          id: banner.id,
          title: banner.title,
          image,
          link: banner.link,
          startAt: banner.startDate,
          position: banner.position
        } as Slide;
      })
      .filter((slide): slide is Slide => Boolean(slide))
      .slice(0, maxSlides) as Slide[];

    if (bannerSlides.length > 0) return bannerSlides;
    if (section === "home") return [];

    return events
      .filter((event) => !event.status || event.status === "approved")
      .map((event) => {
        const image = normalizeAssetReference(event.coverImage || event.images?.[0]);
        if (!image) return null;
        return {
          id: event.id,
          title: event.title,
          image,
          link: `/eventos/${event.slug}`,
          startAt: event.startAt,
          featuredRank: isEventFeaturedActive(event, now) ? 1 : 0
        } as Slide;
      })
      .filter((slide): slide is Slide => Boolean(slide))
      .sort((a, b) => {
        const aFeatured = a.featuredRank ?? 0;
        const bFeatured = b.featuredRank ?? 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;

        const aTime = a?.startAt ? new Date(a.startAt).getTime() : 0;
        const bTime = b?.startAt ? new Date(b.startAt).getTime() : 0;
        return aTime - bTime;
      })
      .slice(0, maxSlides) as Slide[];
  }, [banners, events, maxSlides, section]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, autoPlayMs);
    return () => clearInterval(id);
  }, [slides, autoPlayMs]);

  useEffect(() => {
    if (current >= slides.length) {
      setCurrent(0);
    }
  }, [current, slides.length]);

  const activeSlide = slides[current] ?? slides[0];

  if (!activeSlide) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
      <div
        className="relative h-64 w-full sm:h-80"
        style={{
          backgroundImage: `url(${activeSlide.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 to-slate-900/20" />
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="text-sm uppercase tracking-wide text-slate-200">Destaque</div>
          <h3 className="text-2xl font-bold">{activeSlide.title}</h3>
          {activeSlide.link ? (
            <Link
              href={activeSlide.link}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Ver detalhes
            </Link>
          ) : null}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 w-2 rounded-full ${i === current ? "bg-white" : "bg-white/60"}`}
            aria-label={`Ir para slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="absolute inset-y-0 left-2 flex items-center">
        <button
          onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
          className="h-8 w-8 rounded-full bg-white/80 text-slate-800 shadow hover:bg-white"
          aria-label="Anterior"
        >
          {"<"}
        </button>
      </div>
      <div className="absolute inset-y-0 right-2 flex items-center">
        <button
          onClick={() => setCurrent((c) => (c + 1) % slides.length)}
          className="h-8 w-8 rounded-full bg-white/80 text-slate-800 shadow hover:bg-white"
          aria-label="Proximo"
        >
          {">"}
        </button>
      </div>
    </div>
  );
}
