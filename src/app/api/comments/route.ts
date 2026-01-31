import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');
    const eventId = searchParams.get('eventId');
    const pending = searchParams.get('pending');
    
    if (listingId) {
      const comments = await db.comments.findByListing(listingId);
      return NextResponse.json({ comments });
    }
    
    if (eventId) {
      const comments = await db.comments.findByEvent(eventId);
      return NextResponse.json({ comments });
    }
    
    if (pending === 'true') {
      const comments = await db.comments.getPending();
      return NextResponse.json({ comments });
    }
    
    const comments = await db.comments.getAll();
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const commentData = await request.json();
    
    // Validar campos obrigatórios
    const requiredFields = ['listingId', 'name', 'email', 'message'];
    for (const field of requiredFields) {
      if (!commentData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} é obrigatório` },
          { status: 400 }
        );
      }
    }
    
    // Validar tamanho da mensagem
    const settings = await db.settings.get();
    const maxLength = settings?.comments.maxLength || 1000;
    
    if (commentData.message.length > maxLength) {
      return NextResponse.json(
        { error: `Mensagem muito longa. Máximo: ${maxLength} caracteres` },
        { status: 400 }
      );
    }
    
    const comment = await db.comments.create({
      ...commentData,
      status: 'pending' // Comentários começam como pendentes
    });
    
    return NextResponse.json(
      { comment, message: 'Comentário enviado para aprovação' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
