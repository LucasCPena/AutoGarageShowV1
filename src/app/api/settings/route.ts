import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { normalizeListingPlans } from "@/lib/listingPlans";

export async function GET() {
  try {
    const settings = await db.settings.get();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Erro ao buscar configuracoes:", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    requireAdmin(request);
    const updates = await request.json();
    const normalizedUpdates =
      updates && typeof updates === "object"
        ? {
            ...updates,
            ...(Object.prototype.hasOwnProperty.call(updates, "listingPlans")
              ? { listingPlans: normalizeListingPlans(updates.listingPlans) }
              : {})
          }
        : updates;

    const settings = await db.settings.update(normalizedUpdates);
    return NextResponse.json({ settings, message: "Configuracoes atualizadas com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar configuracoes:", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
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
