import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário pelo email
    const user = await db.users.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar senha (em texto plano por enquanto)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Remover senha do retorno
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        user: userWithoutPassword, 
        message: 'Login realizado com sucesso',
        token: btoa(JSON.stringify(userWithoutPassword)) // Token simples
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
