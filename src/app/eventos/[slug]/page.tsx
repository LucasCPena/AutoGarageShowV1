import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatDateLong, formatTime } from "@/lib/date";
import { events } from "@/lib/mockData";
import { generateMonthlyOccurrences } from "@/lib/recurrence";
import { eventJsonLd } from "@/lib/schema";

type Props = {
  params: {
    slug: string;
  };
};

function toMetaDescription(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}

export function generateMetadata({ params }: Props): Metadata {
  const event = events.find((e) => e.slug === params.slug && e.status === "approved");

  if (!event) {
    return {
      title: "Evento",
      description: "Evento não encontrado."
    };
  }

  const description = toMetaDescription(event.description);

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "article"
    }
  };
}

export default function EventDetailPage({ params }: Props) {
  const event = events.find((e) => e.slug === params.slug);

  if (!event || event.status !== "approved") {
    notFound();
  }

  const occurrences =
    event.recurrence.type === "monthly"
      ? generateMonthlyOccurrences(
          event.startAt,
          event.recurrence.patternLabel,
          event.recurrence.generateMonths
        )
      : [event.startAt];

  const futureOccurrences = occurrences.filter(
    (iso) => new Date(iso).getTime() >= Date.now()
  );

  return (
    <>
      <PageIntro
        title={event.title}
        subtitle={`${formatDateLong(event.startAt)} • ${formatTime(event.startAt)} • ${event.city}/${event.state}`}
      >
        <Link
          href="/eventos"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
        <Link
          href="/eventos/cadastrar"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Enviar evento
        </Link>
      </PageIntro>

      <Container className="py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(eventJsonLd(event))
          }}
        />

        <Notice title="Regra de exibição (público)" variant="info">
          No calendário público aparecem apenas eventos aprovados dos próximos 21 dias. No admin, é possível visualizar todos os cadastros.
        </Notice>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="grid gap-6 lg:col-span-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Sobre o evento</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {event.description}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Recorrência</h2>

              {event.recurrence.type === "monthly" ? (
                <>
                  <p className="mt-2 text-sm text-slate-600">
                    Evento recorrente: <strong>{event.recurrence.patternLabel}</strong>.
                    Datas geradas automaticamente por até {event.recurrence.generateMonths} meses.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {futureOccurrences.slice(0, 8).map((iso) => (
                      <div
                        key={iso}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {formatDateLong(iso)}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {formatTime(iso)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  Evento único. (No sistema final, eventos recorrentes geram automaticamente próximas datas.)
                </p>
              )}
            </section>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-slate-900">Informações</div>

            <dl className="mt-4 grid gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Data</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {formatDateLong(event.startAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Horário</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {formatTime(event.startAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Local</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {event.location}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Cidade / UF</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {event.city}/{event.state}
                </dd>
              </div>
            </dl>

            {event.websiteUrl ? (
              <a
                className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                href={event.websiteUrl}
                target="_blank"
                rel="noreferrer"
              >
                Site do organizador
              </a>
            ) : null}

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Após a data, o evento pode virar “Evento realizado” com galeria de fotos (otimizadas em WEBP e lazy load).
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
