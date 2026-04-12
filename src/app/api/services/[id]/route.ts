import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, requireAuth } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { onlyDigits, validateCNPJ } from "@/lib/document";
import { sanitizeUserForSession } from "@/lib/privacy";
import { logServerError } from "@/lib/server-log";
import { normalizeServiceActivity } from "@/lib/serviceActivities";
import { isCompanyAccount, normalizeUserRecord } from "@/lib/userProfiles";

export const dynamic = "force-dynamic";

function normalizeWebsiteUrl(input: unknown) {
  const trimmed = typeof input === "string" ? input.trim() : "";
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

async function findServiceUser(id: string) {
  const user = await db.users.findById(id);
  if (!user) return null;

  const normalized = normalizeUserRecord(user);
  if (normalized.marketplaceProfile !== "services" || !isCompanyAccount(normalized)) {
    return null;
  }

  return normalized;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const viewer = await getUserFromToken(request);
    const service = await findServiceUser(params.id);

    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    const canManage = viewer?.role === "admin" || viewer?.id === service.id;
    if (!canManage && service.approvalStatus === "pending") {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    const safeService = { ...sanitizeUserForSession(service) };
    if (!canManage) {
      delete safeService.document;
      delete safeService.documentType;
    }

    return NextResponse.json({ service: safeService });
  } catch (error) {
    logServerError("Erro ao buscar serviço", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponível no momento." },
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
    const viewer = await requireAuth(request);
    const service = await findServiceUser(params.id);

    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    if (viewer.role !== "admin" && viewer.id !== service.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para editar este serviço." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const normalizedDocument = onlyDigits(typeof body?.document === "string" ? body.document : "");
    const normalizedCompanyName =
      typeof body?.companyName === "string" ? body.companyName.trim().slice(0, 160) : "";
    const normalizedPhone = onlyDigits(typeof body?.phone === "string" ? body.phone : "");
    const normalizedActivityType = normalizeServiceActivity(body?.activityType);
    const normalizedShortDescription =
      typeof body?.shortDescription === "string"
        ? body.shortDescription.trim().slice(0, 600)
        : "";
    const normalizedWebsiteUrl = normalizeWebsiteUrl(body?.websiteUrl);
    const normalizedAddress =
      typeof body?.address === "string" ? body.address.trim().slice(0, 180) : "";
    const normalizedCity = typeof body?.city === "string" ? body.city.trim().slice(0, 120) : "";
    const normalizedState =
      typeof body?.state === "string" ? body.state.trim().toUpperCase().slice(0, 2) : "";

    if (!normalizedCompanyName) {
      return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
    }

    if (!validateCNPJ(normalizedDocument)) {
      return NextResponse.json({ error: "Informe um CNPJ válido." }, { status: 400 });
    }

    if (!normalizedPhone) {
      return NextResponse.json({ error: "Informe o telefone da empresa." }, { status: 400 });
    }

    if (!normalizedActivityType || !normalizedShortDescription) {
      return NextResponse.json(
        { error: "Informe o tipo de atividade e uma descrição curta do serviço." },
        { status: 400 }
      );
    }

    if (!normalizedAddress || !normalizedCity || !normalizedState) {
      return NextResponse.json(
        { error: "Informe endereço, município e estado para o cadastro de serviços." },
        { status: 400 }
      );
    }

    const updatedUser = await db.users.update(params.id, {
      document: normalizedDocument,
      documentType: "cnpj",
      phone: normalizedPhone,
      accountType: "company",
      companyName: normalizedCompanyName,
      marketplaceProfile: "services",
      activityType: normalizedActivityType,
      shortDescription: normalizedShortDescription,
      websiteUrl: normalizedWebsiteUrl,
      address: normalizedAddress,
      city: normalizedCity,
      state: normalizedState
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    await db.audit.create({
      actorUserId: viewer.id,
      action: "service.update",
      entityType: "user",
      entityId: params.id,
      status: "success",
      path: `/api/services/${params.id}`
    });

    return NextResponse.json({
      service: sanitizeUserForSession(updatedUser),
      message: "Serviço atualizado com sucesso."
    });
  } catch (error) {
    logServerError("Erro ao atualizar serviço", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponível no momento." },
        { status: 503 }
      );
    }
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const viewer = await requireAuth(request);
    const service = await findServiceUser(params.id);

    if (!service) {
      return NextResponse.json({ error: "Serviço não encontrado." }, { status: 404 });
    }

    if (viewer.role !== "admin" && viewer.id !== service.id) {
      return NextResponse.json(
        { error: "Você não tem permissão para excluir este serviço." },
        { status: 403 }
      );
    }

    await db.users.delete(params.id);
    await db.audit.create({
      actorUserId: viewer.id,
      action: "service.delete",
      entityType: "user",
      entityId: params.id,
      status: "success",
      path: `/api/services/${params.id}`
    });

    return NextResponse.json({ message: "Serviço excluído com sucesso." });
  } catch (error) {
    logServerError("Erro ao excluir serviço", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponível no momento." },
        { status: 503 }
      );
    }
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
