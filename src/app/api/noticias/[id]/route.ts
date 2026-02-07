import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/database";

const VALID_CATEGORIES = new Set(["eventos", "classificados", "geral", "dicas"]);

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueNewsSlug(title: string, excludeId?: string) {
  const base = slugify(title) || `noticia-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  for (;;) {
    const existing = await db.news.findBySlug(candidate);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromToken(request);
    const news = await db.news.findById(params.id);

    if (!news) {
      return NextResponse.json({ error: "Noticia nao encontrada" }, { status: 404 });
    }

    if (news.status !== "published" && user?.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    return NextResponse.json({ news });
  } catch (error) {
    console.error("Erro ao buscar noticia:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const existing = await db.news.findById(params.id);

    if (!existing) {
      return NextResponse.json({ error: "Noticia nao encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body?.title === "string" && body.title.trim()) {
      const title = body.title.trim();
      updates.title = title;
      updates.slug = await uniqueNewsSlug(title, existing.id);
    }

    if (typeof body?.content === "string" && body.content.trim()) {
      updates.content = body.content.trim();
    }

    if (typeof body?.excerpt === "string" && body.excerpt.trim()) {
      updates.excerpt = body.excerpt.trim();
    }

    if (typeof body?.category === "string" && VALID_CATEGORIES.has(body.category)) {
      updates.category = body.category;
    }

    if (typeof body?.coverImage === "string" && body.coverImage.trim()) {
      updates.coverImage = body.coverImage.trim();
    }

    if (typeof body?.author === "string" && body.author.trim()) {
      updates.author = body.author.trim();
    }

    if (body?.status === "draft" || body?.status === "published") {
      updates.status = body.status;
    }

    const news = await db.news.update(params.id, updates);
    if (!news) {
      return NextResponse.json({ error: "Noticia nao encontrada" }, { status: 404 });
    }

    return NextResponse.json({ news, message: "Noticia atualizada com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar noticia:", error);
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("acesso negado")) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
      }
      if (message.includes("autoriz")) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
      }
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
    const existing = await db.news.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Noticia nao encontrada" }, { status: 404 });
    }

    await db.news.delete(params.id);
    return NextResponse.json({ message: "Noticia excluida com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir noticia:", error);
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("acesso negado")) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
      }
      if (message.includes("autoriz")) {
        return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
      }
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
