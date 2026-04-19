import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    users: {
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
    onlyDigits: vi.fn(),
    validateCNPJ: vi.fn(),
    sanitizeUserForSession: vi.fn(),
    normalizeServiceActivity: vi.fn(),
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
  validateCNPJ: mocks.validateCNPJ
}));

vi.mock("@/lib/privacy", () => ({
  sanitizeUserForSession: mocks.sanitizeUserForSession
}));

vi.mock("@/lib/serviceActivities", () => ({
  normalizeServiceActivity: mocks.normalizeServiceActivity
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

import { DELETE, GET, PUT } from "@/app/api/services/[id]/route";

function createService(overrides: Record<string, unknown> = {}) {
  return {
    id: "service-1",
    name: "Lucas",
    email: "lucas@teste.com",
    password: "hashed",
    role: "user",
    document: "12345678000190",
    documentType: "cnpj",
    phone: "11999999999",
    accountType: "company",
    companyName: "Oficina Teste",
    approvalStatus: "approved",
    verificationStatus: "verified",
    marketplaceProfile: "services",
    activityType: "Funilaria",
    shortDescription: "Especialista em carros antigos",
    websiteUrl: "https://oficina.teste",
    address: "Rua A, 123",
    city: "Sao Paulo",
    state: "SP",
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-10T10:00:00.000Z",
    ...overrides
  };
}

describe("api/services/[id] route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.onlyDigits.mockImplementation((value: string) => value.replace(/\D+/g, ""));
    mocks.validateCNPJ.mockReturnValue(true);
    mocks.sanitizeUserForSession.mockImplementation((user: unknown) => ({ ...(user as object) }));
    mocks.normalizeServiceActivity.mockImplementation((value: string) => value?.trim?.() || "");
    mocks.isMysqlRequiredError.mockReturnValue(false);
    mocks.db.audit.create.mockResolvedValue(undefined);
  });

  it("retorna servico publico sem expor documento para visitantes", async () => {
    mocks.getUserFromToken.mockResolvedValue(null);
    mocks.db.users.findById.mockResolvedValue(createService());

    const response = await GET(
      new NextRequest("http://localhost/api/services/service-1"),
      { params: { id: "service-1" } }
    );

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.service.document).toBeUndefined();
    expect(data.service.companyName).toBe("Oficina Teste");
  });

  it("atualiza servico do proprio usuario e registra auditoria", async () => {
    const existing = createService();

    mocks.requireAuth.mockResolvedValue({ id: "service-1", role: "user" });
    mocks.db.users.findById.mockResolvedValue(existing);
    mocks.db.users.update.mockImplementation(async (_id: string, input: Record<string, unknown>) => ({
      ...existing,
      ...input
    }));

    const response = await PUT(
      new NextRequest("http://localhost/api/services/service-1", {
        method: "PUT",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          document: "12.345.678/0001-90",
          companyName: "Oficina Atualizada",
          phone: "(11) 99999-9999",
          activityType: "Restauracao",
          shortDescription: "Texto atualizado",
          websiteUrl: "oficina-atualizada.com.br",
          address: "Rua B, 456",
          city: "Campinas",
          state: "sp"
        })
      }),
      { params: { id: "service-1" } }
    );

    expect(response.status).toBe(200);
    expect(mocks.db.users.update).toHaveBeenCalledWith(
      "service-1",
      expect.objectContaining({
        document: "12345678000190",
        phone: "11999999999",
        companyName: "Oficina Atualizada",
        activityType: "Restauracao",
        websiteUrl: "https://oficina-atualizada.com.br",
        city: "Campinas",
        state: "SP"
      })
    );
    expect(mocks.db.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "service-1",
        action: "service.update",
        entityId: "service-1"
      })
    );
  });

  it("exclui servico do proprio usuario e registra auditoria", async () => {
    mocks.requireAuth.mockResolvedValue({ id: "service-1", role: "user" });
    mocks.db.users.findById.mockResolvedValue(createService());
    mocks.db.users.delete.mockResolvedValue(undefined);

    const response = await DELETE(
      new NextRequest("http://localhost/api/services/service-1", {
        method: "DELETE"
      }),
      { params: { id: "service-1" } }
    );

    expect(response.status).toBe(200);
    expect(mocks.db.users.delete).toHaveBeenCalledWith("service-1");
    expect(mocks.db.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "service-1",
        action: "service.delete",
        entityId: "service-1"
      })
    );
  });
});
