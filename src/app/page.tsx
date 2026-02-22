"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/Container";
import type { EventRecurrence } from "@/lib/database";
import { formatDateLong, formatDateShort } from "@/lib/date";
import { formatCurrencyBRL } from "@/lib/format";
import { fetchJson } from "@/lib/fetch-json";
import { listingImageAlt } from "@/lib/image-alt";
import { normalizeAssetReference } from "@/lib/site-url";
import { useAuth } from "@/lib/useAuth";
import { generateEventOccurrences } from "@/lib/eventRecurrence";
import HeroSlider from "@/components/HeroSlider";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

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
  contactPhoneSecondary?: string;
  contactEmail?: string;
  startAt: string;
  endAt?: string;
  status: 'pending' | 'approved' | 'completed';
  recurrence: EventRecurrence;
  liveUrl?: string;
  featured?: boolean;
  featuredUntil?: string;
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

function safeImageSrc(value: string | undefined, fallback: string) {
  return normalizeAssetReference(value) || fallback;
}

function isFeaturedListingActive(listing: Listing, now: number) {
  if (!listing.featured) return false;
  if (!listing.featuredUntil) return true;
  const until = new Date(listing.featuredUntil).getTime();
  return Number.isFinite(until) ? until > now : true;
}

function isFeaturedEventActive(event: Event, now: number) {
  if (!event.featured) return false;
  if (!event.featuredUntil) return true;
  const until = new Date(event.featuredUntil).getTime();
  return Number.isFinite(until) ? until > now : true;
}

