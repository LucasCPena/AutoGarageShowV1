import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  loadRuntimeEnvFiles: vi.fn(),
  logServerError: vi.fn()
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocks.createTransport
  }
}));

vi.mock("@/lib/runtime-env", () => ({
  loadRuntimeEnvFiles: mocks.loadRuntimeEnvFiles
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

import {
  sendPasswordChangedEmail,
  sendRegistrationSuccessEmail
} from "@/lib/mailer";

const ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"];
let previousEnv: Record<string, string | undefined>;

describe("mailer", () => {
  beforeEach(() => {
    previousEnv = {};
    for (const key of ENV_KEYS) {
      previousEnv[key] = process.env[key];
    }

    vi.resetAllMocks();
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_SECURE = "false";
    process.env.SMTP_USER = "falecom@autogarageshow.com.br";
    process.env.SMTP_PASSWORD = "smtp-password";
    process.env.MAIL_FROM = "falecom@autogarageshow.com.br";
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({ messageId: "message-1" });
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const previousValue = previousEnv[key];
      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  });

  it("envia e-mail de cadastro usando falecom como remetente", async () => {
    const result = await sendRegistrationSuccessEmail({
      to: "cliente@teste.com",
      name: "Lucas"
    });

    expect(result).toEqual({ sent: true });
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: {
          user: "falecom@autogarageshow.com.br",
          pass: "smtp-password"
        }
      })
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "falecom@autogarageshow.com.br",
        to: "cliente@teste.com",
        subject: "Cadastro realizado com sucesso - Auto Garage Show"
      })
    );
  });

  it("usa falecom como remetente padrao quando MAIL_FROM nao esta definido", async () => {
    delete process.env.MAIL_FROM;
    delete process.env.SMTP_USER;

    const result = await sendPasswordChangedEmail({
      to: "cliente@teste.com",
      name: "Lucas"
    });

    expect(result).toEqual({ sent: true });
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: {
          user: "falecom@autogarageshow.com.br",
          pass: "smtp-password"
        }
      })
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "falecom@autogarageshow.com.br",
        subject: "Senha alterada - Auto Garage Show"
      })
    );
  });

  it("retorna falha sem bloquear quando o SMTP rejeita o envio", async () => {
    const error = new Error("smtp indisponivel");
    mocks.sendMail.mockRejectedValue(error);

    const result = await sendPasswordChangedEmail({
      to: "cliente@teste.com",
      name: "Lucas"
    });

    expect(result).toEqual({ sent: false });
    expect(mocks.logServerError).toHaveBeenCalledWith(
      "Falha ao enviar e-mail de senha alterada",
      error
    );
  });

  it("retorna falha sem tentar enviar quando SMTP_HOST nao esta configurado", async () => {
    delete process.env.SMTP_HOST;

    const result = await sendRegistrationSuccessEmail({
      to: "cliente@teste.com",
      name: "Lucas"
    });

    expect(result).toEqual({ sent: false });
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
});
