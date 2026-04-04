const EVENT_TIME_ZONE = "America/Sao_Paulo";

function toDate(iso: string | Date) {
  return typeof iso === "string" ? new Date(iso) : iso;
}

function formatInEventTimeZone(iso: string | Date, options: Intl.DateTimeFormatOptions) {
  const date = toDate(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: EVENT_TIME_ZONE,
    ...options
  }).format(date);
}

export function formatDateShort(iso: string | Date) {
  return formatInEventTimeZone(iso, {
    day: "2-digit",
    month: "short"
  });
}

export function toDateKey(iso: string | Date) {
  if (iso instanceof Date) {
    if (!Number.isFinite(iso.getTime())) return "";
    const year = iso.getFullYear();
    const month = String(iso.getMonth() + 1).padStart(2, "0");
    const day = String(iso.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

export function formatDateLong(iso: string | Date) {
  return formatInEventTimeZone(iso, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export function formatDateTime(iso: string | Date) {
  return formatInEventTimeZone(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatTime(iso: string) {
  return formatInEventTimeZone(iso, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function isWithinNextDays(iso: string, days: number) {
  const now = Date.now();
  const target = new Date(iso).getTime();
  const diffDays = (target - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now();
}
