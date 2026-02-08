import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

type AdminAction = 'approve' | 'complete' | 'delete';

function hasMedia(images: string[] = [], videos: string[] = []) {
  return images.length > 0 || videos.length > 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const { action }: { action: AdminAction } = await request.json();

    if (!['approve', 'complete', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Acao invalida. Use "approve", "complete" ou "delete".' },
        { status: 400 }
      );
    }

    const event = await db.events.findById(params.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    if (action === 'delete') {
      await db.events.delete(params.id);
      return NextResponse.json({ message: 'Evento excluido com sucesso' });
    }

    if (action === 'complete') {
      const existingPastEvent = await db.pastEvents.findByEventId(event.id);
      const images = existingPastEvent?.images ?? event.images ?? [];
      const videos = existingPastEvent?.videos ?? [];

      if (!hasMedia(images, videos)) {
        return NextResponse.json(
          {
            error: 'Adicione fotos ou videos no evento antes de marcar como realizado.'
          },
          { status: 400 }
        );
      }

      if (existingPastEvent) {
        await db.pastEvents.update(existingPastEvent.id, {
          title: event.title,
          city: event.city,
          state: event.state,
          date: event.startAt,
          images,
          videos,
          description: existingPastEvent.description || event.description
        });
      } else {
        let slug = event.slug || event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const allPastEvents = await db.pastEvents.getAll();
        while (allPastEvents.some((item) => item.slug === slug)) {
          slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
        }

        await db.pastEvents.create({
          eventId: event.id,
          slug,
          title: event.title,
          city: event.city,
          state: event.state,
          date: event.startAt,
          images,
          videos,
          description: event.description,
          attendance: 0,
          updatedAt: new Date().toISOString()
        });
      }
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

