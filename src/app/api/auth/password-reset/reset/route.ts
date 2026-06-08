import { NextRequest, NextResponse } from "next/server";

import { sendPasswordChangedEmail } from "@/lib/mailer";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { logServerError } from "@/lib/server-log";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    const normalizedToken = typeof token === "string" ? token.trim() : "";
    const normalizedPassword = typeof password === "string" ? password : "";

    if (!normalizedToken || !normalizedPassword) {
      return NextResponse.json(
        { error: "Token e nova senha sao obrigatorios." },
        { status: 400 }
      );
    }

    if (normalizedPassword.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const resetResult = await consumePasswordResetToken(normalizedToken, normalizedPassword);

    await sendPasswordChangedEmail({
      to: resetResult.email,
      name: resetResult.name
    });

    return NextResponse.json({
      message: "Senha redefinida com sucesso. Agora voce ja pode entrar."
    });
  } catch (error) {
    logServerError("Erro ao redefinir senha", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel redefinir a senha."
      },
      { status: 400 }
    );
  }
}
