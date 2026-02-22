import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/database";

async function notifyCommentApproved(comment: {
  id: string;
  listingId: string;
  eventId?: string;
  name: string;
  email: string;
  message: string;
}) {
  const webhookUrl = process.env.COMMENT_APPROVAL_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "comment.approved",
        approvedAt: new Date().toISOString(),
        commentId: comment.id,
        listingId: comment.listingId,
        eventId: comment.eventId ?? null,
        name: comment.name,
        email: comment.email,
        message: comment.message
      })
    });
  } catch (error) {
    console.error("Falha ao enviar notificacao de comentario aprovado:", error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const { status } = await request.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status invalido" },
        { status: 400 }
      );
    }

    const comment = await db.comments.update(params.id, { status });

    if (!comment) {
      return NextResponse.json(
        { error: "Comentario nao encontrado" },
        { status: 404 }
      );
    }

    if (status === "approved") {
      await notifyCommentApproved(comment);
    }

    return NextResponse.json(
      { comment, message: "Comentario atualizado com sucesso" }
    );
  } catch (error) {
    console.error("Erro ao atualizar comentario:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
