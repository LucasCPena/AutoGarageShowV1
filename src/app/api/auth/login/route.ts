import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, createAuthToken } from '@/lib/auth-token';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email e senha sao obrigatorios' },
        { status: 400 }
      );
    }

    const user = await db.users.findByEmail(normalizedEmail);
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

    const token = createAuthToken(userWithoutPassword);
    const response = NextResponse.json(
      {
        user: userWithoutPassword,
        message: 'Login realizado com sucesso',
        token
      },
      { status: 200 }
    );

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return response;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
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
