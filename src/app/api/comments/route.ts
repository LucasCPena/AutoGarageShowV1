import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");
    const eventId = searchParams.get("eventId");
    const pending = searchParams.get("pending");

    if (listingId) {
      const comments = await db.comments.findByListing(listingId);
      return NextResponse.json({ comments });
    }

    if (eventId) {
      const comments = await db.comments.findByEvent(eventId);
      return NextResponse.json({ comments });
    }

    if (pending === "true") {
      requireAdmin(request);
      const comments = await db.comments.getPending();
      return NextResponse.json({ comments });
    }

    requireAdmin(request);
    const comments = await db.comments.getAll();
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Erro ao buscar comentarios:", error);
    if (error instanceof Error) {
      const lowerMessage = error.message.toLowerCase();
      if (lowerMessage.includes("nao autorizado") || lowerMessage.includes("acesso negado")) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const commentData = await request.json();
    const requiredFields = ["listingId", "name", "email", "message"] as const;

    for (const field of requiredFields) {
      const value = String(commentData[field] ?? "").trim();
      if (!value) {
        return NextResponse.json({ error: `O campo ${field} e obrigatorio` }, { status: 400 });
      }
    }

    const settings = await db.settings.get();
    const maxLength = settings?.comments.maxLength || 1000;
    if (String(commentData.message).length > maxLength) {
      return NextResponse.json(
        { error: `Mensagem muito longa. Maximo: ${maxLength} caracteres` },
        { status: 400 }
      );
    }

    const comment = await db.comments.create({
      listingId: String(commentData.listingId),
      eventId: commentData.eventId ? String(commentData.eventId) : undefined,
      name: String(commentData.name),
      email: String(commentData.email),
      message: String(commentData.message),
      status: "pending"
    });

    return NextResponse.json(
      { comment, message: "Comentario enviado para aprovacao" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar comentario:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
