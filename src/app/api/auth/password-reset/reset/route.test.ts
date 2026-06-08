import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumePasswordResetToken: vi.fn(),
  sendPasswordChangedEmail: vi.fn(),
  logServerError: vi.fn()
}));

vi.mock("@/lib/password-reset", () => ({
  consumePasswordResetToken: mocks.consumePasswordResetToken
}));

vi.mock("@/lib/mailer", () => ({
  sendPasswordChangedEmail: mocks.sendPasswordChangedEmail
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

import { POST } from "@/app/api/auth/password-reset/reset/route";

describe("api/auth/password-reset/reset route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.consumePasswordResetToken.mockResolvedValue({
      userId: "user-1",
      email: "lucas@teste.com",
      name: "Lucas"
    });
    mocks.sendPasswordChangedEmail.mockResolvedValue({ sent: true });
  });

  it("envia e-mail de confirmacao apos alterar a senha com sucesso", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/password-reset/reset", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          token: "valid-token",
          password: "123456"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.consumePasswordResetToken).toHaveBeenCalledWith("valid-token", "123456");
    expect(mocks.sendPasswordChangedEmail).toHaveBeenCalledWith({
      to: "lucas@teste.com",
      name: "Lucas"
    });
  });

  it("mantem redefinicao como sucesso quando o envio do e-mail falha", async () => {
    mocks.sendPasswordChangedEmail.mockResolvedValue({ sent: false });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/password-reset/reset", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          token: "valid-token",
          password: "123456"
        })
      })
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Senha redefinida com sucesso. Agora voce ja pode entrar.");
    expect(mocks.sendPasswordChangedEmail).toHaveBeenCalledTimes(1);
  });

  it("nao envia e-mail quando a senha e invalida", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/password-reset/reset", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          token: "valid-token",
          password: "123"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.consumePasswordResetToken).not.toHaveBeenCalled();
    expect(mocks.sendPasswordChangedEmail).not.toHaveBeenCalled();
  });
});
