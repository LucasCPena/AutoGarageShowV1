import { describe, expect, it } from "vitest";

import { createAuthToken, parseAuthToken } from "@/lib/auth-token";

describe("auth-token", () => {
  it("creates and validates a signed token", () => {
    const token = createAuthToken({
      id: "user-1",
      email: "user@test.local"
    });

    const payload = parseAuthToken(token);

    expect(payload).toMatchObject({
      sub: "user-1",
      email: "user@test.local"
    });
  });

  it("rejects a tampered token", () => {
    const token = createAuthToken({
      id: "user-1",
      email: "user@test.local"
    });

    const [payload] = token.split(".");
    const tampered = `${payload}.assinatura-invalida`;

    expect(parseAuthToken(tampered)).toBeNull();
  });
});
