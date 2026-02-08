import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

const isUnauthorized = (message: string) => /autorizad/i.test(message);

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const listings = await db.listings.getAll();

    // Filter pending listings awaiting approval.
    const pendingListings = listings.filter((listing) => listing.status === 'pending');

    return NextResponse.json({ listings: pendingListings });
  } catch (error) {
    if (error instanceof Error && isUnauthorized(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    console.error('Erro ao buscar anuncios pendentes:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
