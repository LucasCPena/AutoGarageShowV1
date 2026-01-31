import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { days } = await request.json();
    
    if (!days || typeof days !== 'number' || days <= 0) {
      return NextResponse.json(
        { error: 'Número de dias inválido' },
        { status: 400 }
      );
    }
    
    // Validar se dias está nas opções permitidas
    const settings = await db.settings.get();
    const validOptions = settings?.listings.highlightOptions || [7, 14, 21, 30];
    
    if (!validOptions.includes(days)) {
      return NextResponse.json(
        { error: `Opção de dias inválida. Opções permitidas: ${validOptions.join(', ')}` },
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
    
    // Verificar se o usuário é o dono do anúncio
    if (listing.createdBy !== user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }
    
    // Calcular data de término do destaque
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + days);
    
    const updatedListing = await db.listings.update(params.id, {
      featured: true,
      featuredUntil: featuredUntil.toISOString()
    });
    
    return NextResponse.json(
      { listing: updatedListing, message: 'Anúncio destacado com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao destacar anúncio:', error);
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
