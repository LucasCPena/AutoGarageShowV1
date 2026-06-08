import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    settings: {
      get: vi.fn()
    },
    users: {
      findByEmail: vi.fn(),
      create: vi.fn()
    },
    audit: {
      create: vi.fn()
    }
  };

  return {
    db,
    isMysqlRequiredError: vi.fn(),
    onlyDigits: vi.fn(),
    validateCNPJ: vi.fn(),
    validateCPF: vi.fn(),
    sanitizeUserForSession: vi.fn(),
    hashPassword: vi.fn(),
    sendRegistrationSuccessEmail: vi.fn(),
    getPublicSecurityConfigurationMessage: vi.fn(),
    isSecurityConfigurationError: vi.fn(),
    logServerError: vi.fn(),
    toPublicAssetUrl: vi.fn(),
    normalizeServiceActivity: vi.fn()
  };
});

vi.mock("@/lib/database", () => ({
  db: mocks.db,
  isMysqlRequiredError: mocks.isMysqlRequiredError
}));

vi.mock("@/lib/document", () => ({
  onlyDigits: mocks.onlyDigits,
  validateCNPJ: mocks.validateCNPJ,
  validateCPF: mocks.validateCPF
}));

vi.mock("@/lib/privacy", () => ({
  sanitizeUserForSession: mocks.sanitizeUserForSession
}));

vi.mock("@/lib/password", () => ({
  hashPassword: mocks.hashPassword
}));

vi.mock("@/lib/mailer", () => ({
  sendRegistrationSuccessEmail: mocks.sendRegistrationSuccessEmail
}));

vi.mock("@/lib/security-config", () => ({
  getPublicSecurityConfigurationMessage: mocks.getPublicSecurityConfigurationMessage,
  isSecurityConfigurationError: mocks.isSecurityConfigurationError
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

vi.mock("@/lib/site-url", () => ({
  toPublicAssetUrl: mocks.toPublicAssetUrl
}));

vi.mock("@/lib/serviceActivities", () => ({
  normalizeServiceActivity: mocks.normalizeServiceActivity
}));

import { POST } from "@/app/api/auth/register/route";

describe("api/auth/register route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.onlyDigits.mockImplementation((value: string) => value.replace(/\D+/g, ""));
    mocks.validateCNPJ.mockReturnValue(true);
    mocks.validateCPF.mockReturnValue(true);
    mocks.sanitizeUserForSession.mockImplementation((user: unknown) => user);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.sendRegistrationSuccessEmail.mockResolvedValue({ sent: true });
    mocks.getPublicSecurityConfigurationMessage.mockReturnValue("Config indisponivel");
    mocks.isSecurityConfigurationError.mockReturnValue(false);
    mocks.toPublicAssetUrl.mockImplementation((value: string | undefined) => value);
    mocks.normalizeServiceActivity.mockImplementation((value: string) => value?.trim?.() || "");
    mocks.isMysqlRequiredError.mockReturnValue(false);
    mocks.db.settings.get.mockResolvedValue({ qrAccess: { autoApproveAccounts: false } });
    mocks.db.users.findByEmail.mockResolvedValue(null);
    mocks.db.audit.create.mockResolvedValue(undefined);
  });

  it("cadastra empresa de servicos com campos normalizados", async () => {
    mocks.db.users.create.mockImplementation(async (input: Record<string, unknown>) => ({
      id: "service-created",
      createdAt: "2026-04-18T12:00:00.000Z",
      updatedAt: "2026-04-18T12:00:00.000Z",
      ...input
    }));

    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Lucas",
          email: "SERVICO@TESTE.COM",
          password: "123456",
          document: "12.345.678/0001-90",
          phone: "(11) 99999-9999",
          accountType: "company",
          companyName: "Oficina Teste",
          marketplaceProfile: "services",
          activityType: "Funilaria",
          shortDescription: "Especialista em carros antigos",
          websiteUrl: "oficina-teste.com.br",
          address: "Rua A, 123",
          city: "Sao Paulo",
          state: "sp"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.db.users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Lucas",
        email: "servico@teste.com",
        password: "hashed-password",
        document: "12345678000190",
        documentType: "cnpj",
        phone: "11999999999",
        accountType: "company",
        companyName: "Oficina Teste",
        approvalStatus: "approved",
        marketplaceProfile: "services",
        activityType: "Funilaria",
        shortDescription: "Especialista em carros antigos",
        websiteUrl: "https://oficina-teste.com.br",
        address: "Rua A, 123",
        city: "Sao Paulo",
        state: "SP"
      })
    );
    expect(mocks.sendRegistrationSuccessEmail).toHaveBeenCalledWith({
      to: "servico@teste.com",
      name: "Lucas"
    });
    expect(mocks.db.audit.create.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.sendRegistrationSuccessEmail.mock.invocationCallOrder[0]
    );
  });

  it("nao envia e-mail quando campos obrigatorios falham", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Lucas",
          email: "lucas@teste.com",
          password: "123456"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.db.users.create).not.toHaveBeenCalled();
    expect(mocks.sendRegistrationSuccessEmail).not.toHaveBeenCalled();
  });

  it("nao envia e-mail quando o documento e invalido", async () => {
    mocks.validateCPF.mockReturnValue(false);

    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Lucas",
          email: "lucas@teste.com",
          password: "123456",
          document: "123.456.789-00"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.db.users.create).not.toHaveBeenCalled();
    expect(mocks.sendRegistrationSuccessEmail).not.toHaveBeenCalled();
  });

  it("nao envia e-mail quando o e-mail ja esta cadastrado", async () => {
    mocks.db.users.findByEmail.mockResolvedValue({ id: "existing-user" });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Lucas",
          email: "lucas@teste.com",
          password: "123456",
          document: "123.456.789-00"
        })
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.db.users.create).not.toHaveBeenCalled();
    expect(mocks.sendRegistrationSuccessEmail).not.toHaveBeenCalled();
  });

  it("mantem cadastro como sucesso quando o envio do e-mail falha", async () => {
    mocks.sendRegistrationSuccessEmail.mockResolvedValue({ sent: false });
    mocks.db.users.create.mockImplementation(async (input: Record<string, unknown>) => ({
      id: "created-user",
      createdAt: "2026-04-18T12:00:00.000Z",
      updatedAt: "2026-04-18T12:00:00.000Z",
      ...input
    }));

    const response = await POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Lucas",
          email: "lucas@teste.com",
          password: "123456",
          document: "123.456.789-00"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.sendRegistrationSuccessEmail).toHaveBeenCalledWith({
      to: "lucas@teste.com",
      name: "Lucas"
    });
  });
});
