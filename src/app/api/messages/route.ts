import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { sanitizeAdvertiserMessageForViewer } from "@/lib/privacy";
import { logServerError } from "@/lib/server-log";

function sanitizeText(value: unknown, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.slice(0, maxLength);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const messages =
      user.role === "admin" && new URL(request.url).searchParams.get("scope") === "all"
        ? await db.messages.getAll()
        : await db.messages.findByRecipientUser(user.id);

    return NextResponse.json({
      messages: messages.map((message) => sanitizeAdvertiserMessageForViewer(message, user))
    });
  } catch (error) {
    logServerError("Erro ao buscar mensagens", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const listingId = sanitizeText(body?.listingId, 80);
    const subject = sanitizeText(body?.subject, 200);
    const messageText = sanitizeText(body?.message, 4000);
    const senderPhone = sanitizeText(body?.senderPhone, 30);

    if (!listingId || !messageText) {
      return NextResponse.json(
        { error: "Informe o anuncio e a mensagem." },
        { status: 400 }
      );
    }

    const listing = await db.listings.findById(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Anuncio nao encontrado." }, { status: 404 });
    }

    if (listing.createdBy === user.id) {
      return NextResponse.json(
        { error: "Voce nao pode enviar mensagem para o proprio anuncio." },
        { status: 400 }
      );
    }

    const advertiserMessage = await db.messages.create({
      senderUserId: user.id,
      senderName: user.name,
      senderEmail: user.email,
      senderPhone: senderPhone || undefined,
      recipientUserId: listing.createdBy,
      listingId: listing.id,
      subject: subject || `Contato sobre ${listing.title}`,
      message: messageText,
      status: "new"
    });

    await db.metrics.create({
      eventType: "message_sent",
      entityType: "listing",
      entityId: listing.id,
      ownerUserId: listing.createdBy,
      userId: user.id,
      path: `/veiculos/${listing.slug}`,
      label: listing.title,
      metadata: {
        messageStatus: advertiserMessage.status
      }
    });

    await db.audit.create({
      actorUserId: user.id,
      action: "message.create",
      entityType: "message",
      entityId: advertiserMessage.id,
      status: "success",
      path: "/api/messages",
      metadata: {
        listingId: listing.id,
        recipientUserId: listing.createdBy
      }
    });

    return NextResponse.json(
      {
        message: sanitizeAdvertiserMessageForViewer(advertiserMessage, user),
        notice: "Mensagem enviada ao anunciante e registrada no painel."
      },
      { status: 201 }
    );
  } catch (error) {
    logServerError("Erro ao enviar mensagem", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
