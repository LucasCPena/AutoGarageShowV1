import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/database";
import { getUserFromToken, requireAuth } from "@/lib/auth-middleware";
import { onlyDigits, validateCNPJ } from "@/lib/document";
import { sanitizeUserForSession } from "@/lib/privacy";
import {
  getPublicSecurityConfigurationMessage,
  isSecurityConfigurationError
} from "@/lib/security-config";
import { logServerError } from "@/lib/server-log";
import { normalizeServiceActivity } from "@/lib/serviceActivities";

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    logServerError("Erro ao verificar autenticacao", error);
    if (isSecurityConfigurationError(error)) {
      return NextResponse.json(
        { error: getPublicSecurityConfigurationMessage() },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request);
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
      return NextResponse.json({ error: "Informe um CNPJ valido." }, { status: 400 });
    }

    if (!normalizedPhone) {
      return NextResponse.json({ error: "Informe o telefone da empresa." }, { status: 400 });
    }

    if (!normalizedActivityType || !normalizedShortDescription) {
      return NextResponse.json(
        { error: "Informe o tipo de atividade e uma descricao curta do servico." },
        { status: 400 }
      );
    }

    if (!normalizedAddress || !normalizedCity || !normalizedState) {
      return NextResponse.json(
        { error: "Informe endereco, municipio e estado para o cadastro de servicos." },
        { status: 400 }
      );
    }

    const updatedUser = await db.users.update(currentUser.id, {
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
      return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
    }

    await db.audit.create({
      actorUserId: updatedUser.id,
      action: "auth.update_service_profile",
      entityType: "user",
      entityId: updatedUser.id,
      status: "success",
      path: "/api/auth/me",
      metadata: {
        marketplaceProfile: "services",
        accountType: "company"
      }
    });

    return NextResponse.json({
      user: sanitizeUserForSession(updatedUser),
      message: "Perfil de servicos atualizado com sucesso."
    });
  } catch (error) {
    logServerError("Erro ao atualizar perfil autenticado", error);
    if (isSecurityConfigurationError(error)) {
      return NextResponse.json(
        { error: getPublicSecurityConfigurationMessage() },
        { status: 503 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
