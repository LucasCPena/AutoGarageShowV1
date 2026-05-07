import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { hashPassword } from "@/lib/password";
import { sanitizeUserForAdminList } from "@/lib/privacy";
import { logServerError } from "@/lib/server-log";

export const dynamic = "force-dynamic";

function sanitizeUser(user: Awaited<ReturnType<typeof db.users.findById>>) {
  if (!user) return null;
  return sanitizeUserForAdminList(user);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const users = await db.users.getAll();
    const sanitizedUsers = users
      .map((user) => sanitizeUser(user))
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = new Date(a?.createdAt || 0).getTime();
        const bTime = new Date(b?.createdAt || 0).getTime();
        return bTime - aTime;
      });

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    logServerError("Erro ao buscar usuários do admin", error);
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

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAdmin(request);
    const body = await request.json();

    const normalizedName = sanitizeText(body?.name, 160);
    const normalizedEmail = sanitizeText(body?.email, 180).toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role === "user" ? "user" : "admin";

    if (!normalizedName || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Nome, email/login e senha sao obrigatorios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const existingUser = await db.users.findByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: "Este email/login ja esta cadastrado." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Contas criadas pelo admin usam o mesmo hash de senha do cadastro publico,
    // mas nao exigem CPF/CNPJ porque o objetivo aqui e conceder acesso ao painel.
    const createdUser = await db.users.create({
      name: normalizedName,
      email: normalizedEmail,
      password: passwordHash,
      role,
      accountType: "individual",
      approvalStatus: "approved",
      verificationStatus: "verified",
      listingLimitOverride: null
    });

    await db.audit.create({
      actorUserId: currentUser.id,
      action: "user.admin_create",
      entityType: "user",
      entityId: createdUser.id,
      status: "success",
      path: "/api/admin/users",
      metadata: {
        role
      }
    });

    return NextResponse.json(
      {
        user: sanitizeUser(createdUser),
        message: "Usuario criado com sucesso."
      },
      { status: 201 }
    );
  } catch (error) {
    logServerError("Erro ao criar usuario pelo admin", error);
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
