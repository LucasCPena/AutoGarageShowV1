import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    users: {
      getAll: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn()
    },
    audit: {
      create: vi.fn()
    }
  };

  return {
    db,
    requireAdmin: vi.fn(),
    isMysqlRequiredError: vi.fn(),
    hashPassword: vi.fn(),
    sanitizeUserForAdminList: vi.fn(),
    logServerError: vi.fn()
  };
});

vi.mock("@/lib/auth-middleware", () => ({
  requireAdmin: mocks.requireAdmin
}));

vi.mock("@/lib/database", () => ({
  db: mocks.db,
  isMysqlRequiredError: mocks.isMysqlRequiredError
}));

vi.mock("@/lib/password", () => ({
  hashPassword: mocks.hashPassword
}));

vi.mock("@/lib/privacy", () => ({
  sanitizeUserForAdminList: mocks.sanitizeUserForAdminList
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

import { POST } from "@/app/api/admin/users/route";

describe("api/admin/users route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "admin" });
    mocks.isMysqlRequiredError.mockReturnValue(false);
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.sanitizeUserForAdminList.mockImplementation((user: unknown) => user);
    mocks.db.users.findByEmail.mockResolvedValue(null);
    mocks.db.audit.create.mockResolvedValue(undefined);
  });

  it("cria administrador com senha hash e permissao admin", async () => {
    mocks.db.users.create.mockImplementation(async (input: Record<string, unknown>) => ({
      id: "admin-created",
      createdAt: "2026-05-07T12:00:00.000Z",
      updatedAt: "2026-05-07T12:00:00.000Z",
      ...input
    }));

    const response = await POST(
      new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Novo Admin",
          email: "NOVO@TESTE.COM",
          password: "123456",
          role: "admin"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.hashPassword).toHaveBeenCalledWith("123456");
    expect(mocks.db.users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Novo Admin",
        email: "novo@teste.com",
        password: "hashed-password",
        role: "admin",
        accountType: "individual",
        approvalStatus: "approved",
        verificationStatus: "verified",
        listingLimitOverride: null
      })
    );
    expect(mocks.db.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        action: "user.admin_create",
        entityId: "admin-created",
        status: "success"
      })
    );
  });

  it("bloqueia email duplicado", async () => {
    mocks.db.users.findByEmail.mockResolvedValue({ id: "existing" });

    const response = await POST(
      new NextRequest("http://localhost/api/admin/users", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: "Admin Existente",
          email: "admin@teste.com",
          password: "123456",
          role: "admin"
        })
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.db.users.create).not.toHaveBeenCalled();
  });
});
