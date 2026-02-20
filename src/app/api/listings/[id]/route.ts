import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listing = await db.listings.findById(params.id);

    if (!listing) {
      return NextResponse.json(
        { error: "Classificado nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Erro ao buscar classificado:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const existing = await db.listings.findById(params.id);

    if (!existing) {
      return NextResponse.json(
        { error: "Classificado nao encontrado" },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && existing.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para editar este classificado" },
        { status: 403 }
      );
    }

    const updateData = await request.json();
    const listing = await db.listings.update(params.id, updateData);

    if (!listing) {
      return NextResponse.json(
        { error: "Classificado nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      listing,
      message: "Classificado atualizado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao atualizar classificado:", error);
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const listing = await db.listings.findById(params.id);

    if (!listing) {
      return NextResponse.json(
        { error: "Classificado nao encontrado" },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && listing.createdBy !== user.id) {
      return NextResponse.json(
        { error: "Voce nao tem permissao para excluir este classificado" },
        { status: 403 }
      );
    }

    await db.listings.delete(params.id);

    return NextResponse.json({ message: "Classificado excluido com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir classificado:", error);
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
