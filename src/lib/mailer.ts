import nodemailer from "nodemailer";

import { loadRuntimeEnvFiles } from "@/lib/runtime-env";

type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  user?: string;
  password?: string;
};

function getMailConfig(): MailConfig | null {
  loadRuntimeEnvFiles();

  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.MAIL_FROM?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" || (!process.env.SMTP_SECURE && port === 465);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();

  if (!host || !from || !Number.isFinite(port) || port <= 0) {
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

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresAt
}: {
  to: string;
  resetUrl: string;
  expiresAt: string;
}) {
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

  await transporter.sendMail({
    from: config.from,
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
          <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700">
            Redefinir senha
          </a>
        </p>
        <p>Se preferir, copie e cole este link no navegador:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Este link expira em: ${expiresAt}</p>
        <p>Se voce nao solicitou essa alteracao, ignore este e-mail.</p>
      </div>
    `
  });

  return { sent: true };
}
