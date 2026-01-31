import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listing = await db.listings.findById(params.id);
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Classificado não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ listing });
  } catch (error) {
    console.error('Erro ao buscar classificado:', error);
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
    const listing = await db.listings.update(params.id, updateData);
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Classificado não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { listing, message: 'Classificado atualizado com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao atualizar classificado:', error);
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
    const listing = await db.listings.findById(params.id);
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Classificado não encontrado' },
        { status: 404 }
      );
    }
    
    await db.listings.delete(params.id);
    
    return NextResponse.json(
      { message: 'Classificado excluído com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao excluir classificado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
