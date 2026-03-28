import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes
} from "crypto";

import { loadRuntimeEnvFiles } from "@/lib/runtime-env";

const ENCRYPTED_FIELD_PREFIX = "enc:v1";
const warnedKeys = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

function readSecret(names: string[]) {
  loadRuntimeEnvFiles();

  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return null;
}

function getFieldSecret() {
  return readSecret([
    "APP_FIELD_ENCRYPTION_KEY",
    "FIELD_ENCRYPTION_KEY",
    "AUTH_TOKEN_SECRET",
    "NEXTAUTH_SECRET"
  ]);
}

function getDerivedKey(purpose: string) {
  const secret = getFieldSecret();
  if (!secret) return null;
  return createHash("sha256").update(`${purpose}:${secret}`).digest();
}

function normalizeValue(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

export function isEncryptedValue(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(`${ENCRYPTED_FIELD_PREFIX}:`);
}

export function encryptSensitiveString(value: string | null | undefined) {
  const normalized = normalizeValue(value);
  if (!normalized) return undefined;
  if (isEncryptedValue(normalized)) return normalized;

  const key = getDerivedKey("field-encryption");
  if (!key) {
    warnOnce(
      "missing-field-encryption-secret",
      "[security] APP_FIELD_ENCRYPTION_KEY nao configurada; campos sensiveis permanecerao em modo legado."
    );
    return normalized;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf-8"),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_FIELD_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(":");
}

export function decryptSensitiveString(value: string | null | undefined) {
  const normalized = normalizeValue(value);
  if (!normalized) return undefined;
  if (!isEncryptedValue(normalized)) return normalized;

  const [, , ivValue, tagValue, encryptedValue] = normalized.split(":");
  if (!ivValue || !tagValue || !encryptedValue) {
    return undefined;
  }

  const key = getDerivedKey("field-encryption");
  if (!key) {
    throw new Error("Chave de criptografia de campos nao configurada.");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivValue, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final()
    ]);
    return normalizeValue(decrypted.toString("utf-8"));
  } catch {
    warnOnce(
      "field-decryption-failed",
      "[security] Falha ao descriptografar um campo sensivel. Verifique a chave configurada."
    );
    return undefined;
  }
}

export function fingerprintSensitiveValue(
  value: string | null | undefined,
  purpose: string
) {
  const normalized = normalizeValue(value);
  if (!normalized) return null;

  const secret = getFieldSecret();
  if (!secret) {
    return createHash("sha256")
      .update(`${purpose}:${normalized}`)
      .digest("hex");
  }

  return createHmac("sha256", createHash("sha256").update(`fp:${secret}`).digest())
    .update(`${purpose}:${normalized}`)
    .digest("hex");
}

export function transformRecordSensitiveFields<T extends Record<string, unknown>>(
  record: T,
  fields: string[],
  mode: "encrypt" | "decrypt"
) {
  const next: Record<string, unknown> = { ...record };

  for (const field of fields) {
    const value = next[field];
    if (typeof value !== "string" && value !== null && value !== undefined) {
      continue;
    }

    next[field] =
      mode === "encrypt"
        ? encryptSensitiveString(value as string | null | undefined) ?? null
        : decryptSensitiveString(value as string | null | undefined) ?? undefined;
  }

  return next as T;
}
