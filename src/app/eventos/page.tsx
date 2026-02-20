import type { Metadata } from "next";
import Link from "next/link";

import Calendar from "@/components/Calendar";
import Container from "@/components/Container";
import EventCrudActions from "@/components/EventCrudActions";
import HeroSlider from "@/components/HeroSlider";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatDateLong, formatTime } from "@/lib/date";
import { db, Event } from "@/lib/database";
import { formatRecurrence, generateEventOccurrences, getSpanDays } from "@/lib/eventRecurrence";
import { normalizeAssetReference } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Eventos",
  description:
    "Calendario publico com eventos aprovados de carros antigos. Exibe apenas os proximos 30 dias."
};

export const dynamic = "force-dynamic";

function isFeaturedActive(event: Event, now: number) {
  if (!event.featured) return false;
  if (!event.featuredUntil) return true;
  const until = new Date(event.featuredUntil).getTime();
  return Number.isFinite(until) ? until > now : true;
}

export default async function EventsPage() {
  let allEvents: Event[] = [];
  let dbError = false;

  try {
    allEvents = await db.events.getAll();
  } catch (error) {
    dbError = true;
    console.error("Erro ao carregar eventos:", error);
  }

  const now = Date.now();
  const limit = now + 30 * 24 * 60 * 60 * 1000;
  const approvedEvents = allEvents.filter((e) => e.status === "approved");

  const upcoming = (
    approvedEvents
      .map((event) => {
        const occurrences = generateEventOccurrences(event.startAt, event.recurrence, event.endAt);
        const nextOccurrence = occurrences.find((iso) => {
          const time = new Date(iso).getTime();
          return time >= now && time <= limit;
        });
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

  return (
    <>
      <PageIntro
        title="Calendario de eventos"
        subtitle="Mostrando apenas eventos aprovados nos proximos 30 dias (regra publica)."
      >
        <Link
          href="/eventos/cadastrar"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Cadastrar evento
        </Link>
      </PageIntro>

      <Container className="mt-6">
        <HeroSlider section="events" />
      </Container>

      <Container className="py-10">
        {dbError ? (
          <Notice title="Banco indisponivel" variant="warning">
            Nao foi possivel carregar os eventos agora. Tente novamente em instantes.
          </Notice>
        ) : null}

        <Notice title="Como funciona" variant="info">
          Eventos enviados passam por aprovacao manual. Apenas eventos aprovados geram URL publica amigavel. Eventos
          recorrentes podem gerar datas automaticamente por ate 12 meses.
        </Notice>

        <section className="mt-8">
          <Calendar events={approvedEvents} />
        </section>

        <div className="mt-8 grid gap-3">
          {upcoming.map(({ event, nextOccurrence }) => (
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
                    alt={event.title}
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

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatRecurrence(event.recurrence, getSpanDays(event.startAt, event.endAt))}
                </span>
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
          ))}

          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum evento aprovado nos proximos 30 dias.
            </div>
          ) : null}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-semibold text-slate-900">
            Quer divulgar um encontro?
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Envie seu evento para revisao. No sistema final havera validacao de e-mail, captcha e controle anti-spam.
          </p>
          <div className="mt-4">
            <Link
              href="/eventos/cadastrar"
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Enviar evento
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
