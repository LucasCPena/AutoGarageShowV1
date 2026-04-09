import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/database";
import { isMailConfigured, sendPasswordResetEmail } from "@/lib/mailer";
import { createPasswordResetRequest } from "@/lib/password-reset";
import { logServerError } from "@/lib/server-log";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Informe o e-mail da conta." }, { status: 400 });
    }

    const user = await db.users.findByEmail(normalizedEmail);
    let previewResetUrl: string | undefined;

    if (user) {
      const resetRequest = await createPasswordResetRequest(user.id);

      if (isMailConfigured()) {
        await sendPasswordResetEmail({
          to: user.email,
          resetUrl: resetRequest.resetUrl,
          expiresAt: resetRequest.expiresAt
        });
      } else if (process.env.NODE_ENV !== "production") {
        previewResetUrl = resetRequest.resetUrl;
      }
    }

    return NextResponse.json({
      message:
        "Se existir uma conta com esse e-mail, enviaremos as instrucoes para redefinir a senha.",
      previewResetUrl
    });
  } catch (error) {
    logServerError("Erro ao solicitar recuperacao de senha", error);
    return NextResponse.json(
      { error: "Nao foi possivel iniciar a recuperacao de senha." },
      { status: 500 }
    );
  }
}
