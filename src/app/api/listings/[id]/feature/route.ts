import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/database";

function resolveHighlightOptions(settings: unknown) {
  const fallback = [7, 14, 21, 30];

  if (!settings || typeof settings !== "object") return fallback;

  const source = settings as Record<string, unknown>;

  const modernOptions = source.listingFeaturedDurationsDays;
  if (Array.isArray(modernOptions)) {
    const normalized = modernOptions
      .filter((item) => typeof item === "number" && Number.isFinite(item))
      .map((item) => Math.max(1, Math.round(item)))
      .filter((item) => item > 0);

    if (normalized.length > 0) return Array.from(new Set(normalized)).sort((a, b) => a - b);
  }

  const legacyListings =
    source.listings && typeof source.listings === "object"
      ? (source.listings as Record<string, unknown>)
      : null;
  const legacyOptions = legacyListings?.highlightOptions;

  if (Array.isArray(legacyOptions)) {
    const normalized = legacyOptions
      .filter((item) => typeof item === "number" && Number.isFinite(item))
      .map((item) => Math.max(1, Math.round(item)))
      .filter((item) => item > 0);

    if (normalized.length > 0) return Array.from(new Set(normalized)).sort((a, b) => a - b);
  }

  return fallback;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const { days } = await request.json();

    if (!days || typeof days !== "number" || !Number.isFinite(days) || days <= 0) {
      return NextResponse.json({ error: "Numero de dias invalido" }, { status: 400 });
    }

    const settings = await db.settings.get();
    const validOptions = resolveHighlightOptions(settings);

    if (!validOptions.includes(days)) {
      return NextResponse.json(
        {
          error: `Opcao de dias invalida. Opcoes permitidas: ${validOptions.join(", ")}`
        },
        { status: 400 }
      );
    }

    const listing = await db.listings.findById(params.id);

    if (!listing) {
      return NextResponse.json({ error: "Anuncio nao encontrado" }, { status: 404 });
    }

    if (listing.createdBy !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + days);

    const updatedListing = await db.listings.update(params.id, {
      featured: true,
      featuredUntil: featuredUntil.toISOString()
    });

    return NextResponse.json({
      listing: updatedListing,
      message: "Anuncio destacado com sucesso"
    });
  } catch (error) {
    console.error("Erro ao destacar anuncio:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
