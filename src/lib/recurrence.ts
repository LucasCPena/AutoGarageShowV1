type MonthlyPattern = {
  nth: number;
  weekday: number;
  label: string;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseNth(label: string) {
  const normalized = normalize(label);
  const match = normalized.match(/(\d+)\s*(?:o|º)/) ?? normalized.match(/(\d+)/);
  if (!match) return null;
  const nth = Number(match[1]);
  return Number.isFinite(nth) ? nth : null;
}

function parseWeekday(label: string) {
  const normalized = normalize(label);
  if (normalized.includes("domingo")) return 0;
  if (normalized.includes("segunda")) return 1;
  if (normalized.includes("terca")) return 2;
  if (normalized.includes("quarta")) return 3;
  if (normalized.includes("quinta")) return 4;
  if (normalized.includes("sexta")) return 5;
  if (normalized.includes("sabado")) return 6;
  return null;
}

export function parseMonthlyPattern(patternLabel: string): MonthlyPattern | null {
  const nth = parseNth(patternLabel);
  const weekday = parseWeekday(patternLabel);

  if (!nth || weekday === null) return null;

  return {
    nth,
    weekday,
    label: patternLabel
  };
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  nth: number,
  hour: number,
  minute: number
) {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  if (day > daysInMonth(year, monthIndex)) return null;

  return new Date(year, monthIndex, day, hour, minute, 0, 0);
}

export function generateMonthlyOccurrences(
  startAtIso: string,
  patternLabel: string,
  months: number
) {
  const start = new Date(startAtIso);
  const pattern = parseMonthlyPattern(patternLabel);

  const hour = start.getHours();
  const minute = start.getMinutes();

  const occurrences: string[] = [];

  for (let i = 0; i < months; i++) {
    const monthIndex = start.getMonth() + i;
    const year = start.getFullYear() + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;

    const date = pattern
      ? nthWeekdayOfMonth(year, month, pattern.weekday, pattern.nth, hour, minute)
      : new Date(year, month, start.getDate(), hour, minute, 0, 0);

    if (date) occurrences.push(date.toISOString());
  }

  return occurrences;
}
