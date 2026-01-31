"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatDateShort } from "@/lib/date";

interface PastEvent {
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  date: string;
  images: string[];
  description?: string;
  attendance?: number;
}

export default function PastEventsPage() {
  const [events, setEvents] = useState<PastEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/events/past')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar eventos realizados:', err);
        setError('Erro ao carregar eventos realizados');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando eventos realizados...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-10">
        <Notice title="Erro" variant="warning">
          {error}
        </Notice>
      </Container>
    );
  }

  return (
    <>
      <PageIntro
        title="Eventos realizados"
        subtitle="Galeria com fotos após a data do evento (histórico, SEO e credibilidade)."
      />

      <Container className="py-10">
        {events.length === 0 ? (
          <Notice title="Nenhum evento realizado ainda" variant="info">
            Os eventos realizados aparecerão aqui após a data do evento e quando forem adicionadas fotos.
          </Notice>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/realizados/${event.slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-brand-200"
              >
                <Image
                  src={event.images[0] || "/placeholders/event.svg"}
                  alt={event.title}
                  width={1200}
                  height={800}
                  className="h-44 w-full object-cover"
                />
                <div className="p-5">
                  <div className="text-sm text-slate-500">
                    {formatDateShort(event.date)} • {event.city}/{event.state}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                    {event.title}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {event.images.length} foto{event.images.length !== 1 ? 's' : ''}
                    {event.attendance && ` • ${event.attendance} participantes`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
