"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/Container";
import { formatDateLong, formatDateShort, formatTime, isWithinNextDays } from "@/lib/date";
import { formatCurrencyBRL } from "@/lib/format";
import CalendarWidget from "@/components/CalendarWidget";

interface HomeConfig {
  heroTitle: string;
  heroSubtitle: string;
  youtubeEmbedUrl?: string;
  showUpcomingEvents: boolean;
  showPastEvents: boolean;
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
  startAt: string;
  endAt?: string;
  status: 'pending' | 'approved' | 'completed';
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

function byIsoDateAsc(a: { startAt: string }, b: { startAt: string }) {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

function byIsoDateDesc(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function HomePage() {
  const [config, setConfig] = useState<HomeConfig>({
    heroTitle: "Auto Garage Show",
    heroSubtitle: "O maior portal de carros antigos do Brasil",
    showUpcomingEvents: true,
    showPastEvents: true,
    showFeaturedListings: true,
    showLatestListings: true,
    showLatestNews: true
  });
  
  const [events, setEvents] = useState<Event[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar todas as configurações e dados
    const fetchData = async () => {
      try {
        const [settingsRes, eventsRes, listingsRes, newsRes, pastEventsRes, bannersRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/events'),
          fetch('/api/listings'),
          fetch('/api/noticias'),
          fetch('/api/events/past'),
          fetch('/api/banners')
        ]);

        const settings = await settingsRes.json();
        const eventsData = await eventsRes.json();
        const listingsData = await listingsRes.json();
        const newsData = await newsRes.json();
        const pastEventsData = await pastEventsRes.json();
        const bannersData = await bannersRes.json();

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
        setPastEvents(pastEventsData.events || []);
        setBanners(bannersData.banners || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
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

  const upcoming = events
    .filter((e) => e.status === 'approved')
    .filter((e) => isWithinNextDays(e.startAt, 21))
    .sort(byIsoDateAsc)
    .slice(0, 6);

  const featured = listings
    .filter((l) => (l.status === 'active' || l.status === 'approved') && l.featured)
    .slice(0, 3);

  const latestListings = listings
    .filter((l) => l.status === 'active' || l.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const latestNews = [...news].sort(byIsoDateDesc).slice(0, 3);

  const activeBanners = banners.filter(b => b.status === 'active');

  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50 to-white">
        <Container className="py-14">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-800">
                Sistema Completo
                <span className="h-1 w-1 rounded-full bg-brand-400" />
                Backend + Frontend
              </div>

              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                {config.heroTitle}
              </h1>
              <p className="mt-4 text-lg text-slate-600">{config.heroSubtitle}</p>
              
              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  href="/classificados/anunciar"
                  className="rounded-md bg-brand-600 px-6 py-3 text-base font-semibold text-white hover:bg-brand-700"
                >
                  Anunciar Veículo
                </Link>
                <Link
                  href="/eventos"
                  className="rounded-md border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver Eventos
                </Link>
              </div>
            </div>
            
            {config.youtubeEmbedUrl && (
              <div className="aspect-video w-full max-w-md rounded-xl overflow-hidden">
                <iframe
                  src={config.youtubeEmbedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* Banner Principal */}
      {config.bannerImage && (
        <section className="bg-slate-900">
          <Container className="py-8">
            <Link
              href={config.bannerLink || "#"}
              className="block group relative overflow-hidden rounded-xl"
            >
              <Image
                src={config.bannerImage}
                alt={config.bannerTitle || "Banner"}
                width={1200}
                height={300}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2 right-2">
                <div className="text-center text-white">
                  <h2 className="text-2xl font-bold">{config.bannerTitle}</h2>
                  {config.bannerLink && (
                    <p className="mt-2 text-sm opacity-90">Clique para saber mais</p>
                  )}
                </div>
              </div>
            </Link>
          </Container>
        </section>
      )}

      <Container className="py-10">
        {/* Resumo Estatístico */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-600">Eventos Realizados</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{pastEvents.length}</div>
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
            events={upcoming} 
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
              {upcoming.map((event) => (
                <Link
                  key={event.id}
                  href={`/eventos/${event.slug}`}
                  className="group block rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-200 transition-colors"
                >
                  <div className="text-xs font-semibold text-brand-700">
                    {formatDateShort(event.startAt)} • {event.city}/{event.state}
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
                  <div className="text-xs font-semibold text-brand-700 capitalize">
                    {article.category}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-brand-800">
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

        {/* Eventos Realizados */}
        {config.showPastEvents && pastEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Eventos Realizados</h2>
              <Link
                href="/realizados"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Galeria Completa →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastEvents.slice(0, 6).map((event) => (
                <Link
                  key={event.id}
                  href={`/realizados/${event.slug}`}
                  className="group block rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-brand-200 transition-colors"
                >
                  <div className="aspect-video relative">
                    <Image
                      src={event.images[0] || "/placeholders/event.svg"}
                      alt={event.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500">
                      {formatDateShort(event.date)} • {event.city}/{event.state}
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                      {event.title}
                    </h3>
                    <div className="mt-2 text-sm text-slate-600">
                      {event.images.length} foto{event.images.length !== 1 ? 's' : ''}
                      {event.attendance && ` • ${event.attendance} participantes`}
                    </div>
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
