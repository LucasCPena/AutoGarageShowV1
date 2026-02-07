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
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha sao obrigatorios' },
        { status: 400 }
      );
    }

    const existingUser = await dbMysql.users.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ja esta cadastrado' },
        { status: 409 }
      );
    }

    const user = await dbMysql.users.create({
      name,
      email,
      password,
      role: email.includes('admin') ? 'admin' : 'user'
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Usuario criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao registrar usuario:', error);
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
