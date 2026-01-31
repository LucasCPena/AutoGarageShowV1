import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAuth } from '@/lib/auth-middleware';

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
    
    let listings = await db.listings.getAll();
    
    // Aplicar filtros
    if (status) {
      listings = listings.filter(listing => listing.status === status);
    }
    
    if (featured === 'true') {
      listings = listings.filter(listing => listing.featured);
    }
    
    if (make) {
      listings = listings.filter(listing => listing.make.toLowerCase().includes(make.toLowerCase()));
    }
    
    if (model) {
      listings = listings.filter(listing => listing.model.toLowerCase().includes(model.toLowerCase()));
    }
    
    if (yearMin) {
      listings = listings.filter(listing => listing.modelYear >= parseInt(yearMin));
    }
    
    if (yearMax) {
      listings = listings.filter(listing => listing.modelYear <= parseInt(yearMax));
    }
    
    if (priceMin) {
      listings = listings.filter(listing => listing.price >= parseInt(priceMin));
    }
    
    if (priceMax) {
      listings = listings.filter(listing => listing.price <= parseInt(priceMax));
    }
    
    if (mileageMax) {
      listings = listings.filter(listing => listing.mileage <= parseInt(mileageMax));
    }
    
    // Ordenar: destacados primeiro, depois por data de criação
    listings.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return NextResponse.json({ listings });
  } catch (error) {
    console.error('Erro ao buscar classificados:', error);
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
    
    // Validar campos obrigatórios
    const requiredFields = ['make', 'model', 'modelYear', 'manufactureYear', 'mileage', 'price', 'contact', 'document'];
    for (const field of requiredFields) {
      if (!listingData[field]) {
        return NextResponse.json(
          { error: `O campo ${field} é obrigatório` },
          { status: 400 }
        );
      }
    }
    
    // Validar limites de cadastro
    const settings = await db.settings.get();
    const activeCount = await db.listings.getActiveCount(listingData.document);
    
    // Verificar se é CPF ou CNPJ
    const isCNPJ = listingData.document.length > 14;
    const maxFree = isCNPJ ? settings?.listings.freeListingsPerCNPJ || 20 : settings?.listings.freeListingsPerCPF || 4;
    
    if (activeCount >= maxFree) {
      return NextResponse.json(
        { error: `Limite de anúncios gratuitos atingido. Máximo: ${maxFree}` },
        { status: 429 }
      );
    }
    
    // Gerar título automaticamente
    const title = `${listingData.make} ${listingData.model} ${listingData.modelYear}`;
    
    // Criar slug a partir do título
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Verificar se slug já existe
    const existingListing = await db.listings.findBySlug(slug);
    if (existingListing) {
      return NextResponse.json(
        { error: 'Já existe um classificado com este título' },
        { status: 409 }
      );
    }
    
    const listing = await db.listings.create({
      ...listingData,
      title,
      slug,
      status: 'pending',
      featured: false,
      createdBy: user.id,
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
      { listing, message: 'Classificado criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar classificado:', error);
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
