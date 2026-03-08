import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

function resolveAutoInactiveMonths(settings: unknown) {
  const fallback = 4;

  if (!settings || typeof settings !== 'object') return fallback;

  const source = settings as Record<string, unknown>;

  const autoExpireDays = source.listingAutoExpireDays;
  if (typeof autoExpireDays === 'number' && Number.isFinite(autoExpireDays)) {
    if (autoExpireDays <= 0) return 0;
    return Math.max(1, Math.round(autoExpireDays / 30));
  }

  const listings =
    source.listings && typeof source.listings === 'object'
      ? (source.listings as Record<string, unknown>)
      : null;
  const legacyMonths = listings?.autoInactiveMonths;

  if (typeof legacyMonths === 'number' && Number.isFinite(legacyMonths) && legacyMonths >= 0) {
    return Math.round(legacyMonths);
  }

  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const settings = await db.settings.get();
    const autoInactiveMonths = resolveAutoInactiveMonths(settings);
    
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
