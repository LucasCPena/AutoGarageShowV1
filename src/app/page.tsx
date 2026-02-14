"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/Container";
import type { EventRecurrence } from "@/lib/database";
import { formatDateLong, formatDateShort } from "@/lib/date";
import { formatCurrencyBRL } from "@/lib/format";
import { fetchJson } from "@/lib/fetch-json";
import CalendarWidget from "@/components/CalendarWidget";
import { generateEventOccurrences } from "@/lib/eventRecurrence";
import HeroSlider from "@/components/HeroSlider";

interface HomeConfig {
  heroTitle: string;
  heroSubtitle: string;
  youtubeEmbedUrl?: string;
  showUpcomingEvents: boolean;
  showFeaturedListings: boolean;
  showLatestListings: boolean;
  showLatestNews: boolean;
  bannerTitle?: string;
  bannerImage?: string;
  bannerLink?: string;
}

interface Event {
  id: string;
  slug: string;
  title: string;
  description: string;
  city: string;
  state: string;
  location: string;
  contactName: string;
  contactDocument?: string;
  contactPhone?: string;
  contactEmail?: string;
  startAt: string;
  endAt?: string;
  status: 'pending' | 'approved' | 'completed';
  recurrence: EventRecurrence;
}

interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  make: string;
  model: string;
  modelYear: number;
  manufactureYear: number;
  year: number;
  mileage: number;
  price: number;
  images: string[];
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  specifications: {
    singleOwner: boolean;
    blackPlate: boolean;
    showPlate: boolean;
    auctionVehicle: boolean;
    ipvaPaid: boolean;
    vehicleStatus: 'paid' | 'alienated';
  };
  status: 'pending' | 'approved' | 'active' | 'inactive' | 'sold' | 'rejected';
  featured: boolean;
  featuredUntil?: string;
  createdAt: string;
  updatedAt: string;
  city: string;
  state: string;
}

