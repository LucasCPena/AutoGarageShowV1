import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { toPublicAssetUrl } from "@/lib/site-url";

function normalizeOptionalLink(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return undefined;
}

function isAuthError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("acesso negado") || message.includes("autoriz");
}

function organizersDbErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code ?? "").toUpperCase()
      : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  const isSchemaError =
    code === "ER_NO_SUCH_TABLE" ||
    message.includes("table") && message.includes("organizers");
  if (isSchemaError) {
    return "Tabela de organizadores ausente no banco. Execute a migracao do schema MySQL.";
  }

  const isPermissionError =
    code === "ER_TABLEACCESS_DENIED_ERROR" ||
    code === "ER_DBACCESS_DENIED_ERROR" ||
    message.includes("access denied");
  if (isPermissionError) {
    return "Sem permissao no MySQL para criar/usar tabela de organizadores.";
  }

  return null;
}

export async function GET() {
  try {
    const organizers = await db.organizers.getAll();
    organizers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ organizers });
  } catch (error) {
    console.error("Erro ao buscar organizadores:", error);
    const dbMessage = organizersDbErrorMessage(error);
    if (dbMessage) {
      return NextResponse.json({ error: dbMessage }, { status: 500 });
    }
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);
    const body = await request.json();

    const logo = toPublicAssetUrl(body?.logo, { uploadType: "event" });
    if (!logo || logo.startsWith("data:")) {
      return NextResponse.json(
        { error: "Logo invalido. Envie arquivo ou URL publica." },
        { status: 400 }
      );
    }

    const rawLink = body?.link;
    const link = normalizeOptionalLink(rawLink);
    if (
      typeof rawLink === "string" &&
      rawLink.trim().length > 0 &&
      !link
    ) {
      return NextResponse.json(
        { error: "Link invalido. Use URL valida (ex.: https://...)." },
        { status: 400 }
      );
    }

    const organizer = await db.organizers.create({
      logo,
      link
    });

    return NextResponse.json(
      { organizer, message: "Organizador criado com sucesso" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar organizador:", error);
    const dbMessage = organizersDbErrorMessage(error);
    if (dbMessage) {
      return NextResponse.json({ error: dbMessage }, { status: 500 });
    }
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
