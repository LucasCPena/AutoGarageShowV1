import { NextRequest } from "next/server";

import { parseAuthToken } from "@/lib/auth-token";
import { db } from "@/lib/database";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
  updatedAt: string;
}

function extractToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.substring(7).trim() || null;
}

export async function getUserFromToken(request: NextRequest): Promise<User | null> {
  const token = extractToken(request);
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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
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
