import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/auth-middleware';

const DEFAULT_SECTIONS = ['home', 'events', 'listings'];

const SECTION_ALIASES: Record<string, string[]> = {
  home: ['home', 'topo', 'top', 'inicio', 'inicial'],
  events: ['events', 'event', 'evento', 'eventos', 'o evento'],
  listings: ['listings', 'listing', 'classificado', 'classificados', 'anuncio', 'anuncios']
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

  return raw;
}

function collectValidSections(settingsSections: unknown) {
  const fromSettings = Array.isArray(settingsSections)
    ? settingsSections
        .map((section) => normalizeBannerSection(section))
        .filter(Boolean)
    : [];

  return Array.from(new Set([...DEFAULT_SECTIONS, ...fromSettings]));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSection = searchParams.get('section');

    if (rawSection) {
      const section = normalizeBannerSection(rawSection);
      const banners = await db.banners.findBySection(section || rawSection);
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
    requireAdmin(request);
    const bannerData = await request.json();

    const requiredFields = ['title', 'image', 'section', 'position'];
    for (const field of requiredFields) {
      if (!bannerData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} e obrigatorio` },
          { status: 400 }
        );
      }
    }

    const settings = await db.settings.get();
    const validSections = collectValidSections(settings?.banners?.sections);
    const normalizedSection = normalizeBannerSection(bannerData.section);

    if (!validSections.includes(normalizedSection)) {
      return NextResponse.json(
        { error: `Secao invalida. Secoes permitidas: ${validSections.join(', ')}` },
        { status: 400 }
      );
    }

    const banner = await db.banners.create({
      ...bannerData,
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

