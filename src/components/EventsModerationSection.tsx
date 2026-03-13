"use client";

import { useEffect, useState } from "react";

import AdminEventsPanel from "@/components/AdminEventsPanel";
import Notice from "@/components/Notice";
import type { Event } from "@/lib/database";
import { fetchJson } from "@/lib/fetch-json";
import { useAuth } from "@/lib/useAuth";

export default function EventsModerationSection() {
  const { user, token, isLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (user?.role !== "admin" || !token) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchJson<{ events?: Event[] }>("/api/events", {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((data) => {
        if (cancelled) return;
        setEvents(Array.isArray(data.events) ? data.events : []);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error ? fetchError.message : "Erro ao carregar moderacao de eventos."
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, token, user?.role]);

  if (isLoading || user?.role !== "admin") {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-10">
        <Notice title="Moderacao de eventos" variant="info">
          Carregando eventos para liberacao.
        </Notice>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10">
        <Notice title="Erro" variant="warning">
          {error}
        </Notice>
      </div>
    );
  }

  return (
    <section className="mt-10">
      <AdminEventsPanel events={events} token={token} />
    </section>
  );
}
