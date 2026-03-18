import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';
import { toPublicAssetUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';

const SECTION_ALIASES: Record<string, string[]> = {
  home: ['home', 'topo', 'top', 'inicio', 'inicial'],
  events: ['events', 'event', 'evento', 'eventos', 'o evento'],
  listings: ['listings', 'listing', 'classificado', 'classificados', 'anuncio', 'anuncios'],
  news: ['news', 'new', 'noticia', 'noticias'],
  plans: ['plans', 'plan', 'plano', 'planos'],
  sidebar: ['sidebar', 'side-bar', 'lateral', 'banner-lateral', 'banners-laterais'],
  'mercado-de-pulgas': ['mercado-de-pulgas', 'mercado de pulgas', 'mercado', 'pulgas', 'flea-market']
};

function normalizeBannerSection(input: unknown) {
  if (typeof input !== 'string') return '';
  const raw = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (!raw) return '';

  for (const [section, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(raw)) return section;
  }

  return raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSection = searchParams.get('section');

    if (rawSection) {
      const section = normalizeBannerSection(rawSection);
      const banners = await db.banners.findBySection(section || rawSection);
      return NextResponse.json(
        { banners },
        {
          headers: {
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    const banners = await db.banners.getAll();
    return NextResponse.json(
      { banners },
      {
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: 'Banco de dados indisponivel no momento.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const bannerData = await request.json();

    const requiredFields = ['image', 'section', 'position'];
    for (const field of requiredFields) {
      if (!bannerData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} e obrigatorio` },
          { status: 400 }
        );
      }
    }

    const normalizedSection = normalizeBannerSection(bannerData.section);
    const normalizedImage = toPublicAssetUrl(bannerData.image, { uploadType: 'banner' });
    const normalizedTitle =
      typeof bannerData.title === 'string'
        ? bannerData.title.trim()
        : '';

    if (!normalizedSection) {
      return NextResponse.json(
        { error: 'Secao invalida. Informe uma secao valida como home, events, listings, news, plans, sidebar ou mercado-de-pulgas.' },
        { status: 400 }
      );
    }

    if (!normalizedImage) {
      return NextResponse.json(
        { error: 'Imagem invalida para banner.' },
        { status: 400 }
      );
    }

    const banner = await db.banners.create({
      ...bannerData,
      title: normalizedTitle,
      image: normalizedImage,
      section: normalizedSection,
      status: 'active',
      startDate: bannerData.startDate || new Date().toISOString()
    });

    return NextResponse.json(
      { banner, message: 'Banner criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar banner:', error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: 'Banco de dados indisponivel no momento.' },
        { status: 503 }
      );
    }
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
