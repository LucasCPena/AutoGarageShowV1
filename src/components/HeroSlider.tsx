"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { normalizeAssetReference } from "@/lib/site-url";

type EventItem = {
  id: string;
  slug: string;
  title: string;
  startAt?: string;
  coverImage?: string;
  images?: string[];
  status?: "pending" | "approved" | "completed";
};

type EventSlide = {
  id: string;
  title: string;
  image: string;
  link: string;
  startAt?: string;
};

type Props = {
  section?: string;
  maxSlides?: number;
  autoPlayMs?: number;
};

export default function HeroSlider({ section = "home", maxSlides = 3, autoPlayMs = 5000 }: Props) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => setEvents([]));
  }, []);

  const slides = useMemo(() => {
    const now = Date.now();
    const filtered = events.filter((event) => {
      if (event.status && event.status !== "approved") return false;
      if (section === "home" && event.startAt) {
        const time = new Date(event.startAt).getTime();
        if (Number.isFinite(time)) return time >= now;
      }
      return true;
    });

    return filtered
      .map((event) => {
        const image = normalizeAssetReference(event.coverImage || event.images?.[0]);
        if (!image) return null;
        return {
          id: event.id,
          title: event.title,
          image,
          link: `/eventos/${event.slug}`,
          startAt: event.startAt
        } as EventSlide;
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a?.startAt ? new Date(a.startAt).getTime() : 0;
        const bTime = b?.startAt ? new Date(b.startAt).getTime() : 0;
        return aTime - bTime;
      })
      .slice(0, maxSlides) as EventSlide[];
  }, [events, maxSlides, section]);

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
        className="relative h-64 sm:h-80 w-full"
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
          <Link
            href={activeSlide.link}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Ver detalhes
          </Link>
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
          ‹
        </button>
      </div>
      <div className="absolute inset-y-0 right-2 flex items-center">
        <button
          onClick={() => setCurrent((c) => (c + 1) % slides.length)}
          className="h-8 w-8 rounded-full bg-white/80 text-slate-800 shadow hover:bg-white"
          aria-label="Próximo"
        >
          ›
        </button>
      </div>
    </div>
  );
}
