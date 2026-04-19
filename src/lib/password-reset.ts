import { randomBytes } from "crypto";

import { db } from "@/lib/database";
import { hashPassword } from "@/lib/password";
import { fingerprintSensitiveValue } from "@/lib/secure-fields";
import { siteUrl } from "@/lib/site-url";

const PASSWORD_RESET_EXPIRATION_MS = 1000 * 60 * 60;

type PasswordResetAuditRequest = {
  requestId: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
};

function getTokenHash(token: string) {
  const hash = fingerprintSensitiveValue(token, "password-reset");
  if (!hash) {
    throw new Error("Não foi possível gerar o token de recuperação.");
  }
  return hash;
}

function getRequestMetadata(event: Awaited<ReturnType<typeof db.audit.getAll>>[number]) {
  const metadata =
    event.metadata && typeof event.metadata === "object"
      ? (event.metadata as Record<string, unknown>)
      : null;

  const tokenHash = typeof metadata?.tokenHash === "string" ? metadata.tokenHash : "";
  const expiresAt = typeof metadata?.expiresAt === "string" ? metadata.expiresAt : "";

  if (!tokenHash || !expiresAt || !event.entityId) return null;

  return {
    requestId: event.id,
    userId: event.entityId,
    tokenHash,
    expiresAt,
    createdAt: event.createdAt
  };
}

function getUsedRequestId(event: Awaited<ReturnType<typeof db.audit.getAll>>[number]) {
  const metadata =
    event.metadata && typeof event.metadata === "object"
      ? (event.metadata as Record<string, unknown>)
      : null;

  return typeof metadata?.requestId === "string" ? metadata.requestId : null;
}

function buildPasswordResetUrl(token: string) {
  return `${siteUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

export async function createPasswordResetRequest(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = getTokenHash(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MS).toISOString();

  const requestEvent = await db.audit.create({
    actorUserId: userId,
    action: "auth.password_reset_requested",
    entityType: "user",
    entityId: userId,
    status: "success",
    path: "/api/auth/password-reset/request",
    metadata: {
      tokenHash,
      expiresAt
    }
  });

  return {
    requestId: requestEvent.id,
    token,
    resetUrl: buildPasswordResetUrl(token),
    expiresAt
  };
}

async function findMatchingResetRequest(token: string): Promise<PasswordResetAuditRequest | null> {
  const tokenHash = getTokenHash(token);

  const events = await db.audit.getAll();
  const usedRequestIds = new Set(
    events
      .filter((event) => event.action === "auth.password_reset_used" && event.status === "success")
      .map(getUsedRequestId)
      .filter((value): value is string => Boolean(value))
  );

  const requests = events
    .filter(
      (event) => event.action === "auth.password_reset_requested" && event.status === "success"
    )
    .map(getRequestMetadata)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .filter((event) => event.tokenHash === tokenHash)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const now = Date.now();
  const activeRequest = requests.find(
    (event) =>
      !usedRequestIds.has(event.requestId) && new Date(event.expiresAt).getTime() > now
  );

  return activeRequest ?? null;
}

export async function verifyPasswordResetToken(token: string) {
  const request = await findMatchingResetRequest(token);
  if (!request) return null;

  const user = await db.users.findById(request.userId);
  if (!user) return null;

  return {
    requestId: request.requestId,
    userId: request.userId,
    email: user.email,
    expiresAt: request.expiresAt
  };
}

export async function consumePasswordResetToken(token: string, password: string) {
  const validRequest = await verifyPasswordResetToken(token);
  if (!validRequest) {
    throw new Error("Token invalido ou expirado.");
  }

  const passwordHash = await hashPassword(password);
  const updatedUser = await db.users.update(validRequest.userId, {
    password: passwordHash
  });

  if (!updatedUser) {
    throw new Error("Usuário não encontrado.");
  }

  await db.audit.create({
    actorUserId: updatedUser.id,
    action: "auth.password_reset_used",
    entityType: "user",
    entityId: updatedUser.id,
    status: "success",
    path: "/api/auth/password-reset/reset",
    metadata: {
      requestId: validRequest.requestId
    }
  });

  return {
    userId: updatedUser.id,
    email: updatedUser.email
  };
}
