import { NextRequest, NextResponse } from 'next/server';
import { dbMysql } from '@/lib/database.mysql';

function isMysqlUnavailable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (
    code === "ER_ACCESS_DENIED_ERROR" ||
    code === "ER_HOST_NOT_PRIVILEGED" ||
    code === "ER_BAD_DB_ERROR" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "PROTOCOL_CONNECTION_LOST"
  ) {
    return true;
  }
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("access denied") ||
    message.includes("mysql") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout")
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha sao obrigatorios' },
        { status: 400 }
      );
    }

    const user = await dbMysql.users.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais invalidas' },
        { status: 401 }
      );
    }

    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Credenciais invalidas' },
        { status: 401 }
      );
    }

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        user: userWithoutPassword,
        message: 'Login realizado com sucesso',
        token: btoa(JSON.stringify(userWithoutPassword))
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    if (isMysqlUnavailable(error)) {
      return NextResponse.json(
        { error: 'Banco de dados indisponivel no momento. Tente novamente em instantes.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
