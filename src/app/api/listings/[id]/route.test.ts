import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    listings: {
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    audit: {
      create: vi.fn()
    }
  };

  return {
    db,
    getUserFromToken: vi.fn(),
    requireAuth: vi.fn(),
    validateBrazilianDocument: vi.fn(),
    getListingDocumentForStorage: vi.fn(),
    sanitizeListingForViewer: vi.fn(),
    logServerError: vi.fn()
  };
});

vi.mock("@/lib/auth-middleware", () => ({
  getUserFromToken: mocks.getUserFromToken,
  requireAuth: mocks.requireAuth
}));

vi.mock("@/lib/database", () => ({
  db: mocks.db
}));

vi.mock("@/lib/document", () => ({
  validateBrazilianDocument: mocks.validateBrazilianDocument
}));

vi.mock("@/lib/listingRules", () => ({
  getListingDocumentForStorage: mocks.getListingDocumentForStorage
}));

vi.mock("@/lib/privacy", () => ({
  sanitizeListingForViewer: mocks.sanitizeListingForViewer
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

import {
  DELETE,
  GET as GET_BY_ID,
  PUT
} from "@/app/api/listings/[id]/route";

function createListing(overrides: Record<string, unknown> = {}) {
  return {
    id: "listing-id",
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

describe("api/listings/[id] route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUserFromToken.mockResolvedValue(null);
    mocks.validateBrazilianDocument.mockReturnValue(true);
    mocks.getListingDocumentForStorage.mockReturnValue("stored-document");
    mocks.sanitizeListingForViewer.mockImplementation((listing: unknown) => listing);
    mocks.db.audit.create.mockResolvedValue(undefined);
  });

  it("permite leitura publica de anuncio ativo", async () => {
    const listing = createListing({ status: "active" });
    mocks.db.listings.findById.mockResolvedValue(listing);

    const response = await GET_BY_ID(
      new NextRequest("http://localhost/api/listings/listing-id"),
      { params: { id: "listing-id" } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ listing });
  });

  it("bloqueia leitura de anuncio privado para usuario sem permissao", async () => {
    mocks.getUserFromToken.mockResolvedValue({
      id: "other-user",
      role: "user"
    });
    mocks.db.listings.findById.mockResolvedValue(
      createListing({ status: "pending", createdBy: "seller-1" })
    );

    const response = await GET_BY_ID(
      new NextRequest("http://localhost/api/listings/listing-id"),
      { params: { id: "listing-id" } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Acesso negado" });
  });

  it("atualiza anuncio do proprio usuario e registra auditoria", async () => {
    const existing = createListing({
      id: "listing-id",
      createdBy: "seller-1",
      status: "active"
    });

    mocks.requireAuth.mockResolvedValue({
      id: "seller-1",
      role: "user"
    });
    mocks.db.listings.findById.mockResolvedValue(existing);
    mocks.db.listings.update.mockImplementation(
      async (_id: string, input: Record<string, unknown>) => ({
        ...existing,
        ...input
      })
    );

    const response = await PUT(
      new NextRequest("http://localhost/api/listings/listing-id", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          price: 175000,
          document: "123.456.789-09"
        })
      }),
      { params: { id: "listing-id" } }
    );

    expect(response.status).toBe(200);
    expect(mocks.db.listings.update).toHaveBeenCalledWith(
      "listing-id",
      expect.objectContaining({
        price: 175000,
        document: "stored-document"
      })
    );
    expect(mocks.db.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "seller-1",
        action: "listing.update",
        entityId: "listing-id"
      })
    );
  });

  it("quando admin destaca anuncio pendente, publica como ativo e define featuredUntil", async () => {
    const existing = createListing({
      id: "listing-id",
      status: "pending",
      featured: false,
      featuredUntil: undefined
    });

    mocks.requireAuth.mockResolvedValue({
      id: "admin-1",
      role: "admin"
    });
    mocks.db.listings.findById.mockResolvedValue(existing);
    mocks.db.listings.update.mockImplementation(
      async (_id: string, input: Record<string, unknown>) => ({
        ...existing,
        ...input
      })
    );

    const response = await PUT(
      new NextRequest("http://localhost/api/listings/listing-id", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          featured: true
        })
      }),
      { params: { id: "listing-id" } }
    );

    expect(response.status).toBe(200);

    const updateInput = mocks.db.listings.update.mock.calls[0][1];
    expect(updateInput.featured).toBe(true);
    expect(updateInput.status).toBe("active");
    expect(typeof updateInput.featuredUntil).toBe("string");
    expect(Number.isFinite(new Date(updateInput.featuredUntil as string).getTime())).toBe(true);
  });

  it("impede exclusao por usuario sem permissao", async () => {
    mocks.requireAuth.mockResolvedValue({
      id: "other-user",
      role: "user"
    });
    mocks.db.listings.findById.mockResolvedValue(
      createListing({ createdBy: "seller-1" })
    );

    const response = await DELETE(
      new NextRequest("http://localhost/api/listings/listing-id", {
        method: "DELETE"
      }),
      { params: { id: "listing-id" } }
    );

    expect(response.status).toBe(403);
    expect(mocks.db.listings.delete).not.toHaveBeenCalled();
  });

  it("exclui anuncio do dono e registra auditoria", async () => {
    mocks.requireAuth.mockResolvedValue({
      id: "seller-1",
      role: "user"
    });
    mocks.db.listings.findById.mockResolvedValue(
      createListing({ id: "listing-id", createdBy: "seller-1" })
    );
    mocks.db.listings.delete.mockResolvedValue(undefined);

    const response = await DELETE(
      new NextRequest("http://localhost/api/listings/listing-id", {
        method: "DELETE"
      }),
      { params: { id: "listing-id" } }
    );

    expect(response.status).toBe(200);
    expect(mocks.db.listings.delete).toHaveBeenCalledWith("listing-id");
    expect(mocks.db.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "seller-1",
        action: "listing.delete",
        entityId: "listing-id"
      })
    );
  });
});
