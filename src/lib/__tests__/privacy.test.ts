import { describe, expect, it } from "vitest";

import {
  maskDocument,
  maskEmail,
  sanitizeAdvertiserMessageForViewer,
  sanitizeListingForViewer,
  sanitizeMetricMetadata,
  sanitizeMetricPath,
  sanitizeUserForAdminList
} from "@/lib/privacy";

describe("privacy", () => {
  it("masks user document and phone in the admin list", () => {
    const user = sanitizeUserForAdminList({
      id: "user-1",
      name: "Cliente",
      email: "cliente@teste.com",
      password: "segredo",
      role: "user",
      document: "12345678909",
      phone: "11999990000",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    } as any);

    expect("password" in user).toBe(false);
    expect(user.document).toBe("*******8909");
    expect(user.phone).toBe("*******0000");
  });

  it("hides listing contact and document for anonymous viewers", () => {
    const listing = sanitizeListingForViewer(
      {
        id: "listing-1",
        createdBy: "owner-1",
        document: "12345678909",
        contact: {
          name: "Joao",
          email: "joao@teste.com",
          phone: "11999990000"
        }
      } as any,
      null
    );

    expect(listing.document).toBe("");
    expect(listing.contact).toEqual({
      name: "",
      email: "",
      phone: ""
    });
  });

  it("shows contact but still hides document from non-owner authenticated viewers", () => {
    const listing = sanitizeListingForViewer(
      {
        id: "listing-1",
        createdBy: "owner-1",
        document: "12345678909",
        contact: {
          name: "Joao",
          email: "joao@teste.com",
          phone: "11999990000"
        }
      } as any,
      {
        id: "viewer-1",
        role: "user"
      }
    );

    expect(listing.document).toBe("");
    expect(listing.contact.email).toBe("joao@teste.com");
  });

  it("shows document to the owner", () => {
    const listing = sanitizeListingForViewer(
      {
        id: "listing-1",
        createdBy: "owner-1",
        document: "12345678909",
        contact: {
          name: "Joao",
          email: "joao@teste.com",
          phone: "11999990000"
        }
      } as any,
      {
        id: "owner-1",
        role: "user"
      }
    );

    expect(listing.document).toBe("12345678909");
    expect(listing.contact.phone).toBe("11999990000");
  });

  it("masks advertiser messages for unauthorized viewers", () => {
    const message = sanitizeAdvertiserMessageForViewer(
      {
        id: "message-1",
        senderUserId: "sender-1",
        recipientUserId: "recipient-1",
        senderName: "Maria",
        senderEmail: "maria@teste.com",
        senderPhone: "11988887777",
        subject: "Contato",
        message: "Tenho interesse no veiculo",
        status: "new",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      } as any,
      {
        id: "outsider-1",
        role: "user"
      }
    );

    expect(message.senderEmail).toBe(maskEmail("maria@teste.com"));
    expect(message.senderPhone).toBe("*******7777");
    expect(message.message).toBe("");
  });

  it("sanitizes metric metadata and removes sensitive keys", () => {
    expect(
      sanitizeMetricMetadata({
        query: "fusca",
        senderEmail: "cliente@teste.com",
        page: "/veiculos",
        results: 10,
        hasPhoto: true
      })
    ).toEqual({
      page: "/veiculos",
      results: 10,
      hasPhoto: true
    });
  });

  it("normalizes metric paths and helper masks", () => {
    expect(sanitizeMetricPath("/busca?q=fusca#topo")).toBe("/busca");
    expect(maskDocument("12345678909")).toBe("*******8909");
    expect(maskEmail("maria@teste.com")).toBe("ma***@te***.com");
  });
});
