import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, requireAdmin } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { sanitizeUserForAdminList } from "@/lib/privacy";
import { logServerError } from "@/lib/server-log";

export const dynamic = "force-dynamic";

function sanitizeUser(user: Awaited<ReturnType<typeof db.users.findById>>) {
  if (!user) return null;
  return sanitizeUserForAdminList(user);
}

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);
    const currentUser = await getUserFromToken(request);
    const body = await request.json();

    const nextRole =
      body?.role === "admin" ? "admin" : body?.role === "user" ? "user" : null;
    const nextAccountType =
      body?.accountType === "company" ||
      body?.accountType === "agency" ||
      body?.accountType === "individual"
        ? body.accountType
        : "individual";
    const nextApprovalStatus =
      body?.approvalStatus === "pending" ? "pending" : "approved";
    const nextVerificationStatus =
      body?.verificationStatus === "unverified" ? "unverified" : "verified";
    const listingLimitOverride =
      body?.listingLimitOverride === null || body?.listingLimitOverride === ""
        ? null
        : typeof body?.listingLimitOverride === "number" &&
            Number.isFinite(body.listingLimitOverride) &&
            body.listingLimitOverride >= 0
          ? Math.round(body.listingLimitOverride)
          : undefined;

    if (!nextRole) {
      return NextResponse.json(
        { error: "Role invalida. Use admin ou user." },
        { status: 400 }
      );
    }

    const targetUser = await db.users.findById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    }

    if (targetUser.role === "admin" && nextRole === "user") {
      const users = await db.users.getAll();
      const adminCount = users.filter((user) => user.role === "admin").length;

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Nao e permitido remover o ultimo administrador." },
          { status: 400 }
        );
      }

      if (currentUser?.id === targetUser.id && adminCount <= 1) {
        return NextResponse.json(
          { error: "Seu usuario e o ultimo administrador ativo." },
          { status: 400 }
        );
      }
    }

    const updated = await db.users.update(params.id, {
      role: nextRole,
      accountType: nextAccountType,
      companyName: sanitizeText(body?.companyName, 160) || undefined,
      logoUrl: sanitizeText(body?.logoUrl, 255) || undefined,
      approvalStatus: nextApprovalStatus,
      verificationStatus: nextVerificationStatus,
      listingLimitOverride
    });

    await db.audit.create({
      actorUserId: currentUser?.id,
      action: "user.update",
      entityType: "user",
      entityId: params.id,
      status: "success",
      path: `/api/admin/users/${params.id}`,
      metadata: {
        role: nextRole,
        accountType: nextAccountType,
        approvalStatus: nextApprovalStatus,
        verificationStatus: nextVerificationStatus
      }
    });

    return NextResponse.json({
      user: sanitizeUser(updated),
      message: "Usuario atualizado com sucesso."
    });
  } catch (error) {
    logServerError("Erro ao atualizar usuario do admin", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
