import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';
import { getUserFromToken } from '@/lib/auth-middleware';
import { normalizeRecurrence } from '@/lib/eventRecurrence';
import { normalizeAssetReference } from '@/lib/site-url';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const user = getUserFromToken(request);
    
    let events = await db.events.getAll();
    
    // Admin enxerga tudo e pode filtrar por status; público vê apenas aprovados
    if (user?.role === 'admin') {
      if (status) {
        events = events.filter(event => event.status === status);
      }
    } else {
      events = events.filter(event => event.status === 'approved');
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
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

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromToken(request);
    const eventData = await request.json();
    const settings = await db.settings.get();
    
    // Validar campos obrigatórios
    const requiredFields = ['title', 'description', 'city', 'state', 'location', 'startAt', 'contactName'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} é obrigatório` },
          { status: 400 }
        );
      }
    }
    
    // Validar data
    const startDate = new Date(eventData.startAt);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Data de início inválida' },
        { status: 400 }
      );
    }

    let endAtIso: string | undefined;
    if (eventData.endAt) {
      const endDate = new Date(eventData.endAt);
      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Data de término inválida' },
          { status: 400 }
        );
      }
      if (endDate.getTime() < startDate.getTime()) {
        return NextResponse.json(
          { error: 'A data de término não pode ser anterior ao início' },
          { status: 400 }
        );
      }
      endAtIso = endDate.toISOString();
    }
    
    const recurrence = normalizeRecurrence(eventData.recurrence, startDate.toISOString());

    // Criar slug a partir do título e garantir unicidade
    let slug = slugify(eventData.title);
    const existingEvent = await db.events.findBySlug(slug);
    if (existingEvent) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
    }
    
    const requireApproval = settings?.events?.requireApproval ?? true;
    const shouldAutoApprove = user?.role === 'admin' || requireApproval === false;
    const status: 'approved' | 'pending' = shouldAutoApprove ? 'approved' : 'pending';
    
    const images = Array.isArray(eventData.images)
      ? eventData.images
          .map((value: unknown) => normalizeAssetReference(value))
          .filter((value): value is string => Boolean(value))
      : [];

    const coverImage =
      normalizeAssetReference(eventData.coverImage) ||
      images[0];

    const event = await db.events.create({
      ...eventData,
      startAt: startDate.toISOString(),
      endAt: endAtIso,
      slug,
      status,
      recurrence,
      createdBy: user?.id || 'anonymous',
      contactName: String(eventData.contactName || '').trim(),
      contactDocument: String(eventData.contactDocument || '').trim() || 'nao informado',
      contactPhone: eventData.contactPhone,
      contactEmail: eventData.contactEmail,
      images,
      coverImage
    });
    
    return NextResponse.json(
      { 
        event, 
        message: shouldAutoApprove 
          ? 'Evento criado e aprovado automaticamente (admin ou aprovação desativada).' 
          : 'Evento criado e enviado para aprovação.' 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar evento:', error);
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
