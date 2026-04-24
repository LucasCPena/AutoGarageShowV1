import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readEventsTableDefinition() {
  const schemaPath = path.join(process.cwd(), "db", "schema.mysql.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const match = schema.match(/CREATE TABLE IF NOT EXISTS events \(([\s\S]*?)\);/i);
  return match?.[1] ?? "";
}

describe("mysql schema", () => {
  it("keeps event contact columns compatible with encrypted values", () => {
    const eventsTable = readEventsTableDefinition();

    expect(eventsTable).toMatch(/\bcontact_document\s+TEXT\s+NOT NULL\b/i);
    expect(eventsTable).toMatch(/\bcontact_phone\s+TEXT\s+NULL\b/i);
    expect(eventsTable).toMatch(/\bcontact_phone_secondary\s+TEXT\s+NULL\b/i);
    expect(eventsTable).toMatch(/\bcontact_email\s+TEXT\s+NULL\b/i);
    expect(eventsTable).toMatch(/\borganizer_logo\s+VARCHAR\(255\)(?:\s|,|$)/i);
  });
});
