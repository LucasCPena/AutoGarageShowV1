import { NextRequest, NextResponse } from 'next/server';

import { getUserFromToken } from '@/lib/auth-middleware';
import { db, isMysqlRequiredError } from '@/lib/database';
import { normalizeRecurrence } from '@/lib/eventRecurrence';
import { normalizeAssetReference } from '@/lib/site-url';
import { normalizeYouTubeUrl } from '@/lib/youtube';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parseIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function defaultFeaturedUntil(startAtIso: string) {
  const date = new Date(startAtIso);
  if (!Number.isFinite(date.getTime())) return undefined;
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const user = getUserFromToken(request);

    let events = await db.events.getAll();

    // Admin enxerga tudo e pode filtrar por status; publico ve apenas aprovados.
    if (user?.role === 'admin') {
      if (status) {
        events = events.filter((event) => event.status === status);
      }
    } else {
      events = events.filter((event) => event.status === 'approved');
    }

    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(
      { events },
      {
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
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
    let settings = null;
    try {
      settings = await db.settings.get();
    } catch (settingsError) {
      // Nao bloquear o cadastro de evento se a tabela de settings estiver indisponivel.
      console.error('Falha ao carregar configuracoes para evento:', settingsError);
    }

    const requiredFields = ['title', 'description', 'city', 'state', 'location', 'startAt', 'contactName', 'contactPhone'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} e obrigatorio` },
          { status: 400 }
        );
      }
    }

    const startDate = new Date(eventData.startAt);
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: 'Data de inicio invalida' },
        { status: 400 }
      );
    }

    let endAtIso: string | undefined;
    if (eventData.endAt) {
      const endDate = new Date(eventData.endAt);
      if (Number.isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Data de termino invalida' },
          { status: 400 }
        );
      }
      if (endDate.getTime() < startDate.getTime()) {
        return NextResponse.json(
          { error: 'A data de termino nao pode ser anterior ao inicio' },
          { status: 400 }
        );
      }
      endAtIso = endDate.toISOString();
    }

    const recurrence = normalizeRecurrence(eventData.recurrence, startDate.toISOString());

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
          .filter((value: string | undefined): value is string => Boolean(value))
          .filter((value: string) => !value.startsWith('data:'))
      : [];

    const normalizedCoverImage = normalizeAssetReference(eventData.coverImage);
    if (typeof normalizedCoverImage === 'string' && normalizedCoverImage.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Capa invalida. Envie a imagem via upload para gerar URL publica.' },
        { status: 400 }
      );
    }
    const coverImage = normalizedCoverImage || images[0];

    const normalizedOrganizerLogo = normalizeAssetReference(eventData.organizerLogo);
    if (typeof normalizedOrganizerLogo === 'string' && normalizedOrganizerLogo.startsWith('data:')) {
      return NextResponse.json(
        { error: 'Logo do organizador invalido. Envie a imagem via upload para gerar URL publica.' },
        { status: 400 }
      );
    }
    const organizerLogo = normalizedOrganizerLogo || undefined;

    const liveUrlInput = typeof eventData.liveUrl === 'string' ? eventData.liveUrl.trim() : '';
    const liveUrl = liveUrlInput ? normalizeYouTubeUrl(liveUrlInput) : undefined;
    if (liveUrlInput && !liveUrl) {
      return NextResponse.json(
        { error: 'URL de transmissao ao vivo invalida. Informe um link do YouTube.' },
        { status: 400 }
      );
    }

    const canManageFeatured = user?.role === 'admin';
    const featured = canManageFeatured ? Boolean(eventData.featured) : false;
    const parsedFeaturedUntil = canManageFeatured
      ? parseIsoDate(eventData.featuredUntil)
      : undefined;

    if (featured && canManageFeatured && eventData.featuredUntil && !parsedFeaturedUntil) {
      return NextResponse.json(
        { error: 'Data de destaque invalida.' },
        { status: 400 }
      );
    }

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
      contactPhone: String(eventData.contactPhone || '').trim(),
      contactPhoneSecondary: String(eventData.contactPhoneSecondary || '').trim() || undefined,
      contactEmail: String(eventData.contactEmail || '').trim() || undefined,
      images,
      coverImage,
      organizerLogo,
      liveUrl,
      featured,
      featuredUntil: featured
        ? parsedFeaturedUntil || defaultFeaturedUntil(startDate.toISOString())
        : undefined
    });

    return NextResponse.json(
      {
        event,
        message: shouldAutoApprove
          ? 'Evento criado e aprovado automaticamente (admin ou aprovacao desativada).'
          : 'Evento criado e enviado para aprovacao.'
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
