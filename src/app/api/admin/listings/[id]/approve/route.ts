import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAdmin(request);
    const { action } = await request.json(); // 'approve' ou 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Ação inválida. Use "approve" ou "reject"' },
        { status: 400 }
      );
    }
    
    const listing = await db.listings.findById(params.id);
    
    if (!listing) {
      return NextResponse.json(
        { error: 'Anúncio não encontrado' },
        { status: 404 }
      );
    }
    
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    
    const updatedListing = await db.listings.update(params.id, {
      status: newStatus
    });
    
    return NextResponse.json(
      { 
        listing: updatedListing, 
        message: `Anúncio ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso` 
      }
    );
  } catch (error) {
    console.error('Erro ao aprovar/rejeitar anúncio:', error);
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
