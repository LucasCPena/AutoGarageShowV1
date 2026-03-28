import { NextRequest, NextResponse } from 'next/server';
import { db, isMysqlRequiredError } from '@/lib/database';
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, createAuthToken } from '@/lib/auth-token';
import { sanitizeUserForSession } from '@/lib/privacy';
import { hashPassword, verifyPassword } from '@/lib/password';
import {
  getPublicSecurityConfigurationMessage,
  isSecurityConfigurationError
} from '@/lib/security-config';
import { logServerError } from '@/lib/server-log';

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
      try {
        await db.audit.create({
          action: "auth.login",
          entityType: "auth",
          status: "failure",
          path: "/api/auth/login",
          metadata: {
            reason: "user_not_found"
          }
        });
      } catch (auditError) {
        logServerError("Falha ao auditar tentativa de login sem usuario", auditError);
      }
      return NextResponse.json(
        { error: 'Credenciais invalidas' },
        { status: 401 }
      );
    }

    const passwordCheck = await verifyPassword(String(password), user.password);
    if (!passwordCheck.valid) {
      try {
        await db.audit.create({
          actorUserId: user.id,
          action: "auth.login",
          entityType: "auth",
          entityId: user.id,
          status: "failure",
          path: "/api/auth/login",
          metadata: {
            reason: "invalid_password"
          }
        });
      } catch (auditError) {
        logServerError("Falha ao auditar tentativa de login com senha invalida", auditError);
      }
      return NextResponse.json(
        { error: 'Credenciais invalidas' },
        { status: 401 }
      );
    }

    let authenticatedUser = user;
    if (passwordCheck.needsUpgrade) {
      const passwordHash = await hashPassword(String(password));
      const upgradedUser = await db.users.update(user.id, {
        password: passwordHash
      });
      if (upgradedUser) {
        authenticatedUser = upgradedUser;
      }
    }

    const userWithoutPassword = sanitizeUserForSession(authenticatedUser);

    const token = createAuthToken(userWithoutPassword);
    try {
      await db.audit.create({
        actorUserId: authenticatedUser.id,
        action: "auth.login",
        entityType: "auth",
        entityId: authenticatedUser.id,
        status: "success",
        path: "/api/auth/login"
      });
    } catch (auditError) {
      logServerError("Falha ao auditar login realizado", auditError);
    }
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
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });

    return response;
  } catch (error) {
    logServerError('Erro ao fazer login', error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: 'Banco de dados indisponivel no momento. Tente novamente em instantes.' },
        { status: 503 }
      );
    }
    if (isSecurityConfigurationError(error)) {
      return NextResponse.json(
        { error: getPublicSecurityConfigurationMessage() },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
