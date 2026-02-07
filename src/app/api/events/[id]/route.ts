import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserFromToken, requireAuth } from '@/lib/auth-middleware';
import { normalizeRecurrence } from '@/lib/eventRecurrence';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }
    
    // Apenas admin ou criador podem ver pendentes; público só eventos aprovados
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
    
    return NextResponse.json({ event });
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
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }
    
    if (user.role !== 'admin' && existing.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar este evento' },
        { status: 403 }
      );
    }
    
    // Se título mudou, recalcular slug (garantindo unicidade)
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
      // Edição de usuário comum volta para pendente até aprovação
      nextStatus = 'pending';
    }

    const baseStart = new Date(updateData.startAt ?? existing.startAt);
    if (Number.isNaN(baseStart.getTime())) {
      return NextResponse.json(
        { error: 'Data de início inválida' },
        { status: 400 }
      );
    }

    let endAtIso = existing.endAt;
    if (updateData.endAt !== undefined) {
      const endDate = new Date(updateData.endAt);
      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Data de término inválida' },
          { status: 400 }
        );
      }
      endAtIso = endDate.toISOString();
    }

    if (endAtIso && new Date(endAtIso).getTime() < baseStart.getTime()) {
      return NextResponse.json(
        { error: 'A data de término não pode ser anterior ao início' },
        { status: 400 }
      );
    }

    const recurrence = normalizeRecurrence(updateData.recurrence ?? existing.recurrence, baseStart.toISOString());
    
    const sanitizedUpdates = {
      ...updateData,
      startAt: baseStart.toISOString(),
      endAt: endAtIso,
      recurrence,
      slug: newSlug,
      status: nextStatus,
      createdBy: existing.createdBy // impedir troca de autoria
    };
    
    const event = await db.events.update(params.id, sanitizedUpdates);
    
    return NextResponse.json(
      { event, message: 'Evento atualizado com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    if (error instanceof Error && error.message === 'Não autorizado') {
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
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Somente administradores podem excluir eventos (ação imediata).' },
        { status: 403 }
      );
    }
    
    await db.events.delete(params.id);
    
    return NextResponse.json(
      { message: 'Evento excluído com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    if (error instanceof Error && error.message === 'Não autorizado') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
