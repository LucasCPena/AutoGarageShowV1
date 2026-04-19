import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
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
