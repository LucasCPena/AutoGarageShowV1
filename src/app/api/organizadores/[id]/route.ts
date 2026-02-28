import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { toPublicAssetUrl } from "@/lib/site-url";

function normalizeOptionalText(value: unknown, max = 180) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

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
    (message.includes("table") && message.includes("organizers"));
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizer = await db.organizers.findById(params.id);
    if (!organizer) {
      return NextResponse.json({ error: "Organizador nao encontrado" }, { status: 404 });
    }
    return NextResponse.json({ organizer });
  } catch (error) {
    console.error("Erro ao buscar organizador:", error);
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const existing = await db.organizers.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Organizador nao encontrado" }, { status: 404 });
    }

    const parsedBody = await request.json();
    const body =
      parsedBody && typeof parsedBody === "object"
        ? (parsedBody as Record<string, unknown>)
        : {};
    const updates: { name?: string; logo?: string; altText?: string | undefined; bannerTop?: string | undefined; link?: string | undefined } = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      const name = normalizeOptionalText(body?.name, 120);
      if (!name) {
        return NextResponse.json({ error: "Informe o nome do organizador." }, { status: 400 });
      }
      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, "logo")) {
      const logo = toPublicAssetUrl(body?.logo, { uploadType: "event" });
      if (!logo || logo.startsWith("data:")) {
        return NextResponse.json(
          { error: "Logo invalido. Envie arquivo ou URL publica." },
          { status: 400 }
        );
      }
      updates.logo = logo;
    }

    if (Object.prototype.hasOwnProperty.call(body, "altText")) {
      updates.altText = normalizeOptionalText(body?.altText, 180);
    }

    if (Object.prototype.hasOwnProperty.call(body, "bannerTop")) {
      const bannerTop = toPublicAssetUrl(body?.bannerTop, { uploadType: "banner" });
      updates.bannerTop = bannerTop && !bannerTop.startsWith("data:") ? bannerTop : undefined;
    }

    if (Object.prototype.hasOwnProperty.call(body, "link")) {
      if (typeof body?.link === "string" && body.link.trim().length > 0) {
        const link = normalizeOptionalLink(body.link);
        if (!link) {
          return NextResponse.json(
            { error: "Link invalido. Use URL valida (ex.: https://...)." },
            { status: 400 }
          );
        }
        updates.link = link;
      } else {
        updates.link = undefined;
      }
    }

    const organizer = await db.organizers.update(params.id, updates);
    if (!organizer) {
      return NextResponse.json({ error: "Organizador nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({ organizer, message: "Organizador atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar organizador:", error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const existing = await db.organizers.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Organizador nao encontrado" }, { status: 404 });
    }
    await db.organizers.delete(params.id);
    return NextResponse.json({ message: "Organizador excluido com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir organizador:", error);
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
