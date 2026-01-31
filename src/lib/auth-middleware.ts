import { NextRequest } from 'next/server';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export function getUserFromToken(request: NextRequest): User | null {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return JSON.parse(atob(token));
  } catch {
    return null;
  }
}

export function requireAuth(request: NextRequest): User {
  const user = getUserFromToken(request);
  
  if (!user) {
    throw new Error('Não autorizado');
  }
  
  return user;
}

export function requireAdmin(request: NextRequest): User {
  const user = requireAuth(request);
  
  if (user.role !== 'admin') {
    throw new Error('Acesso negado');
  }
  
  return user;
}
