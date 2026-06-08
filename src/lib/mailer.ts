import nodemailer from "nodemailer";

import { loadRuntimeEnvFiles } from "@/lib/runtime-env";
import { logServerError } from "@/lib/server-log";

const DEFAULT_MAIL_FROM = "falecom@autogarageshow.com.br";

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user?: string;
  password?: string;
};

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function getMailConfig(): MailConfig | null {
  loadRuntimeEnvFiles();

  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_MAIL_FROM;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" || (!process.env.SMTP_SECURE && port === 465);
  const password = process.env.SMTP_PASSWORD?.trim();
  const user = process.env.SMTP_USER?.trim() || (password ? DEFAULT_MAIL_FROM : "");

  if (!host || !Number.isFinite(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    secure,
    from,
    user: user || undefined,
    password: password || undefined
  };
}

export function isMailConfigured() {
  return Boolean(getMailConfig());
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

function buildGreeting(name?: string) {
  const normalizedName = typeof name === "string" ? name.trim() : "";
  return normalizedName ? `Ola, ${normalizedName}!` : "Ola!";
}

async function sendMailSafely(context: string, message: MailMessage) {
  const config = getMailConfig();
  if (!config) {
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth:
      config.user || config.password
        ? {
            user: config.user,
            pass: config.password
          }
        : undefined
  });

  try {
    await transporter.sendMail({
      from: config.from,
      ...message
    });

    return { sent: true };
  } catch (error) {
    logServerError(context, error);
    return { sent: false };
  }
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresAt
}: {
  to: string;
  resetUrl: string;
  expiresAt: string;
}) {
  const safeResetUrl = escapeHtml(resetUrl);
  const safeExpiresAt = escapeHtml(expiresAt);

  return sendMailSafely("Falha ao enviar e-mail de recuperacao de senha", {
    to,
    subject: "Recuperacao de senha - Auto Garage Show",
    text: [
      "Recebemos uma solicitacao para redefinir a sua senha no Auto Garage Show.",
      "",
      `Use este link para criar uma nova senha: ${resetUrl}`,
      "",
      `Este link expira em: ${expiresAt}`,
      "",
      "Se voce nao solicitou essa alteracao, ignore este e-mail."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Recuperacao de senha</h2>
        <p>Recebemos uma solicitacao para redefinir a sua senha no Auto Garage Show.</p>
        <p>
          <a href="${safeResetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700">
            Redefinir senha
          </a>
        </p>
        <p>Se preferir, copie e cole este link no navegador:</p>
        <p><a href="${safeResetUrl}">${safeResetUrl}</a></p>
        <p>Este link expira em: ${safeExpiresAt}</p>
        <p>Se voce nao solicitou essa alteracao, ignore este e-mail.</p>
      </div>
    `
  });
}

export async function sendRegistrationSuccessEmail({
  to,
  name
}: {
  to: string;
  name: string;
}) {
  const greeting = buildGreeting(name);
  const safeGreeting = escapeHtml(greeting);

  return sendMailSafely("Falha ao enviar e-mail de cadastro realizado", {
    to,
    subject: "Cadastro realizado com sucesso - Auto Garage Show",
    text: [
      greeting,
      "",
      "Seu cadastro no Auto Garage Show foi realizado com sucesso.",
      "",
      "Agora voce ja pode acessar sua conta e usar os recursos disponiveis no site."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Cadastro realizado com sucesso</h2>
        <p>${safeGreeting}</p>
        <p>Seu cadastro no Auto Garage Show foi realizado com sucesso.</p>
        <p>Agora voce ja pode acessar sua conta e usar os recursos disponiveis no site.</p>
      </div>
    `
  });
}

export async function sendPasswordChangedEmail({
  to,
  name
}: {
  to: string;
  name?: string;
}) {
  const greeting = buildGreeting(name);
  const safeGreeting = escapeHtml(greeting);

  return sendMailSafely("Falha ao enviar e-mail de senha alterada", {
    to,
    subject: "Senha alterada - Auto Garage Show",
    text: [
      greeting,
      "",
      "A senha da sua conta no Auto Garage Show foi alterada com sucesso.",
      "",
      "Se voce nao fez essa alteracao, solicite uma nova recuperacao de senha imediatamente."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Senha alterada</h2>
        <p>${safeGreeting}</p>
        <p>A senha da sua conta no Auto Garage Show foi alterada com sucesso.</p>
        <p>Se voce nao fez essa alteracao, solicite uma nova recuperacao de senha imediatamente.</p>
      </div>
    `
  });
}
