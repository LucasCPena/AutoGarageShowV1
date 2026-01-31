"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ags.auth.v1";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  token: string | null;
};

function normalizeUser(input: unknown): User | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  if (
    typeof obj.id !== "string" ||
    typeof obj.name !== "string" ||
    typeof obj.email !== "string" ||
    typeof obj.role !== "string" ||
    !["admin", "user"].includes(obj.role)
  ) {
    return null;
  }

  return {
    id: obj.id,
    name: obj.name,
    email: obj.email,
    role: obj.role as User["role"],
    createdAt: obj.createdAt as string
  };
}

function readFromStorage(): { user: User | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    console.log('Lendo do localStorage:', stored);
    if (!stored) return { user: null, token: null };
    const parsed = JSON.parse(stored);
    console.log('Dados lidos:', parsed);
    return {
      user: normalizeUser(parsed.user),
      token: parsed.token
    };
  } catch (error) {
    console.error('Erro ao ler do localStorage:', error);
    return { user: null, token: null };
  }
}

function writeToStorage(user: User | null, token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (user && token) {
      console.log('Salvando no localStorage:', { user, token });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
      console.log('Token salvo com sucesso');
    } else {
      console.log('Removendo do localStorage');
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
    return;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const { user, token } = readFromStorage();
    return {
      user,
      token,
      isLoading: true
    };
  });

  useEffect(() => {
    const { user, token } = readFromStorage();
    setState({ user, token, isLoading: false });

    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const updated = readFromStorage();
      setState({ user: updated.user, token: updated.token, isLoading: false });
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback(
    async (email: string, password: string, name?: string) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao fazer login');
        }

        setState({ user: data.user, token: data.token, isLoading: false });
        writeToStorage(data.user, data.token);
        return data.user;
      } catch (error) {
        throw error;
      }
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao registrar');
        }

        // Após registrar, fazer login automaticamente
        return await login(email, password, name);
      } catch (error) {
        throw error;
      }
    },
    [login]
  );

  const logout = useCallback(() => {
    setState({ user: null, token: null, isLoading: false });
    writeToStorage(null, null);
  }, []);

  const updateUser = useCallback(
    (updates: Partial<User>) => {
      setState((currentState) => {
        if (!currentState.user) return currentState;
        const updated = { ...currentState.user, ...updates };
        writeToStorage(updated, currentState.token);
        return { user: updated, token: currentState.token, isLoading: false };
      });
    },
    []
  );

  return {
    ...state,
    login,
    register,
    logout,
    updateUser
  };
}

export { STORAGE_KEY as AUTH_STORAGE_KEY };
