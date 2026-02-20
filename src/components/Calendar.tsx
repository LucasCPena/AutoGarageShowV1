"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import Notice from "@/components/Notice";
import type { Event } from "@/lib/database";
import { formatDateShort } from "@/lib/date";
import { generateEventOccurrences } from "@/lib/eventRecurrence";

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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

export default function Calendar({ events }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

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
        const key = formatDateShort(occ);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(event);
      });
    });
    return map;
  }, [events]);

  function changeMonth(delta: number) {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  const monthLabel = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{monthLabel}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="h-8 w-8 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="h-8 w-8 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const key = formatDateShort(day);
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
                  <Link
                    key={event.id}
                    href={`/eventos/${event.slug}`}
                    className="block truncate rounded bg-brand-100 px-1 py-0.5 text-xs leading-tight text-brand-800 hover:bg-brand-200"
                    title={event.title}
                  >
                    {event.title}
                  </Link>
                ))}

                {dayEvents.length > 2 && (
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
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <Notice title="Dica" variant="info">
          Clique em qualquer evento para ver detalhes. Apenas eventos aprovados aparecem neste calendário.
        </Notice>
      </div>
    </div>
  );
}
