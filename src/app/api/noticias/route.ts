import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, requireAdmin } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { toPublicAssetUrl } from "@/lib/site-url";

const VALID_CATEGORIES = new Set(["eventos", "classificados", "geral", "dicas"]);

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toExcerpt(content: string, max = 160) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = searchParams.get("limit");
    const scope = searchParams.get("scope");
    const user = getUserFromToken(request);

    let news = await db.news.getAll();

    if (scope === "all") {
      if (user?.role !== "admin") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    } else {
      news = news.filter((item) => item.status === "published");
    }

    if (category && VALID_CATEGORIES.has(category)) {
      news = news.filter((item) => item.category === category);
    }

    news.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const parsedLimit = limit ? Number(limit) : NaN;
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      news = news.slice(0, parsedLimit);
    }

    return NextResponse.json({ news });
  } catch (error) {
    console.error("Erro ao buscar noticias:", error);
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
    const user = requireAdmin(request);
    const body = await request.json();

    const title = body?.title?.toString().trim();
    const content = body?.content?.toString().trim();
    const category = body?.category?.toString().trim();
    const coverImageRaw = body?.coverImage?.toString().trim();
    const coverImage = toPublicAssetUrl(coverImageRaw, { uploadType: "news" });
    const author = body?.author?.toString().trim() || user.name;
    const requestedStatus = body?.status?.toString().trim();

    if (!title || !content || !category || !coverImage) {
      return NextResponse.json(
        { error: "Campos obrigatorios: title, content, category, coverImage" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Categoria invalida" }, { status: 400 });
    }

    const status = requestedStatus === "draft" ? "draft" : "published";
    const excerpt =
      typeof body?.excerpt === "string" && body.excerpt.trim()
        ? body.excerpt.trim()
        : toExcerpt(content);
    const slug = await uniqueNewsSlug(title);

    const news = await db.news.create({
      slug,
      title,
      content,
      excerpt,
      category: category as "eventos" | "classificados" | "geral" | "dicas",
      coverImage,
      author,
      status
    });

    return NextResponse.json({ news, message: "Noticia criada com sucesso" }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar noticia:", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
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
