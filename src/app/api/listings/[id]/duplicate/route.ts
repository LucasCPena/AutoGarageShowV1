import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/database";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function createUniqueSlug(base: string) {
  let slug = slugify(base) || `classificado-${Date.now()}`;
  let suffix = 1;

  while (await db.listings.findBySlug(slug)) {
    slug = `${slugify(base)}-${suffix++}`;
  }

  return slug;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const source = await db.listings.findById(params.id);

    if (!source) {
      return NextResponse.json(
        { error: "Classificado nao encontrado" },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && source.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para duplicar este classificado." },
        { status: 403 }
      );
    }

    const duplicatedTitle = `${source.title} (copia)`;
    const slug = await createUniqueSlug(duplicatedTitle);

    const duplicated = await db.listings.create({
      slug,
      title: duplicatedTitle,
      description: source.description,
      make: source.make,
      model: source.model,
      modelYear: source.modelYear,
      manufactureYear: source.manufactureYear,
      year: source.year,
      mileage: source.mileage,
      price: source.price,
      images: source.images || [],
      contact: source.contact,
      specifications: source.specifications,
      status: user.role === "admin" ? "active" : "pending",
      featured: false,
      featuredUntil: undefined,
      createdBy: user.id,
      document: source.document,
      city: source.city,
      state: source.state
    });

    return NextResponse.json(
      { listing: duplicated, message: "Classificado duplicado com sucesso." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao duplicar classificado:", error);
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
