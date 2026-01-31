import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let events = await db.events.getAll();
    
    // Filtrar por status se especificado
    if (status) {
      events = events.filter(event => event.status === status);
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Erro ao buscar eventos:', error);
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
    const requiredFields = ['title', 'description', 'city', 'state', 'location', 'startAt'];
    for (const field of requiredFields) {
      if (!eventData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} é obrigatório` },
          { status: 400 }
        );
      }
    }
    
    // Criar slug a partir do título
    const slug = eventData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Verificar se slug já existe
    const existingEvent = await db.events.findBySlug(slug);
    if (existingEvent) {
      return NextResponse.json(
        { error: 'Já existe um evento com este título' },
        { status: 409 }
      );
    }
    
    const event = await db.events.create({
      ...eventData,
      slug,
      status: 'pending', // Eventos começam como pendentes
      recurrence: eventData.recurrence || { type: 'single' }
    });
    
    return NextResponse.json(
      { event, message: 'Evento criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar evento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
