import { NextRequest, NextResponse } from "next/server";

import { verifyPasswordResetToken } from "@/lib/password-reset";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.json({ error: "Token obrigatorio." }, { status: 400 });
  }

  const verification = await verifyPasswordResetToken(token);

  if (!verification) {
    return NextResponse.json({ error: "Token invalido ou expirado." }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    email: verification.email,
    expiresAt: verification.expiresAt
  });
}
