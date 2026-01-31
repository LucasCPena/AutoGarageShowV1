import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const settings = await db.settings.get();
    const autoInactiveMonths = settings?.listings.autoInactiveMonths || 4;
    
    // Atualizar status de destacados expirados
    await db.listings.updateFeaturedStatus();
    
    // Inativar anúncios antigos
    const listings = await db.listings.getAll();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - autoInactiveMonths);
    
    let inactivatedCount = 0;
    
    for (const listing of listings) {
      if (listing.status === 'active' && new Date(listing.createdAt) < cutoffDate) {
        await db.listings.update(listing.id, { status: 'inactive' });
        inactivatedCount++;
      }
    }
    
    return NextResponse.json({
      message: 'Limpeza concluída com sucesso',
      inactivatedCount,
      cutoffDate: cutoffDate.toISOString()
    });
  } catch (error) {
    console.error('Erro na limpeza automática:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
