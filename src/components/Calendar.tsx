"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import Notice from "@/components/Notice";
import { generateEventOccurrences } from "@/lib/eventRecurrence";
import type { Event } from "@/lib/mockData";
import { formatDateLong, formatDateShort, formatTime } from "@/lib/date";

const DAY_MS = 1000 * 60 * 60 * 24;

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
      const occurrences = generateEventOccurrences(event.startAt, event.recurrence);
      occurrences.forEach((occ) => {
        const occDate = new Date(occ);
        const key = formatDateShort(occDate);
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">{monthLabel}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="h-8 w-8 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="h-8 w-8 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600 mb-2">
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
                min-h-[80px] p-1 border rounded-lg
                ${isCurrentMonth ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"}
                ${isCurrentDay ? "ring-2 ring-brand-500" : ""}
              `}
            >
              <div className={`text-xs font-semibold ${isCurrentMonth ? "text-slate-900" : "text-slate-400"}`}>
                {day.getDate()}
              </div>

              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <Link
                    key={event.id}
                    href={`/eventos/${event.slug}`}
                    className="block text-xs leading-tight rounded px-1 py-0.5 bg-brand-100 text-brand-800 hover:bg-brand-200 truncate"
                    title={event.title}
                  >
                    {event.title}
                  </Link>
                ))}

                {dayEvents.length > 3 && (
                  <div className="text-xs text-slate-500">+{dayEvents.length - 3}</div>
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
