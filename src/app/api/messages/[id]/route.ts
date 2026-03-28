import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { sanitizeAdvertiserMessageForViewer } from "@/lib/privacy";
import { logServerError } from "@/lib/server-log";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const messages = await db.messages.getAll();
    const current = messages.find((item) => item.id === params.id);

    if (!current) {
      return NextResponse.json({ error: "Mensagem nao encontrada." }, { status: 404 });
    }

    if (user.role !== "admin" && current.recipientUserId !== user.id) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const nextStatus =
      body?.status === "read" || body?.status === "archived" || body?.status === "new"
        ? body.status
        : null;

    if (!nextStatus) {
      return NextResponse.json(
        { error: "Status invalido. Use new, read ou archived." },
        { status: 400 }
      );
    }

    const updated = await db.messages.update(params.id, {
      status: nextStatus
    });

    await db.audit.create({
      actorUserId: user.id,
      action: "message.update_status",
      entityType: "message",
      entityId: params.id,
      status: "success",
      path: `/api/messages/${params.id}`,
      metadata: {
        nextStatus
      }
    });

    return NextResponse.json({
      message: updated ? sanitizeAdvertiserMessageForViewer(updated, user) : null
    });
  } catch (error) {
    logServerError("Erro ao atualizar mensagem", error);
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