export default function HomePage() {
  const { user, token } = useAuth();

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
  const [pendingListingsCount, setPendingListingsCount] = useState(0);
  const [pendingCommentsCount, setPendingCommentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Buscar todas as configuracoes e dados
    const fetchData = async () => {
      try {
        const requests = [
          fetchJson<{ settings?: any }>('/api/settings'),
          fetchJson<{ events?: Event[] }>('/api/events'),
          fetchJson<{ listings?: Listing[] }>('/api/listings'),
          fetchJson<{ news?: News[] }>('/api/noticias'),
          fetchJson<{ banners?: Banner[] }>('/api/banners')
        ] as const;

        const [settingsResult, eventsResult, listingsResult, newsResult, bannersResult] =
          await Promise.allSettled(requests);

        const failedRequests: Array<{ name: string; reason: unknown }> = [];
        if (settingsResult.status === "rejected") {
          failedRequests.push({ name: "settings", reason: settingsResult.reason });
        }
        if (eventsResult.status === "rejected") {
          failedRequests.push({ name: "events", reason: eventsResult.reason });
        }
        if (listingsResult.status === "rejected") {
          failedRequests.push({ name: "listings", reason: listingsResult.reason });
        }
        if (newsResult.status === "rejected") {
          failedRequests.push({ name: "news", reason: newsResult.reason });
        }
        if (bannersResult.status === "rejected") {
          failedRequests.push({ name: "banners", reason: bannersResult.reason });
        }

        failedRequests.forEach(({ name, reason }) => {
          console.error(`Falha ao carregar ${name}:`, reason);
        });

        if (failedRequests.length === requests.length) {
          setError("Nao foi possivel carregar os dados no momento.");
          return;
        }

        const settingsData =
          settingsResult.status === "fulfilled" ? settingsResult.value : {};
        const eventsData =
          eventsResult.status === "fulfilled" ? eventsResult.value : {};
        const listingsData =
          listingsResult.status === "fulfilled" ? listingsResult.value : {};
        const newsData =
          newsResult.status === "fulfilled" ? newsResult.value : {};
        const bannersData =
          bannersResult.status === "fulfilled" ? bannersResult.value : {};

        const settings = settingsData.settings;

        if (settings?.settings?.events?.requireApproval === true) {
          setConfig((current) => ({
            ...current,
            heroSubtitle: "Portal de carros antigos com aprovacao manual"
          }));
        }

        const nowMs = Date.now();
        const bannerHome = (bannersData.banners || [])
          .filter((b: Banner) => {
            if (b.status !== "active" || b.section !== "home") return false;

            const start = new Date(b.startDate).getTime();
            if (Number.isFinite(start) && start > nowMs) return false;

            const end = b.endDate ? new Date(b.endDate).getTime() : Number.POSITIVE_INFINITY;
            if (Number.isFinite(end) && end < nowMs) return false;

            return true;
          })
          .sort((a: Banner, b: Banner) => {
            const byPosition = (a.position ?? 0) - (b.position ?? 0);
            if (byPosition !== 0) return byPosition;

            const aUpdated = new Date(a.updatedAt).getTime();
            const bUpdated = new Date(b.updatedAt).getTime();
            if (Number.isFinite(aUpdated) && Number.isFinite(bUpdated)) {
              return bUpdated - aUpdated;
            }

            const aCreated = new Date(a.createdAt).getTime();
            const bCreated = new Date(b.createdAt).getTime();
            if (Number.isFinite(aCreated) && Number.isFinite(bCreated)) {
              return bCreated - aCreated;
            }

            return 0;
          })[0];

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
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error instanceof Error ? error.message : "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (user?.role !== "admin" || !token) {
      setPendingListingsCount(0);
      setPendingCommentsCount(0);
      return;
    }

    let cancelled = false;
    const headers: HeadersInit = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      fetchJson<{ listings?: Listing[] }>("/api/admin/listings/pending", { headers }),
      fetchJson<{ comments?: Array<{ id: string }> }>("/api/comments?pending=true", { headers })
    ]).then(([listingsResult, commentsResult]) => {
      if (cancelled) return;

      if (listingsResult.status === "fulfilled") {
        setPendingListingsCount((listingsResult.value.listings || []).length);
      } else {
        console.error("Falha ao carregar pendencias de classificados:", listingsResult.reason);
      }

      if (commentsResult.status === "fulfilled") {
        setPendingCommentsCount((commentsResult.value.comments || []).length);
      } else {
        console.error("Falha ao carregar pendencias de comentarios:", commentsResult.reason);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, user?.role]);

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
  const limit = now + 30 * 24 * 60 * 60 * 1000;

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
    .sort((a, b) => {
      const aFeatured = isFeaturedEventActive(a.event, now);
      const bFeatured = isFeaturedEventActive(b.event, now);
      if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
      return new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime();
    })
    .slice(0, 6);
  const liveEvent = upcoming.find(({ event }) => Boolean(event.liveUrl))?.event;
  const liveEmbedUrl = toYouTubeEmbedUrl(liveEvent?.liveUrl);

  const visibleListings = listings.filter((listing) => listing.status === "active" || listing.status === "approved");
  const activeListingsCount = visibleListings.length;
  const publishedNewsCount = news.filter((item) => item.status === "published").length;
  const totalEventOccurrencesCount = events.reduce((total, event) => {
    const occurrences = generateEventOccurrences(event.startAt, event.recurrence, event.endAt);
    return total + occurrences.length;
  }, 0);

  const featured = visibleListings
    .filter((listing) => isFeaturedListingActive(listing, now))
    .slice(0, 3);

  const latestListings = visibleListings
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const latestNews = [...news].sort(byIsoDateDesc).slice(0, 3);
  const heroBackgroundImage = safeImageSrc(
    config.bannerImage,
    "/placeholders/hero-top-custom.svg"
  );
  const canViewHomeStats = user?.role === "admin";

  return (
    <>
      <section
        className="min-h-[420px] border-b border-brand-900/30 bg-slate-900/80"
        style={{
          backgroundImage:
            `linear-gradient(110deg, rgba(10, 12, 10, 0.9), rgba(67, 64, 3, 0.72)), url('${heroBackgroundImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <Container className="py-16 md:py-20">
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
                  Anunciar Veiculo
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
        {/* Resumo Estatistico */}
        {canViewHomeStats ? (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Ocorrencias de eventos</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{totalEventOccurrencesCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Anuncios ativos</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{activeListingsCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Noticias</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{publishedNewsCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Classificados para liberar</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{pendingListingsCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Comentarios para liberar</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{pendingCommentsCount}</div>
            </div>
          </div>
        ) : null}

        {/* Calendario Interativo */}
        {liveEvent && liveEmbedUrl ? (
          <section className="mb-12 rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Evento ao vivo agora</h2>
                <p className="mt-1 text-sm text-slate-700">
                  {liveEvent.title} | {liveEvent.city}/{liveEvent.state}
                </p>
              </div>
              <Link
                href={`/eventos/${liveEvent.slug}`}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Ver detalhes
              </Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-black">
              <iframe
                className="aspect-video w-full"
                src={liveEmbedUrl}
                title={`Transmissao ao vivo: ${liveEvent.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </section>
        ) : null}

        
        
        {/* Proximos Eventos */}
        {config.showUpcomingEvents && upcoming.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Proximos Eventos</h2>
              <Link
                href="/eventos"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Eventos
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
                    {formatDateShort(nextOccurrence)} | {event.city}/{event.state}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                    {event.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isFeaturedEventActive(event, now) ? (
                      <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                        Destaque
                      </span>
                    ) : null}
                    {event.liveUrl ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Ao vivo
                      </span>
                    ) : null}
                  </div>
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
              <h2 className="text-2xl font-bold text-slate-900">Anuncios em Destaque</h2>
              <Link
                href="/classificados"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Todos
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
                      src={safeImageSrc(listing.images[0], "/placeholders/car.svg")}
                      alt={listingImageAlt(listing.title)}
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
                      {listing.make} {listing.model} | {listing.modelYear}
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

        {/* Ultimos Classificados */}
        {config.showLatestListings && latestListings.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Ultimos Anuncios</h2>
              <Link
                href="/classificados"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Todos
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
                      src={safeImageSrc(listing.images[0], "/placeholders/car.svg")}
                      alt={listingImageAlt(listing.title)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
                    />
                  </div>
                  <div className="p-4">
                    <div className="text-xs font-semibold text-slate-700">
                      {listing.make} {listing.model} | {listing.modelYear}
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

        {/* Ultimas Noticias */}
        {config.showLatestNews && latestNews.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Ultimas Noticias</h2>
              <Link
                href="/noticias"
                className="text-brand-600 hover:text-brand-800 font-semibold"
              >
                Ver Todas
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




