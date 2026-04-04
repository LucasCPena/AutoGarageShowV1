import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    listings: {
      getAll: vi.fn(),
      getActiveCount: vi.fn(),
      findBySlug: vi.fn(),
      create: vi.fn()
    },
    settings: {
      get: vi.fn()
    }
  };

  return {
    db,
    getUserFromToken: vi.fn(),
    requireAuth: vi.fn(),
    onlyDigits: vi.fn(),
    validateBrazilianDocument: vi.fn(),
    attachListingOwnerProfiles: vi.fn(),
    resolveEffectiveListingLimit: vi.fn(),
    getListingDocumentForStorage: vi.fn(),
    sanitizeListingForViewer: vi.fn(),
    logServerError: vi.fn(),
    isMysqlRequiredError: vi.fn()
  };
});

vi.mock("@/lib/auth-middleware", () => ({
  getUserFromToken: mocks.getUserFromToken,
  requireAuth: mocks.requireAuth
}));

vi.mock("@/lib/database", () => ({
  db: mocks.db,
  isMysqlRequiredError: mocks.isMysqlRequiredError
}));

vi.mock("@/lib/document", () => ({
  onlyDigits: mocks.onlyDigits,
  validateBrazilianDocument: mocks.validateBrazilianDocument
}));

vi.mock("@/lib/listingOwners", () => ({
  attachListingOwnerProfiles: mocks.attachListingOwnerProfiles
}));

vi.mock("@/lib/listingRules", () => ({
  getListingDocumentForStorage: mocks.getListingDocumentForStorage,
  resolveEffectiveListingLimit: mocks.resolveEffectiveListingLimit
}));

vi.mock("@/lib/privacy", () => ({
  sanitizeListingForViewer: mocks.sanitizeListingForViewer
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

import { GET, POST } from "@/app/api/listings/route";

function createListing(overrides: Record<string, unknown> = {}) {
  return {
    id: "listing-base",
    slug: "ford-maverick-1976",
    title: "Ford Maverick 1976",
    vehicleType: "car",
    description: "Classico revisado",
    make: "Ford",
    model: "Maverick",
    modelYear: 1976,
    manufactureYear: 1975,
    year: 1976,
    mileage: 12345,
    price: 150000,
    images: ["/placeholders/car.svg"],
    contact: {
      name: "Loja Teste",
      email: "loja@teste.com",
      phone: "11999999999"
    },
    specifications: {
      singleOwner: false,
      blackPlate: false,
      showPlate: true,
      auctionVehicle: false,
      ipvaPaid: true,
      vehicleStatus: "paid"
    },
    status: "active",
    featured: false,
    createdBy: "seller-1",
    document: "12345678901",
    city: "Sao Paulo",
    state: "SP",
    createdAt: "2026-03-10T10:00:00.000Z",
    updatedAt: "2026-03-10T10:00:00.000Z",
    ...overrides
  };
}

describe("api/listings route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUserFromToken.mockResolvedValue(null);
    mocks.onlyDigits.mockImplementation((value: string) => value.replace(/\D+/g, ""));
    mocks.validateBrazilianDocument.mockReturnValue(true);
    mocks.attachListingOwnerProfiles.mockImplementation(async (listings: unknown[]) => listings);
    mocks.resolveEffectiveListingLimit.mockReturnValue(1);
    mocks.getListingDocumentForStorage.mockReturnValue("stored-document");
    mocks.sanitizeListingForViewer.mockImplementation((listing: unknown) => listing);
    mocks.isMysqlRequiredError.mockReturnValue(false);
  });

  it("lista somente anuncios publicos do tipo solicitado e ordena destaque primeiro", async () => {
    const listings = [
      createListing({
        id: "motorcycle-featured",
        slug: "honda-cb-1975",
        title: "Honda CB 1975",
        vehicleType: "motorcycle",
        featured: true,
        createdAt: "2026-03-01T10:00:00.000Z"
      }),
      createListing({
        id: "motorcycle-latest",
        slug: "yamaha-rd-1978",
        title: "Yamaha RD 1978",
        vehicleType: "motorcycle",
        createdAt: "2026-03-12T10:00:00.000Z"
      }),
      createListing({
        id: "car-public",
        slug: "chevrolet-opala-1978",
        title: "Chevrolet Opala 1978",
        vehicleType: "car"
      }),
      createListing({
        id: "motorcycle-pending",
        slug: "suzuki-1974",
        title: "Suzuki 1974",
        vehicleType: "motorcycle",
        status: "pending"
      })
    ];

    mocks.db.listings.getAll.mockResolvedValue(listings);

    const response = await GET(
      new NextRequest("http://localhost/api/listings?vehicleType=motorcycle")
    );

    expect(response.status).toBe(200);
    expect(mocks.attachListingOwnerProfiles).toHaveBeenCalledTimes(1);

    const data = await response.json();
    expect(data.listings.map((listing: { id: string }) => listing.id)).toEqual([
      "motorcycle-featured",
      "motorcycle-latest"
    ]);
  });

  it("bloqueia scope=mine quando o usuario nao esta autenticado", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/listings?scope=mine")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Nao autorizado" });
  });

  it("cria anuncio de moto pendente para usuario comum com dados normalizados", async () => {
    const user = {
      id: "user-1",
      role: "user"
    };

    mocks.requireAuth.mockResolvedValue(user);
    mocks.db.settings.get.mockResolvedValue({
      listingLimits: { cpf: 1, cnpj: 20 }
    });
    mocks.db.listings.getActiveCount.mockResolvedValue(0);
    mocks.db.listings.findBySlug.mockResolvedValue(null);
    mocks.db.listings.create.mockImplementation(async (input: Record<string, unknown>) => ({
      id: "created-listing",
      createdAt: "2026-04-04T12:00:00.000Z",
      updatedAt: "2026-04-04T12:00:00.000Z",
      ...input
    }));

    const payload = {
      make: "Honda",
      model: "CB500",
      modelYear: 1975,
      manufactureYear: 1974,
      mileage: 54000,
      price: 89000,
      vehicleType: "motorcycle",
      document: "123.456.789-09",
      images: [],
      contact: {
        name: "Lucas",
        email: "lucas@teste.com",
        phone: "11999999999"
      },
      specifications: {
        blackPlate: true
      }
    };

    const response = await POST(
      new NextRequest("http://localhost/api/listings", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.db.listings.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Honda CB500 1975",
        slug: "honda-cb500-1975",
        vehicleType: "motorcycle",
        status: "pending",
        featured: false,
        createdBy: "user-1",
        document: "stored-document"
      })
    );

    const data = await response.json();
    expect(data.listing.id).toBe("created-listing");
    expect(data.listing.status).toBe("pending");
  });

  it("rejeita criacao quando o documento do usuario comum e invalido", async () => {
    mocks.requireAuth.mockResolvedValue({
      id: "user-1",
      role: "user"
    });
    mocks.validateBrazilianDocument.mockReturnValue(false);

    const response = await POST(
      new NextRequest("http://localhost/api/listings", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          make: "Volkswagen",
          model: "Gol",
          modelYear: 1990,
          manufactureYear: 1989,
          mileage: 1000,
          price: 20000,
          document: "123",
          contact: {
            name: "Teste",
            email: "teste@teste.com",
            phone: "11999999999"
          }
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Documento invalido. Informe um CPF ou CNPJ valido."
    });
    expect(mocks.db.listings.create).not.toHaveBeenCalled();
  });
});
