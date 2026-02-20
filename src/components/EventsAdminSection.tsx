"use client";

import { useEffect, useState } from "react";

import AdminEventsPanel from "@/components/AdminEventsPanel";
import Notice from "@/components/Notice";
import type { Event } from "@/lib/database";
import { useAuth } from "@/lib/useAuth";

export default function EventsAdminSection() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [showCrud, setShowCrud] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || user?.role !== "admin" || !showCrud || !token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/events", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar eventos.");
        }
        if (cancelled) return;
        setEvents(data.events || []);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro ao carregar eventos."
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, showCrud, token, user?.role]);

  if (authLoading || user?.role !== "admin") {
    return null;
  }

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setShowCrud((current) => !current)}
          className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {showCrud ? "Fechar CRUD de eventos" : "Abrir CRUD de eventos"}
        </button>
      </div>

      {showCrud ? (
        loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Carregando eventos...
          </div>
        ) : error ? (
          <Notice title="Erro ao carregar CRUD" variant="warning">
            {error}
          </Notice>
        ) : (
          <AdminEventsPanel events={events} token={token} />
        )
      ) : null}
    </section>
  );
}
