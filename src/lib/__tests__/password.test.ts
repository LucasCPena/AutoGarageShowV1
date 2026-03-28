import { describe, expect, it } from "vitest";

import { hashPassword, isPasswordHash, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hashes and validates a password with scrypt", async () => {
    const hash = await hashPassword("SenhaForte123");

    expect(hash).not.toBe("SenhaForte123");
    expect(isPasswordHash(hash)).toBe(true);

    const result = await verifyPassword("SenhaForte123", hash);

    expect(result).toEqual({
      valid: true,
      needsUpgrade: false
    });
  });

  it("rejects an invalid password against a hash", async () => {
    const hash = await hashPassword("SenhaForte123");
    const result = await verifyPassword("SenhaErrada", hash);

    expect(result).toEqual({
      valid: false,
      needsUpgrade: false
    });
  });

  it("accepts a legacy plain-text password and marks it for upgrade", async () => {
    const result = await verifyPassword("legado123", "legado123");

    expect(result).toEqual({
      valid: true,
      needsUpgrade: true
    });
  });

  it("rejects malformed hashes safely", async () => {
    const result = await verifyPassword("qualquer", "scrypt:v1$incompleto");

    expect(result).toEqual({
      valid: false,
      needsUpgrade: true
    });
  });
});
