import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');
    
    let news = await db.news.getAll();
    
    // Filtrar por categoria se especificado
    if (category) {
      news = news.filter(item => item.category === category);
    }
    
    // Limitar resultados se especificado
    if (limit) {
      news = news.slice(0, parseInt(limit));
    }
    
    // Ordenar por data (mais recentes primeiro)
    news.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json({ news });
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const newsData = await request.json();
    
    // Validar campos obrigatórios
    const requiredFields = ['title', 'content', 'category', 'coverImage'];
    for (const field of requiredFields) {
      if (!newsData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} é obrigatório` },
          { status: 400 }
        );
      }
    }
    
    // Gerar slug a partir do título
    const slug = newsData.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    const news = await db.news.create({
      ...newsData,
      slug,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json(
      { news, message: 'Notícia criada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar notícia:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
