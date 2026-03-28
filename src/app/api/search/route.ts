import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { searchSiteContent, type SearchResultType } from "@/lib/search";
import { fingerprintSensitiveValue } from "@/lib/secure-fields";
import { logServerError } from "@/lib/server-log";

const VALID_TYPES = new Set(["all", "listing", "event", "news", "company"]);
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "all";

    if (!q) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchSiteContent(
      q,
      VALID_TYPES.has(type) ? (type as SearchResultType | "all") : "all"
    );

    const user = await getUserFromToken(request);
    await db.metrics.create({
      eventType: "search",
      entityType: "search",
      path: "/busca",
      label: "Busca interna",
      userId: user?.id,
      metadata: {
        filter: type,
        results: results.length,
        queryLength: q.length,
        queryFingerprint: fingerprintSensitiveValue(q, "search-query") || "unavailable"
      }
    });

    return NextResponse.json({ results });
  } catch (error) {
    logServerError("Erro ao buscar conteudo", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
