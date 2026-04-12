import type { ReactNode } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, parseAuthToken } from "@/lib/auth-token";
import { db } from "@/lib/database";

type Props = {
  children: ReactNode;
};

async function isAdminSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;

  const payload = parseAuthToken(token);
  if (!payload) return false;

  const user = await db.users.findById(payload.sub);
  if (!user) return false;

  return (
    user.role === "admin" &&
    user.email.trim().toLowerCase() === payload.email.trim().toLowerCase()
  );
}

export default async function AdminLayout({ children }: Props) {
  const allowed = await isAdminSession();

  if (!allowed) {
    redirect("/painel");
  }

  return <>{children}</>;
}
