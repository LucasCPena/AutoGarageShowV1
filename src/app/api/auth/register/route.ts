import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';
import { onlyDigits, validateCPF } from '@/lib/document';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, document } = await request.json();
    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedDocument = onlyDigits(typeof document === "string" ? document : "");
    const role = normalizedEmail.includes("admin") ? "admin" : "user";

    if (!normalizedName || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha sao obrigatorios' },
        { status: 400 }
      );
    }

    if (role !== "admin" && !validateCPF(normalizedDocument)) {
      return NextResponse.json(
        { error: "CPF invalido" },
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

    const user = await db.users.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
      role,
      document: normalizedDocument || undefined
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword, message: 'Usuario criado com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao registrar usuario:', error);
    if (isMysqlRequiredError(error)) {
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
