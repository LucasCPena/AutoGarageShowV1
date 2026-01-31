import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    
    if (section) {
      const banners = await db.banners.findBySection(section);
      return NextResponse.json({ banners });
    }
    
    const banners = await db.banners.getAll();
    return NextResponse.json({ banners });
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAdmin(request);
    const bannerData = await request.json();
    
    // Validar campos obrigatórios
    const requiredFields = ['title', 'image', 'section', 'position'];
    for (const field of requiredFields) {
      if (!bannerData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} é obrigatório` },
          { status: 400 }
        );
      }
    }
    
    // Validar seção
    const settings = await db.settings.get();
    const validSections = settings?.banners.sections || [];
    
    if (!validSections.includes(bannerData.section)) {
      return NextResponse.json(
        { error: `Seção inválida. Seções permitidas: ${validSections.join(', ')}` },
        { status: 400 }
      );
    }
    
    const banner = await db.banners.create({
      ...bannerData,
      status: 'active',
      startDate: bannerData.startDate || new Date().toISOString()
    });
    
    return NextResponse.json(
      { banner, message: 'Banner criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar banner:', error);
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
