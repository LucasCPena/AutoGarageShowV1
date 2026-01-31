import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET() {
  try {
    const brands = await db.vehicleCatalog.getBrands();
    return NextResponse.json({ brands });
  } catch (error) {
    console.error('Erro ao buscar marcas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
