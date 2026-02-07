import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const existing = (await db.vehicleCatalog.getBrands()).find((b) => b.id === params.brandId);

    if (!existing) {
      return NextResponse.json({ error: 'Marca não encontrada' }, { status: 404 });
    }

    const name = body.name?.toString().trim() || existing.name;
    const models: string[] | undefined = Array.isArray(body.models)
      ? (body.models as unknown[]).reduce<string[]>((acc, m) => {
          if (typeof m !== 'string') return acc;
          const trimmed = m.trim();
          if (!trimmed) return acc;
          if (!acc.includes(trimmed)) acc.push(trimmed);
          return acc;
        }, []).sort((a, b) => a.localeCompare(b))
      : undefined;

    const brand = {
      ...existing,
      name,
      ...(models ? { models } : {})
    };

    const brands = await db.vehicleCatalog.upsertBrand(brand);
    return NextResponse.json({ brand, brands });
  } catch (error) {
    console.error('Erro ao atualizar marca:', error);
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
    const brands = await db.vehicleCatalog.getBrands();
    const exists = brands.some((b) => b.id === params.brandId);
    if (!exists) {
      return NextResponse.json({ error: 'Marca não encontrada' }, { status: 404 });
    }
    const updated = await db.vehicleCatalog.deleteBrand(params.brandId);
    return NextResponse.json({ brands: updated });
  } catch (error) {
    console.error('Erro ao excluir marca:', error);
    if (error instanceof Error && error.message === 'Acesso negado') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
