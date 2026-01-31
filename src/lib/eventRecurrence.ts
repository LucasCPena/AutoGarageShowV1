import type { EventRecurrence } from "@/lib/mockData";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Generate future occurrences for an event based on its recurrence.
 * Returns an array of ISO date strings (startAt values).
 */
export function generateEventOccurrences(startAt: string, recurrence: EventRecurrence): string[] {
  const base = new Date(startAt);
  if (!Number.isFinite(base.getTime())) return [];

  switch (recurrence.type) {
    case "single": {
      return [startAt];
    }

    case "weekly": {
      const occurrences: string[] = [];
      const targetDay = recurrence.dayOfWeek; // 0=Sunday..6=Saturday
      const weeks = recurrence.generateWeeks;

      // Find the first occurrence on or after the base date that matches the target day
      let current = new Date(base);
      while (current.getDay() !== targetDay) {
        current.setDate(current.getDate() + 1);
      }

      // Generate the requested number of weekly occurrences
      for (let i = 0; i < weeks; i++) {
        const occ = new Date(current);
        occ.setDate(occ.getDate() + i * 7);
        occurrences.push(occ.toISOString());
      }

      return occurrences;
    }

    case "monthly": {
      const occurrences: string[] = [];
      const dayOfMonth = recurrence.dayOfMonth;
      const months = recurrence.generateMonths;

      for (let i = 0; i < months; i++) {
        const occ = new Date(base);
        occ.setMonth(occ.getMonth() + i);
        occ.setDate(Math.min(dayOfMonth, daysInMonth(occ.getFullYear(), occ.getMonth())));
        occurrences.push(occ.toISOString());
      }

      return occurrences;
    }

    case "annual": {
      const occurrences: string[] = [];
      const month = recurrence.month - 1; // JS months are 0-indexed
      const day = recurrence.day;
      const years = recurrence.generateYears;

      for (let i = 0; i < years; i++) {
        const occ = new Date(base);
        occ.setFullYear(occ.getFullYear() + i);
        occ.setMonth(month);
        occ.setDate(Math.min(day, daysInMonth(occ.getFullYear(), month)));
        occurrences.push(occ.toISOString());
      }

      return occurrences;
    }

    case "specific": {
      return recurrence.dates.slice().sort();
    }

    default: {
      return [startAt];
    }
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Helper to format a recurrence pattern for display.
 */
export function formatRecurrence(recurrence: EventRecurrence): string {
  switch (recurrence.type) {
    case "single":
      return "Evento único";

    case "weekly":
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      return `${dayNames[recurrence.dayOfWeek]}s (por ${recurrence.generateWeeks} semanas)`;

    case "monthly":
      return `Todo dia ${recurrence.dayOfMonth} (por ${recurrence.generateMonths} meses)`;

    case "annual": {
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      return `${monthNames[recurrence.month - 1]} ${recurrence.day} (por ${recurrence.generateYears} anos)`;
    }

    case "specific":
      return `${recurrence.dates.length} data(s) específica(s)`;

    default:
      return "Recorrência desconhecida";
  }
}
