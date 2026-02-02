import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const events = await db.events.getAll();
    const pending = events.filter(event => event.status === 'pending');
    return NextResponse.json({ events: pending });
  } catch (error) {
    console.error('Erro ao buscar eventos pendentes:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
