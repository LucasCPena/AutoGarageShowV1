import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, requireAuth } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { filterMetricEvents, summarizeMetricEvents } from "@/lib/metrics";
import {
  sanitizeMetricLabel,
  sanitizeMetricMetadata,
  sanitizeMetricPath
} from "@/lib/privacy";
import { logServerError } from "@/lib/server-log";

const VALID_EVENT_TYPES = new Set([
  "page_view",
  "listing_view",
  "company_page_view",
  "banner_click",
  "contact_click",
  "message_sent",
  "search"
]);

const VALID_ENTITY_TYPES = new Set(["page", "listing", "company", "banner", "search"]);

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

async function resolveOwnerUserId(
  entityType: string,
  entityId: string | undefined,
  ownerUserId: string | undefined
) {
  if (entityType === "listing" && entityId) {
    const listing = await db.listings.findById(entityId);
    return listing?.createdBy;
  }

  if (entityType === "company" && entityId) {
    return entityId;
  }

  return ownerUserId;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const ownerUserId =
      user.role === "admin" && scope === "all"
        ? sanitizeText(searchParams.get("ownerUserId"), 80) || undefined
        : user.id;
    const from = sanitizeText(searchParams.get("from"), 40) || undefined;
    const to = sanitizeText(searchParams.get("to"), 40) || undefined;

    const allEvents = await db.metrics.getAll();
    const filtered = filterMetricEvents(allEvents, {
      ownerUserId,
      from,
      to
    });

    return NextResponse.json({
      metrics: summarizeMetricEvents(filtered)
    });
  } catch (error) {
    logServerError("Erro ao buscar metricas", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const body = await request.json();

    const eventType = sanitizeText(body?.eventType, 40);
    const entityType = sanitizeText(body?.entityType, 20);
    const path = sanitizeText(body?.path, 255);
    const label = sanitizeText(body?.label, 255);
    const entityId = sanitizeText(body?.entityId, 80) || undefined;
    const requestedOwnerUserId = sanitizeText(body?.ownerUserId, 80) || undefined;
    const ownerUserId = await resolveOwnerUserId(entityType, entityId, requestedOwnerUserId);
    const metadata = sanitizeMetricMetadata(body?.metadata);

    if (!VALID_EVENT_TYPES.has(eventType) || !VALID_ENTITY_TYPES.has(entityType) || !path) {
      return NextResponse.json(
        { error: "Evento de metrica invalido." },
        { status: 400 }
      );
    }

    const metricEvent = await db.metrics.create({
      eventType: eventType as any,
      entityType: entityType as any,
      entityId,
      ownerUserId,
      userId: user?.id,
      path: sanitizeMetricPath(path),
      label: sanitizeMetricLabel(label || undefined, eventType as any),
      metadata
    });

    return NextResponse.json({ metric: metricEvent }, { status: 201 });
  } catch (error) {
    logServerError("Erro ao registrar metrica", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
