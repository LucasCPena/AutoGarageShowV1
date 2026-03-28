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

export async function POST(request: NextRequest) {
  try {
    const {
      name,
      email,
      password,
      document,
      accountType,
      companyName,
      logoUrl,
      marketplaceProfile,
      source
    } = await request.json();
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedDocument = onlyDigits(typeof document === "string" ? document : "");
    const normalizedAccountType =
      accountType === "company" || accountType === "agency" ? accountType : "individual";
    const normalizedCompanyName =
      typeof companyName === "string" ? companyName.trim() : "";
    const normalizedLogoUrl = toPublicAssetUrl(logoUrl, { uploadType: "site" });
    const normalizedSource = source === "qr" ? "qr" : "site";
    const role = "user";
    const documentType = normalizedDocument.length === 14 ? "cnpj" : "cpf";
    const isCompanyAccount =
      normalizedAccountType === "company" || normalizedAccountType === "agency";
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

    const passwordHash = await hashPassword(String(password));
    const user = await db.users.create({
      name: normalizedName,
      email: normalizedEmail,
      password: passwordHash,
      role,
      document: normalizedDocument || undefined,
      documentType,
      accountType: normalizedAccountType,
      companyName: isCompanyAccount ? normalizedCompanyName : undefined,
      logoUrl: normalizedLogoUrl || undefined,
      approvalStatus,
      verificationStatus: "verified",
      listingLimitOverride: null,
      marketplaceProfile:
        marketplaceProfile === "mercado-de-pulgas" ? "mercado-de-pulgas" : undefined
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
