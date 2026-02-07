import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

function normalizeModels(input: unknown) {
  if (!Array.isArray(input)) return [] as string[];

  return Array.from(
    new Set(
      input
        .filter((model): model is string => typeof model === 'string')
        .map((model) => model.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

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

    const singleModel =
      typeof body.model === 'string' ? body.model.trim() : '';
    const requestedModels = Array.from(
      new Set([
        ...(singleModel ? [singleModel] : []),
        ...normalizeModels(body.models)
      ])
    ).sort((a, b) => a.localeCompare(b));

    if (requestedModels.length === 0) {
      return NextResponse.json({ error: 'Modelo é obrigatório' }, { status: 400 });
    }

    const brands = await db.vehicleCatalog.getBrands();
    const brand = brands.find((item) => item.id === params.brandId);
    if (!brand) {
      return NextResponse.json({ error: 'Marca não encontrada' }, { status: 404 });
    }

    const currentModels = Array.isArray(brand.models) ? brand.models : [];
    const models = Array.from(new Set([...currentModels, ...requestedModels])).sort((a, b) =>
      a.localeCompare(b)
    );

    await db.vehicleCatalog.upsertBrand({
      ...brand,
      models
    });

    return NextResponse.json({
      models,
      addedCount: models.length - currentModels.length
    });
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