interface News {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: 'eventos' | 'classificados' | 'geral' | 'dicas';
  coverImage: string;
  author: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

interface Banner {
  id: string;
  title: string;
  image: string;
  link?: string;
  section: string;
  position: number;
  status: 'active' | 'inactive';
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

function byIsoDateDesc(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function HomePage() {
  const [config, setConfig] = useState<HomeConfig>({
    heroTitle: "Auto Garage Show",
    heroSubtitle: "O maior portal de carros antigos do Brasil",
    showUpcomingEvents: true,
    showFeaturedListings: true,
    showLatestListings: true,
    showLatestNews: true
  });
  
  const [events, setEvents] = useState<Event[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Buscar todas as configurações e dados
    const fetchData = async () => {
      try {
        const [settingsData, eventsData, listingsData, newsData, bannersData] = await Promise.all([
          fetchJson<{ settings?: any }>('/api/settings'),
          fetchJson<{ events?: Event[] }>('/api/events'),
          fetchJson<{ listings?: Listing[] }>('/api/listings'),
          fetchJson<{ news?: News[] }>('/api/noticias'),
          fetchJson<{ banners?: Banner[] }>('/api/banners')
        ]);

        const settings = settingsData.settings;

        if (settings?.settings?.events?.requireApproval === true) {
          setConfig((current) => ({
            ...current,
            heroSubtitle: "Portal de carros antigos com aprovação manual"
          }));
        }

        const bannerHome = (bannersData.banners || [])
          .filter((b: Banner) => b.status === "active" && b.section === "home")
          .sort((a: Banner, b: Banner) => (a.position ?? 0) - (b.position ?? 0))[0];

        if (bannerHome) {
          setConfig((current) => ({
            ...current,
            bannerTitle: bannerHome.title,
            bannerImage: bannerHome.image,
            bannerLink: bannerHome.link
          }));
        }

        setEvents(eventsData.events || []);
        setListings(listingsData.listings || []);
        setNews(newsData.news || []);
        setBanners(bannersData.banners || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error instanceof Error ? error.message : "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </Container>
    );
  }

  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const windowStart = startOfToday.getTime();
  const limit = now + 21 * 24 * 60 * 60 * 1000;

  const upcoming = (
    events
      .filter((e) => e.status === 'approved')
      .map((event) => {
        const occurrences = generateEventOccurrences(event.startAt, event.recurrence, event.endAt);
        const nextOccurrence = occurrences.find((iso) => {
          const time = new Date(iso).getTime();
          return time >= windowStart && time <= limit;
        });
        if (!nextOccurrence) return null;
        return { event, nextOccurrence };
      })
      .filter(Boolean) as { event: Event; nextOccurrence: string }[]
  )
    .sort((a, b) => new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime())
    .slice(0, 6);

  const upcomingEventsOnly = upcoming.map(({ event }) => event);

  const featured = listings
    .filter((l) => (l.status === 'active' || l.status === 'approved') && l.featured)
    .slice(0, 3);

  const latestListings = listings
    .filter((l) => l.status === 'active' || l.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const latestNews = [...news].sort(byIsoDateDesc).slice(0, 3);
  const heroBackgroundImage = config.bannerImage || "/placeholders/hero-top-custom.svg";

  return (
    <>
      <section
        className="border-b border-brand-900/30 bg-slate-900/80"
        style={{
          backgroundImage:
            `linear-gradient(110deg, rgba(10, 12, 10, 0.9), rgba(67, 64, 3, 0.72)), url('${heroBackgroundImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <Container className="py-14">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                Sistema Completo
                <span className="h-1 w-1 rounded-full bg-brand-300" />
                Backend + Frontend
              </div>

              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                {config.heroTitle}
              </h1>
              <p className="mt-4 text-lg text-slate-100">{config.heroSubtitle}</p>
              
              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href="/classificados/anunciar"
                  className="rounded-md bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700"
                >
                  Anunciar Veículo
                </Link>
                <Link
                  href="/eventos"
                  className="rounded-md border border-white/40 px-6 py-3 text-base font-semibold text-white hover:bg-white/10"
                >
                  Ver Eventos
                </Link>
              </div>
            </div>
            
            <HeroSlider section="home" />
          </div>
        </Container>
      </section>

      <Container className="py-10">
        {/* Resumo Estatístico */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-600">Próximos Eventos</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{upcoming.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-600">Anúncios Ativos</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{latestListings.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-600">Notícias</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{latestNews.length}</div>
          </div>
        </div>

        {/* Calendário Interativo */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Calendário de Eventos</h2>
            <Link
              href="/eventos/calendario"
              className="text-brand-600 hover:text-brand-800 font-semibold"
            >
              Ver Calendário Completo →
            </Link>
          </div>
          <CalendarWidget 
            events={upcomingEventsOnly} 
            onEventClick={(event) => {
              // Redirecionar para a página do evento
              window.location.href = `/eventos/${event.slug}`;
            }}
          />
        </div>
        
        {/* Próximos Eventos */}
        {config.showUpcomingEvents && upcoming.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Próximos Eventos</h2>
              <Link
                href="/eventos/calendario"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Calendário Completo →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map(({ event, nextOccurrence }) => (
                <Link
                  key={event.id}
                  href={`/eventos/${event.slug}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-200 transition-colors"
                >
                  <div className="text-xs font-semibold text-brand-700">
                    {formatDateShort(nextOccurrence)} • {event.city}/{event.state}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {event.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Classificados em Destaque */}
        {config.showFeaturedListings && featured.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Anúncios em Destaque</h2>
              <Link
                href="/classificados"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Todos →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/classificados/${listing.slug}`}
                  className="group block rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-brand-200 transition-colors"
                >
                  <div className="aspect-video relative">
                    <Image
                      src={listing.images[0] || "/placeholders/car.svg"}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="rounded-full bg-brand-600 px-2 py-1 text-xs font-semibold text-white">
                        Destaque
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-semibold text-brand-700">
                      {listing.make} {listing.model} • {listing.modelYear}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                      {listing.title}
                    </h3>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {formatCurrencyBRL(listing.price)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Últimos Classificados */}
        {config.showLatestListings && latestListings.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Últimos Anúncios</h2>
              <Link
                href="/classificados"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Todos →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/classificados/${listing.slug}`}
                  className="group block rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-brand-200 transition-colors"
                >
                  <div className="aspect-video relative">
                    <Image
                      src={listing.images[0] || "/placeholders/car.svg"}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-semibold text-slate-700">
                      {listing.make} {listing.model} • {listing.modelYear}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                      {listing.title}
                    </h3>
                    <div className="mt-2 text-2xl font-bold text-slate-900">
                      {formatCurrencyBRL(listing.price)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Últimas Notícias */}
        {config.showLatestNews && latestNews.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Últimas Notícias</h2>
              <Link
                href="/noticias"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Todas →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latestNews.map((article) => (
                <Link
                  key={article.id}
                  href={`/noticias/${article.slug}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-200 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                    {article.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {article.excerpt}
                  </p>
                  <div className="mt-3 text-xs text-slate-500">
                    {formatDateLong(article.createdAt)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </Container>
    </>
  );
}

