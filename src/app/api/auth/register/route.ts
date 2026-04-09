import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';
import { onlyDigits, validateCNPJ, validateCPF } from '@/lib/document';
import { sanitizeUserForSession } from '@/lib/privacy';
import { hashPassword } from '@/lib/password';
import {
  getPublicSecurityConfigurationMessage,
  isSecurityConfigurationError
} from '@/lib/security-config';
import { logServerError } from '@/lib/server-log';
import { toPublicAssetUrl } from '@/lib/site-url';
import { normalizeServiceActivity } from '@/lib/serviceActivities';

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

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      password,
      document,
      phone,
      accountType,
      companyName,
      logoUrl,
      marketplaceProfile,
      activityType,
      shortDescription,
      websiteUrl,
      address,
      city,
      state,
      source
    } = await request.json();
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedDocument = onlyDigits(typeof document === "string" ? document : "");
    const normalizedMarketplaceProfile =
      marketplaceProfile === "mercado-de-pulgas" || marketplaceProfile === "services"
        ? marketplaceProfile
        : undefined;
    const documentType = normalizedDocument.length === 14 ? "cnpj" : "cpf";
    const normalizedAccountType =
      accountType === "company" || accountType === "agency"
        ? accountType
        : normalizedMarketplaceProfile === "services"
          ? "company"
          : documentType === "cnpj"
          ? "company"
          : "individual";
    const normalizedCompanyName =
      typeof companyName === "string" ? companyName.trim() : "";
    const normalizedPhone = onlyDigits(typeof phone === "string" ? phone : "");
    const normalizedLogoUrl = toPublicAssetUrl(logoUrl, { uploadType: "site" });
    const normalizedActivityType = normalizeServiceActivity(activityType);
    const normalizedShortDescription =
      typeof shortDescription === "string" ? shortDescription.trim().slice(0, 600) : "";
    const normalizedWebsiteUrl = normalizeWebsiteUrl(websiteUrl);
    const normalizedAddress = typeof address === "string" ? address.trim().slice(0, 180) : "";
    const normalizedCity = typeof city === "string" ? city.trim().slice(0, 120) : "";
    const normalizedState = typeof state === "string" ? state.trim().toUpperCase().slice(0, 2) : "";
    const normalizedSource = source === "qr" ? "qr" : "site";
    const role = "user";
    const isCompanyAccount =
      normalizedAccountType === "company" || normalizedAccountType === "agency";
    const isServicesProfile = normalizedMarketplaceProfile === "services";
    const settings = await db.settings.get();
    const autoApproveQrAccounts = settings?.qrAccess?.autoApproveAccounts === true;
    const approvalStatus =
      normalizedSource === "qr" && !autoApproveQrAccounts ? "pending" : "approved";

    if (!normalizedName || !normalizedEmail || !password || !normalizedDocument) {
      return NextResponse.json(
        { error: 'Nome, email, senha e documento sao obrigatorios' },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    if (isCompanyAccount && !normalizedCompanyName) {
      return NextResponse.json(
        { error: "Informe o nome da empresa ou agencia." },
        { status: 400 }
      );
    }

    if (isCompanyAccount && documentType !== "cnpj") {
      return NextResponse.json(
        { error: "Cadastros empresariais exigem CNPJ valido." },
        { status: 400 }
      );
    }

    if (!isCompanyAccount && documentType !== "cpf") {
      return NextResponse.json(
        { error: "Cadastros pessoais exigem CPF valido." },
        { status: 400 }
      );
    }

    const validDocument = documentType === "cnpj"
      ? validateCNPJ(normalizedDocument)
      : validateCPF(normalizedDocument);

    if (!validDocument) {
      return NextResponse.json(
        { error: documentType === "cnpj" ? "CNPJ invalido" : "CPF invalido" },
        { status: 400 }
      );
    }

    const existingUser = await db.users.findByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ja esta cadastrado' },
        { status: 409 }
      );
    }

    if (isServicesProfile) {
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: "Informe o telefone da empresa." },
          { status: 400 }
        );
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
    }

    const passwordHash = await hashPassword(String(password));
    const user = await db.users.create({
      name: normalizedName,
      email: normalizedEmail,
      password: passwordHash,
      role,
      document: normalizedDocument || undefined,
      documentType,
      phone: normalizedPhone || undefined,
      accountType: normalizedAccountType,
      companyName: isCompanyAccount ? normalizedCompanyName : undefined,
      logoUrl: normalizedLogoUrl || undefined,
      approvalStatus,
      verificationStatus: "verified",
      listingLimitOverride: null,
      marketplaceProfile: normalizedMarketplaceProfile,
      activityType: normalizedActivityType || undefined,
      shortDescription: normalizedShortDescription || undefined,
      websiteUrl: normalizedWebsiteUrl,
      address: normalizedAddress || undefined,
      city: normalizedCity || undefined,
      state: normalizedState || undefined
    });

    await db.audit.create({
      actorUserId: user.id,
      action: "auth.register",
      entityType: "auth",
      entityId: user.id,
      status: "success",
      path: "/api/auth/register",
      metadata: {
        accountType: normalizedAccountType,
        marketplaceProfile: normalizedMarketplaceProfile || "default",
        source: normalizedSource
      }
    });

    return NextResponse.json(
      { user: sanitizeUserForSession(user), message: 'Usuario criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    logServerError('Erro ao registrar usuario', error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: 'Banco de dados indisponivel no momento. Tente novamente em instantes.' },
        { status: 503 }
      );
    }
    if (isSecurityConfigurationError(error)) {
      return NextResponse.json(
        { error: getPublicSecurityConfigurationMessage() },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
