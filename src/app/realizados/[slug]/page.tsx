import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatDateLong } from "@/lib/date";
import { db } from "@/lib/database";
import { normalizeAssetReference } from "@/lib/site-url";

type Props = {
  params: {
    slug: string;
  };
};

export const dynamic = "force-dynamic";

async function loadPastEvent(slug: string) {
  try {
    return await db.pastEvents.findBySlug(slug);
  } catch (error) {
    console.error("Erro ao carregar evento realizado:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await loadPastEvent(params.slug);

  if (!event) {
    return {
      title: "Evento realizado",
      description: "Evento nao encontrado."
    };
  }

  const description = `Galeria de fotos: ${event.title} (${event.city}/${event.state}).`;

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

export default async function PastEventDetailPage({ params }: Props) {
  const event = await loadPastEvent(params.slug);

  if (!event) {
    notFound();
  }

  const images = (event.images?.length ? event.images : ["/placeholders/event.svg"]).map(
    (image) => normalizeAssetReference(image) || "/placeholders/event.svg"
  );
  const videos = event.videos || [];

  return (
    <>
      <PageIntro
        title={event.title}
        subtitle={`${formatDateLong(event.date)} • ${event.city}/${event.state}`}
      >
        <Link
          href="/realizados"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
      </PageIntro>

      <Container className="py-10">
        <Notice title="Galeria" variant="info">
          Fotos e videos cadastrados para este evento realizado.
        </Notice>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <img
                src={src}
                alt={`${event.title} - foto ${index + 1}`}
                className="h-56 w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {videos.length > 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Videos</h2>
            <div className="mt-3 grid gap-2 text-sm">
              {videos.map((video) => (
                <a
                  key={video}
                  href={video}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 hover:text-brand-900"
                >
                  {video}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {event.description ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Resumo</h2>
            <p className="mt-3 text-sm text-slate-700">{event.description}</p>
          </div>
        ) : null}
      </Container>
    </>
  );
}

