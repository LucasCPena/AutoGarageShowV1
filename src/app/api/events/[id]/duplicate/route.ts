import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth-middleware';
import { db } from '@/lib/database';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function createUniqueSlug(base: string) {
  let slug = slugify(base) || `evento-${Date.now()}`;
  let suffix = 1;

  while (await db.events.findBySlug(slug)) {
    slug = `${slugify(base)}-${suffix++}`;
  }

  return slug;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const source = await db.events.findById(params.id);

    if (!source) {
      return NextResponse.json(
        { error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && source.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Voce nao tem permissao para duplicar este evento.' },
        { status: 403 }
      );
    }

    const duplicatedTitle = `${source.title} (copia)`;
    const slug = await createUniqueSlug(duplicatedTitle);

    const duplicated = await db.events.create({
      slug,
      title: duplicatedTitle,
      description: source.description,
      city: source.city,
      state: source.state,
      location: source.location,
      contactName: source.contactName,
      contactDocument: source.contactDocument,
      contactPhone: source.contactPhone,
      contactPhoneSecondary: source.contactPhoneSecondary,
      contactEmail: source.contactEmail,
      startAt: source.startAt,
      endAt: source.endAt,
      status: user.role === 'admin' ? 'approved' : 'pending',
      recurrence: source.recurrence,
      websiteUrl: source.websiteUrl,
      liveUrl: source.liveUrl,
      coverImage: source.coverImage,
      images: source.images || [],
      featured: false,
      featuredUntil: undefined,
      createdBy: user.id
    });

    return NextResponse.json(
      { event: duplicated, message: 'Evento duplicado com sucesso.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao duplicar evento:', error);
    if (error instanceof Error && error.message === 'Nao autorizado') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

