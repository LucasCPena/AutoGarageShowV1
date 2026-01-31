import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = requireAdmin(request);
    const listings = await db.listings.getAll();
    
    // Filtrar anúncios pendentes de aprovação
    const pendingListings = listings.filter(listing => listing.status === 'pending');
    
    return NextResponse.json({ listings: pendingListings });
  } catch (error) {
    console.error('Erro ao buscar anúncios pendentes:', error);
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
