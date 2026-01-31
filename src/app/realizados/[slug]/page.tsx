import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatDateLong } from "@/lib/date";
import { pastEvents } from "@/lib/mockData";

type Props = {
  params: {
    slug: string;
  };
};

export function generateMetadata({ params }: Props): Metadata {
  const event = pastEvents.find((e) => e.slug === params.slug);

  if (!event) {
    return {
      title: "Evento realizado",
      description: "Evento não encontrado."
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

export default function PastEventDetailPage({ params }: Props) {
  const event = pastEvents.find((e) => e.slug === params.slug);

  if (!event) {
    notFound();
  }

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
        <Notice title="Performance (planejado)" variant="info">
          No sistema final, todas as imagens serão WEBP e servidas com lazy load. Aqui usamos placeholders.
        </Notice>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {event.images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <Image
                src={src}
                alt={`${event.title} - foto ${index + 1}`}
                width={1200}
                height={800}
                className="h-56 w-full object-cover"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
