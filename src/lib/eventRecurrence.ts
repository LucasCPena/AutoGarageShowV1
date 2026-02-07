import type { EventRecurrence } from "@/lib/database";

const DAY_MS = 1000 * 60 * 60 * 24;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function withTime(date: Date, hours: number, minutes: number) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number,
  hours: number,
  minutes: number
) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  if (day > daysInMonth(year, month)) return null;
  return withTime(new Date(year, month, day), hours, minutes);
}

export function getSpanDays(startAt: string, endAt?: string) {
  if (!endAt) return 1;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  const diff = Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS);
  return Math.max(1, diff + 1);
}

function buildPushWithSpan(spanDays: number, hours: number, minutes: number, bucket: string[]) {
  return (baseDate: Date) => {
    for (let offset = 0; offset < spanDays; offset++) {
      const day = addDays(baseDate, offset);
      const withClock = withTime(day, hours, minutes);
      bucket.push(withClock.toISOString());
    }
  };
}

function parseSpecificDate(dateText: string, defaultHours: number, defaultMinutes: number) {
  const trimmed = dateText.trim();
  const onlyDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  const isoText = onlyDate ? `${trimmed}T${pad(defaultHours)}:${pad(defaultMinutes)}:00` : trimmed;
  const date = new Date(isoText);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampInt(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeRecurrence(raw: unknown, startAt: string): EventRecurrence {
  const base = new Date(startAt);
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const baseDay = safeBase.getDate();
  const baseWeekday = safeBase.getDay();
  const baseMonth = safeBase.getMonth() + 1;
  const baseHours = safeBase.getHours();
  const baseMinutes = safeBase.getMinutes();

  const data = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const type = typeof data.type === "string" ? data.type : "single";

  const toNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  switch (type) {
    case "weekly": {
      const dayOfWeek = clampInt(toNumber(data.dayOfWeek, baseWeekday), 0, 6, baseWeekday);
      const generateWeeks = clampInt(toNumber(data.generateWeeks, 12), 1, 104, 12);
      return { type: "weekly", dayOfWeek, generateWeeks };
    }

    case "monthly": {
      const dayOfMonth = clampInt(toNumber(data.dayOfMonth, baseDay), 1, 31, baseDay);
      const generateMonths = clampInt(toNumber(data.generateMonths, 12), 1, 36, 12);
      return { type: "monthly", dayOfMonth, generateMonths };
    }

    case "monthly_weekday": {
      const weekday = clampInt(toNumber((data as any).weekday ?? (data as any).dayOfWeek, baseWeekday), 0, 6, baseWeekday);
      const nth = clampInt(toNumber((data as any).nth, 1), 1, 5, 1);
      const generateMonths = clampInt(toNumber(data.generateMonths, 12), 1, 36, 12);
      return { type: "monthly_weekday", weekday, nth, generateMonths };
    }

    case "annual": {
      const month = clampInt(toNumber(data.month, baseMonth), 1, 12, baseMonth);
      const day = clampInt(toNumber(data.day, baseDay), 1, 31, baseDay);
      const generateYears = clampInt(toNumber(data.generateYears, 5), 1, 10, 5);
      return { type: "annual", month, day, generateYears };
    }

    case "specific": {
      const datesInput = Array.isArray((data as any).dates)
        ? (data as any).dates
        : typeof (data as any).dates === "string"
          ? [(data as any).dates]
          : [];

      const dates: string[] = datesInput
        .map((value: string) => (typeof value === "string" ? value : ""))
        .map((value: string) => {
          const trimmed = value.trim();
          if (!trimmed) return null;

          // Accept "YYYY-MM-DD HH:mm" by turning space into "T"
          const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(trimmed)
            ? trimmed.replace(/\s+/, "T")
            : trimmed;

          const parsed = parseSpecificDate(normalized, baseHours, baseMinutes);
          return parsed ? parsed.toISOString() : null;
        })
        .filter((v: string | null): v is string => Boolean(v));

      return { type: "specific", dates: Array.from(new Set(dates)).sort() };
    }

    default:
      return { type: "single" };
  }
}

/**
 * Generate occurrences for an event based on its recurrence rule.
 * Supports multi-day spans (startAt..endAt) and monthly "nº dia da semana".
 */
export function generateEventOccurrences(
  startAt: string,
  recurrence: EventRecurrence,
  endAt?: string
): string[] {
  const base = new Date(startAt);
  if (!Number.isFinite(base.getTime())) return [];

  const hours = base.getHours();
  const minutes = base.getMinutes();
  const spanDays = getSpanDays(startAt, endAt);

  const occurrences: string[] = [];
  const pushWithSpan = buildPushWithSpan(spanDays, hours, minutes, occurrences);

  switch (recurrence.type) {
    case "single": {
      pushWithSpan(base);
      break;
    }

    case "weekly": {
      const targetDay = recurrence.dayOfWeek ?? base.getDay();
      const weeks = recurrence.generateWeeks ?? 12;

      let current = new Date(base);
      while (current.getDay() !== targetDay) {
        current = addDays(current, 1);
      }

      for (let i = 0; i < weeks; i++) {
        const occ = addDays(current, i * 7);
        pushWithSpan(occ);
      }
      break;
    }

    case "monthly": {
      const months = recurrence.generateMonths ?? 12;
      const dayOfMonth = recurrence.dayOfMonth ?? base.getDate();

      for (let i = 0; i < months; i++) {
        const year = base.getFullYear() + Math.floor((base.getMonth() + i) / 12);
        const month = (base.getMonth() + i) % 12;
        const day = Math.min(dayOfMonth, daysInMonth(year, month));
        pushWithSpan(withTime(new Date(year, month, day), hours, minutes));
      }
      break;
    }

    case "monthly_weekday": {
      const months = recurrence.generateMonths ?? 12;
      const weekday = recurrence.weekday ?? base.getDay();
      const nth = recurrence.nth ?? 1;

      for (let i = 0; i < months; i++) {
        const year = base.getFullYear() + Math.floor((base.getMonth() + i) / 12);
        const month = (base.getMonth() + i) % 12;
        const date = nthWeekdayOfMonth(year, month, weekday, nth, hours, minutes);
        if (date) {
          pushWithSpan(date);
        }
      }
      break;
    }

    case "annual": {
      const years = recurrence.generateYears ?? 5;
      const month = (recurrence.month ?? base.getMonth() + 1) - 1;
      const day = recurrence.day ?? base.getDate();

      for (let i = 0; i < years; i++) {
        const year = base.getFullYear() + i;
        const safeDay = Math.min(day, daysInMonth(year, month));
        pushWithSpan(withTime(new Date(year, month, safeDay), hours, minutes));
      }
      break;
    }

    case "specific": {
      (recurrence.dates ?? []).forEach((dateText) => {
        const parsed = parseSpecificDate(dateText, hours, minutes);
        if (parsed) {
          pushWithSpan(parsed);
        }
      });
      break;
    }

    default: {
      pushWithSpan(base);
    }
  }

  return occurrences.sort();
}

/**
 * Helper to format a recurrence pattern for display.
 */
export function formatRecurrence(recurrence: EventRecurrence, spanDays = 1): string {
  const daySuffix = spanDays > 1 ? ` (duração ${spanDays} dias)` : "";

  switch (recurrence.type) {
    case "single":
      return `Evento único${daySuffix}`;

    case "weekly": {
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      return `${dayNames[recurrence.dayOfWeek ?? 0]}s • ${recurrence.generateWeeks ?? 12} semanas${daySuffix}`;
    }

    case "monthly":
      return `Todo dia ${recurrence.dayOfMonth ?? ""} • ${recurrence.generateMonths ?? 12} meses${daySuffix}`;

    case "monthly_weekday": {
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      return `${recurrence.nth ?? 1}º ${dayNames[recurrence.weekday ?? 0]} de cada mês${daySuffix}`;
    }

    case "annual": {
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const monthLabel = monthNames[(recurrence.month ?? 1) - 1];
      return `${recurrence.day ?? ""} de ${monthLabel} • ${recurrence.generateYears ?? 5} anos${daySuffix}`;
    }

    case "specific":
      return `${recurrence.dates?.length ?? 0} data(s) específica(s)${daySuffix}`;

    default:
      return `Recorrência desconhecida${daySuffix}`;
  }
}
