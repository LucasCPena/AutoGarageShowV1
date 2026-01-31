import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await db.events.findById(params.id);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
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
    const updateData = await request.json();
    const event = await db.events.update(params.id, updateData);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { event, message: 'Evento atualizado com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
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
    const event = await db.events.findById(params.id);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      );
    }
    
    await db.events.delete(params.id);
    
    return NextResponse.json(
      { message: 'Evento excluído com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
