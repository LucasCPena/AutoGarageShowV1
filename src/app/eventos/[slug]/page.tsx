import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import ZoomableImage from "@/components/ZoomableImage";
import { formatDateLong, formatTime } from "@/lib/date";
import { db } from "@/lib/database";
import { isPublicEventStatus } from "@/lib/event-status";
import { eventImageAlt } from "@/lib/image-alt";
import { eventJsonLd } from "@/lib/schema";
import { normalizeAssetReference } from "@/lib/site-url";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

type Props = {
  params: {
    slug: string;
  };
};

export const dynamic = "force-dynamic";

function toMetaDescription(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}

async function findVisibleEvent(slug: string) {
  try {
    const event = await db.events.findBySlug(slug);
    if (!event || !isPublicEventStatus(event.status)) return null;
    return event;
  } catch (error) {
    console.error("Erro ao buscar evento por slug:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await findVisibleEvent(params.slug);

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

export default async function EventDetailPage({ params }: Props) {
  const event = await findVisibleEvent(params.slug);

  if (!event) {
    return notFound();
  }

  const eventTimeLabel = event.endAt
    ? `${formatTime(event.startAt)} as ${formatTime(event.endAt)}`
    : formatTime(event.startAt);
  const heroImage =
    normalizeAssetReference(event.coverImage || event.images?.[0]) ||
    "/placeholders/event.svg";
  const organizerLogo = normalizeAssetReference(event.organizerLogo);
  const liveEmbedUrl = toYouTubeEmbedUrl(event.liveUrl);

  return (
    <>
      <PageIntro
        title={event.title}
        subtitle={`${formatDateLong(event.startAt)} • ${eventTimeLabel} • ${event.city}/${event.state}`}
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

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="grid gap-6 lg:col-span-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <ZoomableImage
                src={heroImage}
                alt={eventImageAlt(event.title)}
                width={1200}
                height={800}
                className="mb-4 h-52 w-full rounded-xl border border-slate-200 object-cover"
              />
              <h2 className="text-lg font-semibold text-slate-900">Sobre o evento</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {event.description}
              </p>
            </section>

            {liveEmbedUrl ? (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <h2 className="text-lg font-semibold text-slate-900">Evento ao vivo</h2>
                <p className="mt-2 text-sm text-slate-700">
                  Transmissão identificada automaticamente pelo link do YouTube.
                </p>
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-black">
                  <iframe
                    className="aspect-video w-full"
                    src={liveEmbedUrl}
                    title={`Transmissão ao vivo: ${event.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </section>
            ) : null}
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
                  {eventTimeLabel}
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
              <div>
                <dt className="text-slate-500">Organizador</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {event.contactName}
                </dd>
                {organizerLogo ? (
                  <img
                    src={organizerLogo}
                    alt={eventImageAlt(`logo do organizador ${event.contactName}`)}
                    className="mt-2 h-14 w-14 rounded-md border border-slate-200 object-contain bg-white p-1"
                  />
                ) : null}
              </div>
              {event.contactPhone ? (
                <div>
                  <dt className="text-slate-500">Telefone</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {event.contactPhone}
                  </dd>
                </div>
              ) : null}
              {event.contactPhoneSecondary ? (
                <div>
                  <dt className="text-slate-500">Telefone 2</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {event.contactPhoneSecondary}
                  </dd>
                </div>
              ) : null}
              {event.contactEmail ? (
                <div>
                  <dt className="text-slate-500">E-mail</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {event.contactEmail}
                  </dd>
                </div>
              ) : null}
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
              Após a data, o evento pode virar Evento realizado com galeria de fotos.
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
