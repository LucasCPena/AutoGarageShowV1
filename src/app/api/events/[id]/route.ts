import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromToken, requireAuth } from '@/lib/auth-middleware';
import { normalizeRecurrence } from '@/lib/eventRecurrence';
import { normalizeAssetReference } from '@/lib/site-url';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function sanitizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeImageList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((item) => normalizeAssetReference(item))
    .filter((item): item is string => Boolean(item));
}

function hasMedia(images: string[], videos: string[]) {
  return images.length > 0 || videos.length > 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    const event = await db.events.findById(params.id);

    if (!event) {
      return NextResponse.json(
        { error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    // Apenas admin ou criador podem ver pendentes; publico so eventos aprovados
    if (
      event.status !== 'approved' &&
      user?.role !== 'admin' &&
      user?.id !== event.createdBy
    ) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const pastEvent = await db.pastEvents.findByEventId(event.id);

    return NextResponse.json({ event, pastEvent });
  } catch (error) {
    console.error('Erro ao buscar evento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const updateData = await request.json();
    const existing = await db.events.findById(params.id);

    if (!existing) {
      return NextResponse.json(
        { error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && existing.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Voce nao tem permissao para editar este evento' },
        { status: 403 }
      );
    }

    let newSlug = existing.slug;
    if (updateData.title && updateData.title !== existing.title) {
      newSlug = slugify(updateData.title);
      const conflict = await db.events.findBySlug(newSlug);
      if (conflict && conflict.id !== existing.id) {
        newSlug = `${newSlug}-${crypto.randomUUID().slice(0, 6)}`;
      }
    }

    let nextStatus = existing.status;
    const allowedStatus = ['pending', 'approved', 'completed'] as const;

    if (user.role === 'admin') {
      if (updateData.status && allowedStatus.includes(updateData.status)) {
        nextStatus = updateData.status;
      }
    } else {
      // Edicao de usuario comum volta para pendente ate aprovacao
      nextStatus = 'pending';
    }

    const baseStart = new Date(updateData.startAt ?? existing.startAt);
    if (Number.isNaN(baseStart.getTime())) {
      return NextResponse.json(
        { error: 'Data de inicio invalida' },
        { status: 400 }
      );
    }

    let endAtIso = existing.endAt;
    if (updateData.endAt !== undefined) {
      if (!updateData.endAt) {
        endAtIso = undefined;
      } else {
        const endDate = new Date(updateData.endAt);
        if (Number.isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: 'Data de termino invalida' },
            { status: 400 }
          );
        }
        endAtIso = endDate.toISOString();
      }
    }

    if (endAtIso && new Date(endAtIso).getTime() < baseStart.getTime()) {
      return NextResponse.json(
        { error: 'A data de termino nao pode ser anterior ao inicio' },
        { status: 400 }
      );
    }

    const recurrence = normalizeRecurrence(
      updateData.recurrence ?? existing.recurrence,
      baseStart.toISOString()
    );

    const nextImages =
      updateData.images !== undefined
        ? sanitizeImageList(updateData.images)
        : (existing.images ?? []);

    const providedCoverImage =
      normalizeAssetReference(updateData.coverImage);
    const nextCoverImage =
      providedCoverImage ||
      normalizeAssetReference(existing.coverImage) ||
      nextImages[0];
    const nextContactDocument =
      typeof updateData.contactDocument === 'string'
        ? updateData.contactDocument.trim() || 'nao informado'
        : (existing.contactDocument || 'nao informado');

    const pastPayload =
      updateData.pastEvent && typeof updateData.pastEvent === 'object'
        ? updateData.pastEvent
        : null;
    const existingPastEvent = await db.pastEvents.findByEventId(existing.id);

    const nextPastImages =
      pastPayload && 'images' in pastPayload
        ? sanitizeImageList((pastPayload as { images?: unknown }).images)
        : existingPastEvent?.images ?? nextImages;
    const nextPastVideos =
      pastPayload && 'videos' in pastPayload
        ? sanitizeStringList((pastPayload as { videos?: unknown }).videos)
        : existingPastEvent?.videos ?? [];

    const canBeCompleted = hasMedia(nextPastImages, nextPastVideos);

    if (nextStatus === 'completed' && !canBeCompleted) {
      return NextResponse.json(
        {
          error:
            'Para marcar como realizado, adicione ao menos uma foto ou link de video.'
        },
        { status: 400 }
      );
    }

    const hasEnded = baseStart.getTime() <= Date.now();
    if (user.role === 'admin' && canBeCompleted && hasEnded && nextStatus !== 'pending') {
      nextStatus = 'completed';
    }

    const sanitizedUpdates = {
      ...updateData,
      startAt: baseStart.toISOString(),
      endAt: endAtIso,
      recurrence,
      slug: newSlug,
      status: nextStatus,
      contactDocument: nextContactDocument,
      images: nextImages,
      coverImage: nextCoverImage,
      createdBy: existing.createdBy // impedir troca de autoria
    } as Record<string, unknown>;

    delete sanitizedUpdates.pastEvent;

    const event = await db.events.update(params.id, sanitizedUpdates as Partial<typeof existing>);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    let pastEvent = existingPastEvent;
    if (canBeCompleted || existingPastEvent || pastPayload) {
      const descriptionFromPayload =
        pastPayload && typeof (pastPayload as { description?: unknown }).description === 'string'
          ? (pastPayload as { description?: string }).description?.trim()
          : undefined;
      const attendanceRaw =
        pastPayload && 'attendance' in pastPayload
          ? Number((pastPayload as { attendance?: unknown }).attendance)
          : NaN;
      const attendance =
        Number.isFinite(attendanceRaw) && attendanceRaw >= 0
          ? Math.round(attendanceRaw)
          : (existingPastEvent?.attendance ?? 0);

      if (pastEvent) {
        pastEvent = await db.pastEvents.update(pastEvent.id, {
          slug: pastEvent.slug || newSlug,
          title: event.title,
          city: event.city,
          state: event.state,
          date: event.startAt,
          images: nextPastImages,
          videos: nextPastVideos,
          description: descriptionFromPayload || pastEvent.description || event.description,
          attendance
        });
      } else if (canBeCompleted) {
        let pastSlug = newSlug || slugify(event.title) || `evento-${event.id.slice(0, 8)}`;
        const allPastEvents = await db.pastEvents.getAll();
        while (allPastEvents.some((item) => item.slug === pastSlug)) {
          pastSlug = `${pastSlug}-${crypto.randomUUID().slice(0, 4)}`;
        }

        pastEvent = await db.pastEvents.create({
          eventId: event.id,
          slug: pastSlug,
          title: event.title,
          city: event.city,
          state: event.state,
          date: event.startAt,
          images: nextPastImages,
          videos: nextPastVideos,
          description: descriptionFromPayload || event.description,
          attendance,
          updatedAt: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({
      event,
      pastEvent,
      message: 'Evento atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    if (error instanceof Error && error.message === 'Nao autorizado') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const event = await db.events.findById(params.id);

    if (!event) {
      return NextResponse.json(
        { error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Somente administradores podem excluir eventos (acao imediata).' },
        { status: 403 }
      );
    }

    await db.events.delete(params.id);

    return NextResponse.json(
      { message: 'Evento excluido com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    if (error instanceof Error && error.message === 'Nao autorizado') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

