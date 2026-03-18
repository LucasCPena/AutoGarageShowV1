import { describe, expect, it } from "vitest";

import { isPublicEventStatus } from "@/lib/event-status";

describe("event-status", () => {
  it("keeps approved and completed events visible to the public", () => {
    expect(isPublicEventStatus("approved")).toBe(true);
    expect(isPublicEventStatus("completed")).toBe(true);
  });

  it("hides pending events from the public", () => {
    expect(isPublicEventStatus("pending")).toBe(false);
  });
});
