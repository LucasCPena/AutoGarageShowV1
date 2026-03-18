import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Erro ao verificar autenticacao:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
