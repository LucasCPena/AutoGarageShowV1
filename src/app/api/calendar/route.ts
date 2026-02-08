import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';
import { generateEventOccurrences } from '@/lib/eventRecurrence';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let events = await db.events.getAll();
    events = events.filter((event) => event.status === 'approved');

    const targetYear = year ? parseInt(year, 10) : null;
    const targetMonth = month ? parseInt(month, 10) - 1 : null;

    const enriched = events.map((event) => {
      let occurrences = generateEventOccurrences(event.startAt, event.recurrence, event.endAt);

      if (targetYear !== null && targetMonth !== null) {
        occurrences = occurrences.filter((iso) => {
          const d = new Date(iso);
          return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        });
      }

      return {
        ...event,
        dates: occurrences,
        occurrences
      };
    });

    return NextResponse.json({ events: enriched });
  } catch (error) {
    console.error('Erro ao buscar calendario:', error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: 'Banco de dados indisponivel no momento.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
