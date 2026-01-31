import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatDateLong, formatTime, isWithinNextDays } from "@/lib/date";
import { events } from "@/lib/mockData";

export const metadata: Metadata = {
  title: "Eventos",
  description:
    "Calendário público com eventos aprovados de carros antigos. Exibe apenas os próximos 21 dias."
};

function byStartAtAsc(a: { startAt: string }, b: { startAt: string }) {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

export default function EventsPage() {
  const upcoming = events
    .filter((e) => e.status === "approved")
    .filter((e) => isWithinNextDays(e.startAt, 21))
    .sort(byStartAtAsc);

  return (
    <>
      <PageIntro
        title="Calendário de eventos"
        subtitle="Mostrando apenas eventos aprovados nos próximos 21 dias (regra pública)."
      >
        <Link
          href="/eventos/cadastrar"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Cadastrar evento
        </Link>
      </PageIntro>

      <Container className="py-10">
        <Notice title="Como funciona" variant="info">
          Eventos enviados passam por aprovação manual. Apenas eventos aprovados geram URL pública amigável. Eventos recorrentes podem gerar datas automaticamente por até 12 meses.
        </Notice>

        <div className="mt-8 grid gap-3">
          {upcoming.map((event) => (
            <article
              key={event.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-slate-500">
                    {formatDateLong(event.startAt)} • {formatTime(event.startAt)}
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
                  {event.recurrence.type === "monthly"
                    ? event.recurrence.patternLabel
                    : "Evento único"}
                </span>
              </div>
            </article>
          ))}

          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
              Nenhum evento aprovado nos próximos 21 dias.
            </div>
          ) : null}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="text-sm font-semibold text-slate-900">
            Quer divulgar um encontro?
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Envie seu evento para revisão. No sistema final haverá validação de e-mail, captcha e controle anti-spam.
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
