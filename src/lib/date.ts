export function formatDateShort(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  }).format(date);
}

export function formatDateLong(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function formatTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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
