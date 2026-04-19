"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Event } from "@/lib/database";
import { toDateKey } from "@/lib/date";
import { generateEventOccurrences } from "@/lib/eventRecurrence";
import { useAuth } from "@/lib/useAuth";

type Props = {
  events: Event[];
};

function daysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), daysInMonth(date));
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function Calendar({ events }: Props) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = addDays(startOfWeek(monthEnd), 6);

  const days = useMemo(() => {
    const arr: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      arr.push(new Date(day));
      day = addDays(day, 1);
    }
    return arr;
  }, [calendarStart, calendarEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((event) => {
      const occurrences = generateEventOccurrences(event.startAt, event.recurrence, event.endAt);
      occurrences.forEach((occ) => {
        const key = toDateKey(occ);
        if (!map.has(key)) map.set(key, []);
        map.get(key)?.push(event);
      });
    });
    return map;
  }, [events]);

  function changeMonth(delta: number) {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  async function handleDeleteSelectedEvent() {
    if (!selectedEvent || !token) {
      setActionError("Sessão expirada. Faça login novamente.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    setDeleting(true);
    setActionError(null);

    try {
      const response = await fetch(`/api/events/${selectedEvent.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível excluir o evento.");
      }

      setSelectedEvent(null);
      setSelectedDateKey(null);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Não foi possível excluir o evento."
      );
    } finally {
      setDeleting(false);
    }
  }

  const monthLabel = currentMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
  const canManageSelectedEvent =
    selectedEvent &&
    user &&
    (user.role === "admin" || user.id === selectedEvent.createdBy);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{monthLabel}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="h-8 w-8 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="Mes anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="h-8 w-8 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="Próximo mes"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const key = toDateKey(day);
          const dayEvents = eventsByDay.get(key) || [];
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isCurrentDay = isToday(day);

          return (
            <div
              key={i}
              className={`
                min-h-[80px] rounded-lg border p-1
                ${isCurrentMonth ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}
                ${isCurrentDay ? "ring-2 ring-brand-500" : ""}
              `}
            >
              <div className={`text-xs font-semibold ${isCurrentMonth ? "text-slate-900" : "text-slate-400"}`}>
                {day.getDate()}
              </div>

              <div className="mt-1 space-y-1">
                {(expandedDays[key] ? dayEvents : dayEvents.slice(0, 2)).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvent(event);
                      setSelectedDateKey(key);
                      setActionError(null);
                    }}
                    className="block w-full truncate rounded bg-brand-100 px-1 py-0.5 text-left text-xs leading-tight text-brand-800 hover:bg-brand-200"
                    title={event.title}
                  >
                    {event.title}
                  </button>
                ))}

                {dayEvents.length > 2 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDays((prev) => ({
                        ...prev,
                        [key]: !prev[key]
                      }))
                    }
                    className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {expandedDays[key] ? "Mostrar menos" : `+${dayEvents.length - 2} mais`}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Selecione um evento no calendario para abrir os detalhes e, quando permitido, editar ou excluir.
      </div>

      {selectedEvent ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedEvent(null)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {selectedDateKey || "Evento"}
                </div>
                <h3 className="mt-2 text-xl font-bold text-slate-900">
                  {selectedEvent.title}
                </h3>
                <div className="mt-2 text-sm text-slate-600">
                  {selectedEvent.city}/{selectedEvent.state} • {selectedEvent.location}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div>
                Início: <strong>{formatDateTime(selectedEvent.startAt)}</strong>
              </div>
              {selectedEvent.endAt ? (
                <div className="mt-1">
                  Fim: <strong>{formatDateTime(selectedEvent.endAt)}</strong>
                </div>
              ) : null}
              <p className="mt-3 whitespace-pre-line">{selectedEvent.description}</p>
            </div>

            {actionError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {actionError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/eventos/${selectedEvent.slug}`}
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver detalhes
              </Link>

              {canManageSelectedEvent ? (
                <Link
                  href={`/eventos/gerenciar/${selectedEvent.id}`}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Editar evento
                </Link>
              ) : null}

              {canManageSelectedEvent ? (
                <button
                  type="button"
                  onClick={handleDeleteSelectedEvent}
                  disabled={deleting}
                  className="inline-flex h-11 items-center justify-center rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {deleting ? "Excluindo..." : "Excluir evento"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
