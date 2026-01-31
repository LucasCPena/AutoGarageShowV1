import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

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
