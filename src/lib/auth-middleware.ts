import { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, parseAuthToken } from "@/lib/auth-token";
import { db } from "@/lib/database";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  document?: string;
  documentType?: "cpf" | "cnpj";
  accountType?: "individual" | "company" | "agency";
  companyName?: string;
  logoUrl?: string;
  approvalStatus?: "approved" | "pending";
  verificationStatus?: "unverified" | "verified";
  listingLimitOverride?: number | null;
  createdAt: string;
  updatedAt: string;
}

function extractTokens(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return {
      bearerToken: authHeader.substring(7).trim() || null,
      cookieToken: request.cookies.get(AUTH_COOKIE_NAME)?.value || null
    };
  }

  return {
    bearerToken: null,
    cookieToken: request.cookies.get(AUTH_COOKIE_NAME)?.value || null
  };
}

export async function getUserFromAuthToken(token: string | null): Promise<User | null> {
  if (!token) return null;

  const payload = parseAuthToken(token);
  if (!payload) return null;

  const user = await db.users.findById(payload.sub);
  if (!user) return null;
  if (user.email.trim().toLowerCase() !== payload.email.trim().toLowerCase()) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    document: user.document,
    documentType: user.documentType,
    accountType: user.accountType,
    companyName: user.companyName,
    logoUrl: user.logoUrl,
    approvalStatus: user.approvalStatus,
    verificationStatus: user.verificationStatus,
    listingLimitOverride: user.listingLimitOverride,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function getUserFromToken(request: NextRequest): Promise<User | null> {
  const { bearerToken, cookieToken } = extractTokens(request);

  if (bearerToken) {
    const bearerUser = await getUserFromAuthToken(bearerToken);
    if (bearerUser) return bearerUser;
  }

  return getUserFromAuthToken(cookieToken);
}

export async function requireAuth(request: NextRequest): Promise<User> {
  const user = await getUserFromToken(request);

  if (!user) {
    throw new Error("Nao autorizado");
  }

  return user;
}

export async function requireAdmin(request: NextRequest): Promise<User> {
  const user = await requireAuth(request);

  if (user.role !== "admin") {
    throw new Error("Acesso negado");
  }

  return user;
}
