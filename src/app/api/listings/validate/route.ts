import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import {
  getListingDocumentForStorage,
  getListingRules,
  resolveEffectiveListingLimit,
  validateListingAdvertiserDocument
} from "@/lib/listingRules";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const rawDocument = typeof body?.document === "string" ? body.document : "";
    const validation = validateListingAdvertiserDocument(rawDocument);
    const settings = await db.settings.get();
    const rules = getListingRules(settings);

    if (user.role === "admin") {
      return NextResponse.json({
        valid: true,
        canProceed: true,
        adminBypass: true,
        document: getListingDocumentForStorage(rawDocument, {
          isAdmin: true,
          userId: user.id
        }),
        documentType: validation.documentType ?? "cpf",
        activeCount: 0,
        limit: null,
        remaining: null,
        vehicleMinAgeYears: rules.vehicleMinAgeYears,
        maxAllowedYear: rules.maxAllowedYear
      });
    }

    if (!validation.documentType || !validation.isValid) {
      return NextResponse.json(
        {
          valid: false,
          canProceed: false,
          error: "Documento invalido. Informe um CPF ou CNPJ valido."
        },
        { status: 400 }
      );
    }

    const activeCount = await db.listings.getActiveCount(validation.digits);
    const limit = resolveEffectiveListingLimit(settings, user, validation.documentType);
    const remaining = Math.max(limit - activeCount, 0);
    const canProceed = activeCount < limit;
    const reusedVerification =
      user.verificationStatus === "verified" && user.document === validation.digits;

    return NextResponse.json({
      valid: true,
      canProceed,
      document: validation.digits,
      documentType: validation.documentType,
      activeCount,
      limit,
      remaining,
      reusedVerification,
      vehicleMinAgeYears: rules.vehicleMinAgeYears,
      maxAllowedYear: rules.maxAllowedYear,
      message: canProceed
        ? reusedVerification
          ? "Validacao reaproveitada do cadastro existente."
          : "Anunciante validado com sucesso."
        : `Limite atingido para ${validation.documentType.toUpperCase()}.`
    });
  } catch (error) {
    console.error("Erro ao validar anunciante:", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
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
