import { describe, expect, it } from "vitest";

import { formatDateTime } from "@/lib/date";

describe("date format helpers", () => {
  it("formata data e hora no fuso esperado do projeto", () => {
    expect(formatDateTime("2026-04-04T12:30:00.000Z")).toBe("04/04/2026, 09:30");
  });
});
