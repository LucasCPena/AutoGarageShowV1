import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const models = await db.vehicleCatalog.getModels(params.brandId);
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Erro ao buscar modelos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const model = body.model?.toString().trim();
    if (!model) {
      return NextResponse.json({ error: 'Modelo é obrigatório' }, { status: 400 });
    }
    const models = await db.vehicleCatalog.addModel(params.brandId, model);
    if (!models) {
      return NextResponse.json({ error: 'Marca não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Erro ao adicionar modelo:', error);
    if (error instanceof Error && error.message === 'Acesso negado') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const model = body.model?.toString().trim();
    if (!model) {
      return NextResponse.json({ error: 'Modelo é obrigatório' }, { status: 400 });
    }
    const models = await db.vehicleCatalog.removeModel(params.brandId, model);
    if (!models) {
      return NextResponse.json({ error: 'Marca não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Erro ao remover modelo:', error);
    if (error instanceof Error && error.message === 'Acesso negado') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
