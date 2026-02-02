import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

type AdminAction = 'approve' | 'complete' | 'delete';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const { action }: { action: AdminAction } = await request.json();

    if (!['approve', 'complete', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida. Use "approve", "complete" ou "delete".' },
        { status: 400 }
      );
    }

    const event = await db.events.findById(params.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    if (action === 'delete') {
      await db.events.delete(params.id);
      return NextResponse.json({ message: 'Evento excluído com sucesso' });
    }

    const nextStatus = action === 'approve' ? 'approved' : 'completed';
    const updated = await db.events.update(params.id, { status: nextStatus });

    return NextResponse.json({
      event: updated,
      message:
        action === 'approve'
          ? 'Evento aprovado e publicado.'
          : 'Evento marcado como realizado.'
    });
  } catch (error) {
    console.error('Erro ao aprovar/rejeitar evento:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
