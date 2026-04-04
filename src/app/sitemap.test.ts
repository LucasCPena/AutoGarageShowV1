import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    events: {
      getAll: vi.fn()
    }
  }
}));

vi.mock("@/lib/database", () => ({
  db: mocks.db
}));

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.events.getAll.mockResolvedValue([]);
  });

  it("inclui as novas rotas publicas do marketplace", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://www.autogarageshow.com.br/veiculos");
    expect(urls).toContain("https://www.autogarageshow.com.br/motos");
    expect(urls).toContain("https://www.autogarageshow.com.br/lojistas");
    expect(urls).toContain("https://www.autogarageshow.com.br/classificados");
  });
});
