import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth-token";

export async function POST() {
  const response = NextResponse.json(
    { message: "Logout realizado com sucesso" },
    { status: 200 }
  );

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
