import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';

function sanitizeStringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasMedia(images: string[] = [], videos: string[] = []) {
  return images.length > 0 || videos.length > 0;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const [events, pastEvents] = await Promise.all([
      db.events.getAll(),
      db.pastEvents.getAll()
    ]);

    const now = Date.now();
    const byEventId = new Map(
      pastEvents
        .filter((item) => item.eventId)
        .map((item) => [item.eventId as string, item])
    );

    // Compatibilidade: se um evento ja foi concluido e possui fotos no cadastro,
    // cria a entrada de realizado automaticamente uma unica vez.
    for (const event of events) {
      const isPast = new Date(event.startAt).getTime() <= now;
      const eventImages = event.images ?? [];
      if (event.status !== 'completed' || !isPast || eventImages.length === 0) continue;
      if (byEventId.has(event.id)) continue;

      let slug = event.slug || slugify(event.title) || `evento-${event.id.slice(0, 8)}`;
      while (pastEvents.some((item) => item.slug === slug)) {
        slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
      }

      const created = await db.pastEvents.create({
        eventId: event.id,
        slug,
        title: event.title,
        city: event.city,
        state: event.state,
        date: event.startAt,
        images: eventImages,
        videos: [],
        description: event.description,
        attendance: 0,
        updatedAt: new Date().toISOString()
      });

      pastEvents.push(created);
      byEventId.set(event.id, created);
    }

    const visiblePastEvents = pastEvents
      .filter((item) => {
        const isPast = new Date(item.date).getTime() <= now;
        return isPast && hasMedia(item.images, item.videos);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((item, index, list) => list.findIndex((it) => it.slug === item.slug) === index);

    return NextResponse.json({ events: visiblePastEvents });
  } catch (error) {
    console.error('Erro ao buscar eventos realizados:', error);
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
    const eventData = await request.json();

    const title = String(eventData.title || '').trim();
    const city = String(eventData.city || '').trim();
    const state = String(eventData.state || '').trim();
    const date = String(eventData.date || '').trim();
    const images = sanitizeStringList(eventData.images);
    const videos = sanitizeStringList(eventData.videos);

    if (!title || !city || !state || !date) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: title, city, state e date.' },
        { status: 400 }
      );
    }

    if (!hasMedia(images, videos)) {
      return NextResponse.json(
        { error: 'Adicione ao menos uma foto ou um link de video.' },
        { status: 400 }
      );
    }

    const eventId = eventData.eventId ? String(eventData.eventId) : undefined;
    const existingByEvent = eventId ? await db.pastEvents.findByEventId(eventId) : null;

    if (existingByEvent) {
      const updated = await db.pastEvents.update(existingByEvent.id, {
        title,
        city,
        state,
        date,
        images,
        videos,
        description: eventData.description || existingByEvent.description,
        attendance: Number.isFinite(Number(eventData.attendance))
          ? Math.round(Number(eventData.attendance))
          : existingByEvent.attendance
      });

      if (eventId) {
        const event = await db.events.findById(eventId);
        if (event && event.status !== 'completed') {
          await db.events.update(event.id, { status: 'completed' });
        }
      }

      return NextResponse.json({
        pastEvent: updated,
        message: 'Evento realizado atualizado com sucesso'
      });
    }

    let slug = String(eventData.slug || '').trim() || slugify(title);
    const allPastEvents = await db.pastEvents.getAll();
    while (allPastEvents.some((item) => item.slug === slug)) {
      slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
    }

    const pastEvent = await db.pastEvents.create({
      eventId,
      slug,
      title,
      city,
      state,
      date,
      images,
      videos,
      description: eventData.description,
      attendance: Number.isFinite(Number(eventData.attendance))
        ? Math.round(Number(eventData.attendance))
        : 0,
      updatedAt: new Date().toISOString()
    });

    if (eventId) {
      const event = await db.events.findById(eventId);
      if (event && event.status !== 'completed') {
        await db.events.update(event.id, { status: 'completed' });
      }
    }

    return NextResponse.json(
      { pastEvent, message: 'Evento realizado adicionado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar evento realizado:', error);
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
