import { beforeAll, describe, expect, it } from "vitest";

import {
  decryptSensitiveString,
  encryptSensitiveString,
  fingerprintSensitiveValue,
  isEncryptedValue,
  transformRecordSensitiveFields
} from "@/lib/secure-fields";

describe("secure-fields", () => {
  beforeAll(() => {
    process.env.APP_FIELD_ENCRYPTION_KEY = "unit-test-field-secret";
  });

  it("encrypts and decrypts a sensitive string", () => {
    const encrypted = encryptSensitiveString("52998224725");

    expect(encrypted).toBeTruthy();
    expect(encrypted).not.toBe("52998224725");
    expect(isEncryptedValue(encrypted)).toBe(true);
    expect(decryptSensitiveString(encrypted)).toBe("52998224725");
  });

  it("keeps encryption idempotent for an already encrypted value", () => {
    const encrypted = encryptSensitiveString("contato@teste.com");
    const encryptedAgain = encryptSensitiveString(encrypted);

    expect(encryptedAgain).toBe(encrypted);
  });

  it("creates stable fingerprints and varies them by purpose", () => {
    const first = fingerprintSensitiveValue("12345678909", "user-document");
    const second = fingerprintSensitiveValue("12345678909", "user-document");
    const differentPurpose = fingerprintSensitiveValue("12345678909", "listing-document");

    expect(first).toBe(second);
    expect(first).not.toBe(differentPurpose);
  });

  it("transforms selected record fields with encrypt and decrypt modes", () => {
    const encryptedRecord = transformRecordSensitiveFields(
      {
        email: "cliente@teste.com",
        phone: "(11) 99999-0000",
        title: "Publico"
      },
      ["email", "phone"],
      "encrypt"
    );

    expect(isEncryptedValue(String(encryptedRecord.email))).toBe(true);
    expect(isEncryptedValue(String(encryptedRecord.phone))).toBe(true);
    expect(encryptedRecord.title).toBe("Publico");

    const decryptedRecord = transformRecordSensitiveFields(
      encryptedRecord,
      ["email", "phone"],
      "decrypt"
    );

    expect(decryptedRecord).toEqual({
      email: "cliente@teste.com",
      phone: "(11) 99999-0000",
      title: "Publico"
    });
  });
});
