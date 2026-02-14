import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';
import { toPublicAssetUrl } from '@/lib/site-url';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const banners = await db.banners.getAll();
    const banner = banners.find((b) => b.id === params.id);
    if (!banner) {
      return NextResponse.json({ error: 'Banner nao encontrado' }, { status: 404 });
    }
    return NextResponse.json({ banner });
  } catch (error) {
    console.error('Erro ao buscar banner:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const updates = await request.json();

    const normalizedUpdates: Record<string, unknown> = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (typeof updates?.image === 'string' && updates.image.trim()) {
      const normalizedImage = toPublicAssetUrl(updates.image, { uploadType: 'banner' });
      if (!normalizedImage) {
        return NextResponse.json({ error: 'Imagem invalida para banner.' }, { status: 400 });
      }
      normalizedUpdates.image = normalizedImage;
    }

    const banner = await db.banners.update(params.id, normalizedUpdates);
    if (!banner) {
      return NextResponse.json({ error: 'Banner nao encontrado' }, { status: 404 });
    }
    return NextResponse.json({ banner, message: 'Banner atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar banner:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    await db.banners.delete(params.id);
    return NextResponse.json({ message: 'Banner excluido com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir banner:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
