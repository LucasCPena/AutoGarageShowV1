"use client";

import { useEffect, useState } from "react";

import Calendar from "@/components/Calendar";
import Container from "@/components/Container";
import MultiMonthCalendar from "@/components/MultiMonthCalendar";
import PageIntro from "@/components/PageIntro";
import type { Event } from "@/lib/mockData";

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar calendário:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando calendário...</div>
      </Container>
    );
  }

  return (
    <>
      <PageIntro
        title="Calendário de Eventos"
        subtitle="Visão mensal com eventos recorrentes e links para detalhes."
      />

      <Container className="py-10">
        <MultiMonthCalendar events={events} months={3} />
      </Container>
    </>
  );
}
