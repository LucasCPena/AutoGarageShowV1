import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';
import { getModelsForMake, vehicleMakes } from '@/lib/vehicleCatalog';

function fallbackBrands() {
  return vehicleMakes.map((name) => ({
    id: slugify(name),
    name,
    models: getModelsForMake(name)
  }));
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET() {
  try {
    const brands = await db.vehicleCatalog.getBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Erro ao buscar marcas:', error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json({ brands: fallbackBrands() });
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();
    const name = body.name?.toString().trim();
    const providedId = body.id?.toString().trim();
    const models: string[] = Array.isArray(body.models)
      ? body.models.filter((m: unknown) => typeof m === 'string' && m.trim()).map((m: string) => m.trim())
      : [];

    if (!name) {
      return NextResponse.json({ error: 'Nome da marca é obrigatório' }, { status: 400 });
    }

    const id = providedId && providedId.length > 0 ? providedId : slugify(name);
    const existing = await db.vehicleCatalog.getBrands();
    if (existing.some((b) => b.id === id)) {
      return NextResponse.json({ error: 'Já existe uma marca com este identificador' }, { status: 409 });
    }

    const brand = {
      id,
      name,
      models: Array.from(new Set(models)).sort((a, b) => a.localeCompare(b))
    };

    const brands = await db.vehicleCatalog.upsertBrand(brand);
    return NextResponse.json({ brand, brands }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar marca:', error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json({ error: 'Banco de dados indisponivel no momento.' }, { status: 503 });
    }
    if (error instanceof Error && error.message === 'Acesso negado') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
