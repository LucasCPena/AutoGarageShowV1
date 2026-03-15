import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, requireAdmin } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";

function sanitizeUser(user: Awaited<ReturnType<typeof db.users.findById>>) {
  if (!user) return null;
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const currentUser = getUserFromToken(request);
    const body = await request.json();
    const nextRole = body?.role === "admin" ? "admin" : body?.role === "user" ? "user" : null;

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
      role: nextRole
    });

    return NextResponse.json({
      user: sanitizeUser(updated),
      message: "Usuario atualizado com sucesso."
    });
  } catch (error) {
    console.error("Erro ao atualizar usuario do admin:", error);
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
