import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth-middleware";
import { db } from "@/lib/database";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function createUniqueSlug(base: string) {
  let slug = slugify(base) || `noticia-${Date.now()}`;
  let suffix = 1;

  while (await db.news.findBySlug(slug)) {
    slug = `${slugify(base)}-${suffix++}`;
  }

  return slug;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(request);
    const source = await db.news.findById(params.id);

    if (!source) {
      return NextResponse.json(
        { error: "Noticia nao encontrada" },
        { status: 404 }
      );
    }

    const duplicatedTitle = `${source.title} (copia)`;
    const slug = await createUniqueSlug(duplicatedTitle);

    const news = await db.news.create({
      slug,
      title: duplicatedTitle,
      content: source.content,
      excerpt: source.excerpt,
      category: source.category,
      coverImage: source.coverImage,
      author: source.author,
      status: source.status
    });

    return NextResponse.json(
      { news, message: "Noticia duplicada com sucesso." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao duplicar noticia:", error);
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
