import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const banners = await db.banners.getAll();
    const banner = banners.find((b) => b.id === params.id);
    if (!banner) {
      return NextResponse.json({ error: 'Banner não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ banner });
  } catch (error) {
    console.error('Erro ao buscar banner:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const updates = await request.json();
    const banner = await db.banners.update(params.id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    if (!banner) {
      return NextResponse.json({ error: 'Banner não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ banner, message: 'Banner atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar banner:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    await db.banners.delete(params.id);
    return NextResponse.json({ message: 'Banner excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir banner:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
