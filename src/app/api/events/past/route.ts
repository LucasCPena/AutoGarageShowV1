import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const events = await db.events.getAll();
    const pastEvents = await db.pastEvents.getAll();
    
    // Combinar eventos passados do banco com eventos realizados
    const now = new Date();
    const allPastEvents = [];
    
    // Adicionar eventos que já passaram da data
    for (const event of events) {
      if (event.status === 'approved' && new Date(event.startAt) < now) {
        // Verificar se já existe em pastEvents
        const exists = pastEvents.find(pe => pe.eventId === event.id);
        if (!exists) {
          // Criar entrada básica em pastEvents
          const slug = event.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
            
          const pastEvent = await db.pastEvents.create({
            eventId: event.id,
            slug,
            title: event.title,
            city: event.city,
            state: event.state,
            date: event.startAt,
            images: [],
            description: event.description,
            attendance: 0,
            updatedAt: new Date().toISOString()
          });
          allPastEvents.push(pastEvent);
        } else {
          allPastEvents.push(exists);
        }
      }
    }
    
    // Adicionar eventos realizados manuais
    allPastEvents.push(...pastEvents.filter(pe => !pe.eventId));
    
    // Ordenar por data (mais recentes primeiro)
    allPastEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return NextResponse.json({ events: allPastEvents });
  } catch (error) {
    console.error('Erro ao buscar eventos realizados:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json();
    
    // Validar campos obrigatórios
    const requiredFields = ['eventId', 'title', 'city', 'state', 'date', 'images'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} é obrigatório` },
          { status: 400 }
        );
      }
    }
    
    const pastEvent = await db.pastEvents.create({
      ...eventData,
      attendance: eventData.attendance || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json(
      { pastEvent, message: 'Evento realizado adicionado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar evento realizado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
