import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

const PASSWORD_HASH_PREFIX = "scrypt:v1";
const PASSWORD_KEY_LENGTH = 64;

function toBase64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function safeCompareText(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf-8");
  const rightBuffer = Buffer.from(right, "utf-8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isPasswordHash(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(`${PASSWORD_HASH_PREFIX}$`);
}

export async function hashPassword(password: string) {
  const normalizedPassword = String(password || "");
  if (!normalizedPassword) {
    throw new Error("Senha invalida.");
  }

  const salt = toBase64Url(randomBytes(16));
  const derivedKey = (await scrypt(
    normalizedPassword,
    salt,
    PASSWORD_KEY_LENGTH
  )) as Buffer;

  return `${PASSWORD_HASH_PREFIX}$${salt}$${toBase64Url(derivedKey)}`;
}

export async function verifyPassword(
  inputPassword: string,
  storedPassword: string | null | undefined
) {
  const normalizedInput = String(inputPassword || "");
  const normalizedStored = String(storedPassword || "");

  if (!normalizedInput || !normalizedStored) {
    return {
      valid: false,
      needsUpgrade: false
    };
  }

  if (!isPasswordHash(normalizedStored)) {
    return {
      valid: safeCompareText(normalizedInput, normalizedStored),
      needsUpgrade: true
    };
  }

  const [, salt, expectedHash] = normalizedStored.split("$");
  if (!salt || !expectedHash) {
    return {
      valid: false,
      needsUpgrade: true
    };
  }

  const derivedKey = (await scrypt(
    normalizedInput,
    salt,
    PASSWORD_KEY_LENGTH
  )) as Buffer;
  const expectedBuffer = fromBase64Url(expectedHash);

  if (derivedKey.length !== expectedBuffer.length) {
    return {
      valid: false,
      needsUpgrade: false
    };
  }

  return {
    valid: timingSafeEqual(derivedKey, expectedBuffer),
    needsUpgrade: false
  };
}
