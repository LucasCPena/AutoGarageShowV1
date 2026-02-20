import { NextRequest, NextResponse } from 'next/server';

import { getUserFromToken, requireAuth } from '@/lib/auth-middleware';
import { db, isMysqlRequiredError, type Listing } from '@/lib/database';
import { onlyDigits, validateBrazilianDocument } from '@/lib/document';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const featured = searchParams.get('featured');
    const make = searchParams.get('make');
    const model = searchParams.get('model');
    const yearMin = searchParams.get('yearMin');
    const yearMax = searchParams.get('yearMax');
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const mileageMax = searchParams.get('mileageMax');
    const user = getUserFromToken(request);
    const isAdmin = user?.role === 'admin';

    let listings = await db.listings.getAll();

    if (status) {
      if (isAdmin) {
        listings = listings.filter((listing) => listing.status === status);
      } else if (status === 'approved' || status === 'active') {
        listings = listings.filter((listing) => listing.status === status);
      } else {
        listings = [];
      }
    } else if (!isAdmin) {
      listings = listings.filter(
        (listing) => listing.status === 'approved' || listing.status === 'active'
      );
    }

    if (featured === 'true') {
      listings = listings.filter((listing) => listing.featured);
    }

    if (make) {
      listings = listings.filter((listing) => listing.make.toLowerCase().includes(make.toLowerCase()));
    }

    if (model) {
      listings = listings.filter((listing) => listing.model.toLowerCase().includes(model.toLowerCase()));
    }

    if (yearMin) {
      listings = listings.filter((listing) => listing.modelYear >= parseInt(yearMin, 10));
    }

    if (yearMax) {
      listings = listings.filter((listing) => listing.modelYear <= parseInt(yearMax, 10));
    }

    if (priceMin) {
      listings = listings.filter((listing) => listing.price >= parseInt(priceMin, 10));
    }

    if (priceMax) {
      listings = listings.filter((listing) => listing.price <= parseInt(priceMax, 10));
    }

    if (mileageMax) {
      listings = listings.filter((listing) => listing.mileage <= parseInt(mileageMax, 10));
    }

    // Ordenar: destacados primeiro, depois por data de criacao.
    listings.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(
      { listings },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error('Erro ao buscar classificados:', error);
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
    const user = requireAuth(request);
    const listingData = await request.json();

    const requiredFields = ['make', 'model', 'modelYear', 'manufactureYear', 'mileage', 'price', 'contact'];
    for (const field of requiredFields) {
      if (!listingData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} e obrigatorio` },
          { status: 400 }
        );
      }
    }

    if (user.role !== 'admin' && !listingData.document) {
      return NextResponse.json(
        { error: 'O campo document e obrigatorio' },
        { status: 400 }
      );
    }

    const rawDocument = String(listingData.document || '').trim();
    const normalizedDocument = onlyDigits(rawDocument);

    if (user.role !== 'admin' && !validateBrazilianDocument(rawDocument)) {
      return NextResponse.json(
        { error: 'Documento invalido. Informe um CPF ou CNPJ valido.' },
        { status: 400 }
      );
    }

    if (user.role !== 'admin') {
      const settings = await db.settings.get();
      const activeCount = await db.listings.getActiveCount(normalizedDocument);
      const isCNPJ = normalizedDocument.length === 14;
      const maxFree = isCNPJ
        ? settings?.listings.freeListingsPerCNPJ || 20
        : settings?.listings.freeListingsPerCPF || 4;

      if (activeCount >= maxFree) {
        return NextResponse.json(
          { error: `Limite de anuncios gratuitos atingido. Maximo: ${maxFree}` },
          { status: 429 }
        );
      }
    }

    const title = `${listingData.make} ${listingData.model} ${listingData.modelYear}`;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingListing = await db.listings.findBySlug(slug);
    if (existingListing) {
      return NextResponse.json(
        { error: 'Ja existe um classificado com este titulo' },
        { status: 409 }
      );
    }

    const validListingStatus: Listing['status'][] = [
      'pending',
      'approved',
      'active',
      'inactive',
      'sold',
      'rejected'
    ];
    const requestedStatusRaw =
      typeof listingData.status === 'string' ? listingData.status : undefined;
    const requestedStatus =
      requestedStatusRaw &&
      validListingStatus.includes(requestedStatusRaw as Listing['status'])
        ? (requestedStatusRaw as Listing['status'])
        : undefined;
    const status = user.role === 'admin' ? requestedStatus || 'active' : 'pending';

    const featured = user.role === 'admin' ? Boolean(listingData.featured) : false;
    const featuredUntilInput =
      user.role === 'admin' ? String(listingData.featuredUntil || '').trim() : '';
    let featuredUntil: string | undefined;
    if (featured && featuredUntilInput) {
      const parsed = new Date(featuredUntilInput);
      if (!Number.isFinite(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Data de destaque invalida.' },
          { status: 400 }
        );
      }
      featuredUntil = parsed.toISOString();
    }

    const listing = await db.listings.create({
      ...listingData,
      title,
      slug,
      status,
      featured,
      featuredUntil: featured ? featuredUntil : undefined,
      createdBy: user.id,
      document:
        normalizedDocument ||
        rawDocument ||
        (user.role === 'admin' ? `admin-${user.id}` : ''),
      images: listingData.images || [],
      specifications: {
        singleOwner: listingData.specifications?.singleOwner || false,
        blackPlate: listingData.specifications?.blackPlate || false,
        showPlate: listingData.specifications?.showPlate !== false,
        auctionVehicle: listingData.specifications?.auctionVehicle || false,
        ipvaPaid: listingData.specifications?.ipvaPaid || false,
        vehicleStatus: listingData.specifications?.vehicleStatus || 'paid'
      }
    });

    return NextResponse.json(
      {
        listing,
        message:
          user.role === 'admin'
            ? 'Classificado criado e publicado automaticamente (admin).'
            : 'Classificado criado com sucesso'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar classificado:', error);
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

