"use client";

import { useMemo, useState } from "react";
import type { EventRecurrence } from "@/lib/database";
import { formatDateShort, toDateKey } from "@/lib/date";
import { generateEventOccurrences } from "@/lib/eventRecurrence";

interface Event {
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  startAt: string;
  endAt?: string;
  recurrence: EventRecurrence;
  status: string;
}

interface CalendarWidgetProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export default function CalendarWidget({ events, onEventClick }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const eventsWithOccurrences = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        occurrences: generateEventOccurrences(event.startAt, event.recurrence, event.endAt)
      })),
    [events]
  );

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = toDateKey(date);
    return eventsWithOccurrences.filter((event) => {
      if (event.status !== "approved") return false;
      return event.occurrences.some((occ) => toDateKey(occ) === dateStr);
    });
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-8 border border-slate-100"></div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-8 border border-slate-100 p-1 cursor-pointer text-xs transition-colors ${
            isToday ? 'bg-brand-100 border-brand-300' : ''
          } ${isSelected ? 'bg-brand-200 border-brand-400' : ''}
          ${dayEvents.length > 0 ? 'bg-brand-50 hover:bg-brand-100' : 'hover:bg-slate-50'}
          ${dayEvents.length > 0 ? 'font-semibold text-brand-700' : 'text-slate-700'}
          relative`}
        >
          {day}
          {dayEvents.length > 0 && (
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-brand-600 rounded-full"></div>
          )}
        </div>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1 hover:bg-slate-100 rounded-md transition-colors"
        >
          ←
        </button>
        
        <h3 className="text-lg font-semibold text-slate-900">
          {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h3>
        
        <button
          onClick={() => navigateMonth(1)}
          className="p-1 hover:bg-slate-100 rounded-md transition-colors"
        >
          →
        </button>
      </div>

      <div className="mb-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-xs font-semibold text-slate-600 text-center">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
      </div>

      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">
            Eventos em {selectedDate.toLocaleDateString('pt-BR')}
          </h4>
          <div className="space-y-2">
            {selectedDateEvents.map(event => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="p-2 rounded-lg border border-slate-100 hover:border-brand-200 cursor-pointer transition-colors"
              >
                <div className="font-medium text-slate-900 text-sm">{event.title}</div>
                <div className="text-xs text-slate-600">
                  {event.city}/{event.state} • {formatDateShort(selectedDate || event.startAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4 mt-4">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-600 rounded-full"></div>
            <span className="text-slate-600">Evento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-brand-100 border border-brand-300 rounded"></div>
            <span className="text-slate-600">Hoje</span>
          </div>
        </div>
      </div>
    </div>
  );
}
