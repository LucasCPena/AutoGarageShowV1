import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const db = {
    events: {
      getAll: vi.fn(),
      findBySlug: vi.fn(),
      create: vi.fn()
    },
    settings: {
      get: vi.fn()
    },
    audit: {
      create: vi.fn()
    }
  };

  return {
    db,
    getUserFromToken: vi.fn(),
    isMysqlRequiredError: vi.fn(),
    syncOrganizerFromEvent: vi.fn(),
    sanitizeEventForViewer: vi.fn(),
    logServerError: vi.fn()
  };
});

vi.mock("@/lib/auth-middleware", () => ({
  getUserFromToken: mocks.getUserFromToken
}));

vi.mock("@/lib/database", () => ({
  db: mocks.db,
  isMysqlRequiredError: mocks.isMysqlRequiredError
}));

vi.mock("@/lib/organizers-sync", () => ({
  syncOrganizerFromEvent: mocks.syncOrganizerFromEvent
}));

vi.mock("@/lib/privacy", () => ({
  sanitizeEventForViewer: mocks.sanitizeEventForViewer
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: mocks.logServerError
}));

import { POST } from "@/app/api/events/route";

describe("api/events route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getUserFromToken.mockResolvedValue(null);
    mocks.isMysqlRequiredError.mockReturnValue(false);
    mocks.db.settings.get.mockResolvedValue({ events: { requireApproval: true } });
    mocks.db.events.findBySlug.mockResolvedValue(null);
    mocks.db.audit.create.mockResolvedValue(undefined);
    mocks.syncOrganizerFromEvent.mockResolvedValue(undefined);
    mocks.sanitizeEventForViewer.mockImplementation((event: unknown) => event);
  });

  it("cria evento publico pendente sem login e usa documento legado padrao", async () => {
    mocks.db.events.create.mockImplementation(async (input: Record<string, unknown>) => ({
      id: "event-created",
      createdAt: "2026-04-24T12:00:00.000Z",
      updatedAt: "2026-04-24T12:00:00.000Z",
      ...input
    }));

    const response = await POST(
      new NextRequest("http://localhost/api/events", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Encontro Teste",
          description: "Evento para validar cadastro",
          city: "Sao Paulo",
          state: "SP",
          location: "Centro de Eventos",
          contactName: "Organizador Teste",
          startAt: "2026-05-10T12:00:00.000Z",
          endAt: "2026-05-10T15:00:00.000Z"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(mocks.db.events.findBySlug).toHaveBeenCalledWith("encontro-teste");
    expect(mocks.db.events.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Encontro Teste",
        slug: "encontro-teste",
        status: "pending",
        createdBy: "anonymous",
        contactName: "Organizador Teste",
        contactDocument: "nao informado",
        recurrence: { type: "single" },
        featured: false
      })
    );
    expect(mocks.syncOrganizerFromEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "event-created",
        status: "pending"
      })
    );
    expect(mocks.db.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "event.create",
        entityType: "event",
        entityId: "event-created",
        status: "success",
        path: "/api/events"
      })
    );

    const data = await response.json();
    expect(data.event).toEqual(
      expect.objectContaining({
        id: "event-created",
        status: "pending",
        contactDocument: "nao informado"
      })
    );
    expect(data.message).toBe("Evento criado e enviado para aprovacao.");
  });
});
