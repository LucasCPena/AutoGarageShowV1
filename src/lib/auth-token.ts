import { createHmac, timingSafeEqual } from "crypto";

import type { User } from "@/lib/database";

const TOKEN_VERSION = 1;
const DEFAULT_SECRET = "auto-garage-show-dev-secret";

export type AuthTokenPayload = {
  v: number;
  sub: string;
  email: string;
  iat: number;
};

function getAuthTokenSecret() {
  return (
    process.env.AUTH_TOKEN_SECRET ||
    process.env.MYSQL_PASSWORD ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    DEFAULT_SECRET
  );
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getAuthTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function isPayload(value: unknown): value is AuthTokenPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AuthTokenPayload>;
  return (
    payload.v === TOKEN_VERSION &&
    typeof payload.sub === "string" &&
    typeof payload.email === "string" &&
    typeof payload.iat === "number"
  );
}

export function createAuthToken(user: Pick<User, "id" | "email">) {
  const payload: AuthTokenPayload = {
    v: TOKEN_VERSION,
    sub: user.id,
    email: user.email,
    iat: Date.now()
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseAuthToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const provided = Buffer.from(signature, "utf-8");
  const expected = Buffer.from(expectedSignature, "utf-8");

  if (provided.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload));
    return isPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}
