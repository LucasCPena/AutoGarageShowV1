import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAdmin(request);
    const { status } = await request.json();
    
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }
    
    const comment = await db.comments.update(params.id, { status });
    
    if (!comment) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { comment, message: 'Comentário atualizado com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
