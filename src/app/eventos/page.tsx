import type { Metadata } from "next";
import Link from "next/link";

import Calendar from "@/components/Calendar";
import Container from "@/components/Container";
import HeroSlider from "@/components/HeroSlider";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import EventCrudActions from "@/components/EventCrudActions";
import { formatDateLong, formatTime } from "@/lib/date";
import { db, Event } from "@/lib/database";
import { findNextOccurrenceInWindow, formatRecurrence, getSpanDays } from "@/lib/eventRecurrence";
import { eventImageAlt } from "@/lib/image-alt";
import { normalizeAssetReference } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Eventos",
  description:
    "Eventos aprovados de carros antigos com navegacao mensal por setas."
};

export const dynamic = "force-dynamic";
const EVENTS_PER_PAGE = 3;

type EventsPageProps = {
  searchParams?: {
    page?: string;
  };
};

function parsePage(value: string | undefined) {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function pageHref(page: number) {
  if (page <= 1) return "/eventos";
  return `/eventos?page=${page}`;
}

function isFeaturedActive(event: Event, now: number) {
  if (!event.featured) return false;
  if (!event.featuredUntil) return true;
  const until = new Date(event.featuredUntil).getTime();
  return Number.isFinite(until) ? until > now : true;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  let allEvents: Event[] = [];
  let dbError = false;

  try {
    allEvents = await db.events.getAll();
  } catch (error) {
    dbError = true;
    console.error("Erro ao carregar eventos:", error);
  }

  const now = Date.now();
  const windowStart = now;
  const limit = windowStart + 30 * 24 * 60 * 60 * 1000;
  const approvedEvents = allEvents.filter((e) => e.status === "approved");

  const upcoming = (
    approvedEvents
      .map((event) => {
        const nextOccurrence = findNextOccurrenceInWindow(
          event.startAt,
          event.recurrence,
          event.endAt,
          windowStart,
          limit
        );
        if (!nextOccurrence) return null;
        return { event, nextOccurrence };
      })
      .filter(Boolean) as { event: Event; nextOccurrence: string }[]
  ).sort((a, b) => {
    const aFeatured = isFeaturedActive(a.event, now);
    const bFeatured = isFeaturedActive(b.event, now);
    if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
    return new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(upcoming.length / EVENTS_PER_PAGE));
  const currentPage = Math.min(parsePage(searchParams?.page), totalPages);
  const paginatedUpcoming = upcoming.slice(
    (currentPage - 1) * EVENTS_PER_PAGE,
    currentPage * EVENTS_PER_PAGE
  );

  return (
    <>
      <PageIntro
        title="Eventos"
        subtitle="No topo do calendario, navegue por mes com as setas para anterior e proximo."
      >
        <Link
          href="/eventos/cadastrar"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Cadastrar evento
        </Link>
      </PageIntro>

      <Container className="py-10">
        <section className="mb-8">
          <HeroSlider section="events" />
        </section>

        <section>
          <Calendar events={approvedEvents} />
        </section>

        {dbError ? (
          <Notice title="Banco indisponivel" variant="warning" className="mt-6">
            Nao foi possivel carregar os eventos agora. Tente novamente em instantes.
          </Notice>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedUpcoming.map(({ event, nextOccurrence }) => {
            const spanDays = getSpanDays(event.startAt, event.endAt);
            const recurrenceLabel = formatRecurrence(event.recurrence, spanDays);
            const showRecurrenceBadge = event.recurrence.type !== "single" || spanDays > 1;

            return (
              <article
                key={event.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <img
                      src={
                        normalizeAssetReference(event.coverImage || event.images?.[0]) ||
                        "/placeholders/event.svg"
                      }
                      alt={eventImageAlt(event.title)}
                      className="mb-3 h-28 w-full max-w-xs rounded-lg border border-slate-200 object-cover"
                    />
                    <div className="text-sm text-slate-500">
                      {formatDateLong(nextOccurrence)} • {formatTime(nextOccurrence)}
                    </div>
                    <Link
                      href={`/eventos/${event.slug}`}
                      className="mt-1 inline-block text-lg font-semibold text-slate-900 hover:text-brand-800"
                    >
                      {event.title}
                    </Link>
                    <div className="mt-1 text-sm text-slate-600">
                      {event.city}/{event.state} • {event.location}
                    </div>
                  </div>

                  {showRecurrenceBadge ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {recurrenceLabel}
                    </span>
                  ) : null}
                </div>

                {isFeaturedActive(event, now) ? (
                  <div className="mt-3 inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                    Evento em destaque
                  </div>
                ) : null}

                <EventCrudActions
                  eventId={event.id}
                  editHref={`/eventos/gerenciar/${event.id}`}
                  compact
                />
              </article>
            );
          })}

          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum evento aprovado nos proximos 30 dias.
            </div>
          ) : null}
        </div>

        {upcoming.length > 0 ? (
          <nav
            className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm"
            aria-label="Paginacao de eventos"
          >
            <span className="text-slate-600">
              Pagina {currentPage} de {totalPages} ({upcoming.length} eventos)
            </span>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={pageHref(currentPage - 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  Anterior
                </Link>
              ) : (
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">
                  Anterior
                </span>
              )}
              {currentPage < totalPages ? (
                <Link
                  href={pageHref(currentPage + 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  Proxima
                </Link>
              ) : (
                <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">
                  Proxima
                </span>
              )}
            </div>
          </nav>
        ) : null}

      </Container>
    </>
  );
}
