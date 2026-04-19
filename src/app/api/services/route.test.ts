import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    users: {
      getAll: vi.fn()
    }
  };

  return {
    db,
    isMysqlRequiredError: vi.fn(),
    logServerError: vi.fn()
  };
});

vi.mock("@/lib/database", () => ({
  db: mocks.db,
  isMysqlRequiredError: mocks.isMysqlRequiredError
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

import { GET } from "@/app/api/services/route";

function createUser(overrides: Record<string, unknown> = {}) {
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

describe("api/services route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isMysqlRequiredError.mockReturnValue(false);
  });

  it("lista apenas servicos empresariais aprovados e ordena pelos mais recentes", async () => {
    mocks.db.users.getAll.mockResolvedValue([
      createUser({
        id: "service-old",
        companyName: "Oficina Antiga",
        createdAt: "2026-03-01T10:00:00.000Z"
      }),
      createUser({
        id: "service-new",
        companyName: "Oficina Nova",
        createdAt: "2026-04-11T10:00:00.000Z"
      }),
      createUser({
        id: "pending-service",
        approvalStatus: "pending",
        companyName: "Pendente"
      }),
      createUser({
        id: "not-service",
        marketplaceProfile: "mercado-de-pulgas",
        companyName: "Mercado"
      }),
      createUser({
        id: "individual",
        accountType: "individual",
        companyName: undefined
      })
    ]);

    const response = await GET();

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.services.map((service: { id: string }) => service.id)).toEqual([
      "service-new",
      "service-old"
    ]);
    expect(data.services[0]).toEqual(
      expect.objectContaining({
        displayName: "Oficina Nova",
        email: "lucas@teste.com",
        activityType: "Funilaria",
        city: "Sao Paulo",
        state: "SP"
      })
    );
  });
});
