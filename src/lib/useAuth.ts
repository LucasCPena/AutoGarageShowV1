"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ags.auth.v1";
const AUTH_EVENT = "ags-auth-update";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  document?: string;
  documentType?: "cpf" | "cnpj";
  accountType?: "individual" | "company" | "agency";
  companyName?: string;
  logoUrl?: string;
  approvalStatus?: "approved" | "pending";
  verificationStatus?: "unverified" | "verified";
  listingLimitOverride?: number | null;
  createdAt: string;
  updatedAt?: string;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  token: string | null;
};

function serializeUserForStorage(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    documentType: user.documentType,
    accountType: user.accountType,
    companyName: user.companyName,
    logoUrl: user.logoUrl,
    approvalStatus: user.approvalStatus,
    verificationStatus: user.verificationStatus,
    listingLimitOverride: user.listingLimitOverride,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function isSameUser(a: User | null, b: User | null) {
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.email === b.email &&
    a.role === b.role &&
    a.createdAt === b.createdAt &&
    a.accountType === b.accountType &&
    a.companyName === b.companyName &&
    a.logoUrl === b.logoUrl &&
    a.approvalStatus === b.approvalStatus
  );
}

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
    document: typeof obj.document === "string" ? obj.document : undefined,
    documentType:
      obj.documentType === "cpf" || obj.documentType === "cnpj"
        ? (obj.documentType as User["documentType"])
        : undefined,
    accountType:
      obj.accountType === "individual" ||
      obj.accountType === "company" ||
      obj.accountType === "agency"
        ? (obj.accountType as User["accountType"])
        : undefined,
    companyName: typeof obj.companyName === "string" ? obj.companyName : undefined,
    logoUrl: typeof obj.logoUrl === "string" ? obj.logoUrl : undefined,
    approvalStatus:
      obj.approvalStatus === "pending" || obj.approvalStatus === "approved"
        ? (obj.approvalStatus as User["approvalStatus"])
        : undefined,
    verificationStatus:
      obj.verificationStatus === "verified" || obj.verificationStatus === "unverified"
        ? (obj.verificationStatus as User["verificationStatus"])
        : undefined,
    listingLimitOverride:
      typeof obj.listingLimitOverride === "number"
        ? obj.listingLimitOverride
        : undefined,
    createdAt: obj.createdAt as string,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : undefined
  };
}

function readFromStorage(): { user: User | null; token: string | null } {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { user: null, token: null };
    const parsed = JSON.parse(stored);
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
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: serializeUserForStorage(user), token })
      );
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event(AUTH_EVENT));
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error);
    return;
  }
}

async function validateSession(token: string) {
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store",
    credentials: "same-origin"
  });

  if (!response.ok) {
    throw new Error("Sessao invalida");
  }

  const data = await response.json();
  return normalizeUser(data.user);
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const { user, token } = readFromStorage();
    return {
      user: token ? null : user,
      token,
      isLoading: Boolean(token)
    };
  });

  useEffect(() => {
    let activeSync = 0;

    const syncFromStorage = async () => {
      const syncId = ++activeSync;
      const { user, token } = readFromStorage();

      if (!token) {
        setState({ user: null, token: null, isLoading: false });
        return;
      }

      setState({ user: null, token, isLoading: true });

      try {
        const freshUser = await validateSession(token);
        if (syncId !== activeSync) return;

        if (!freshUser) {
          setState({ user: null, token: null, isLoading: false });
          writeToStorage(null, null);
          return;
        }

        setState({ user: freshUser, token, isLoading: false });

        if (!isSameUser(user, freshUser)) {
          writeToStorage(freshUser, token);
        }
      } catch {
        if (syncId !== activeSync) return;
        setState({ user: null, token: null, isLoading: false });
        writeToStorage(null, null);
      }
    };

    void syncFromStorage();

    function onStorage(e: StorageEvent) {
      if (e.key && e.key !== STORAGE_KEY) return;
      void syncFromStorage();
    }

    function onAuthUpdate() {
      void syncFromStorage();
    }

    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_EVENT, onAuthUpdate);
    return () => {
      activeSync += 1;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_EVENT, onAuthUpdate);
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, name?: string) => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "same-origin",
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
    async (
      name: string,
      email: string,
      password: string,
      documentOrOptions?:
        | string
        | {
            document?: string;
            accountType?: "individual" | "company" | "agency";
            companyName?: string;
            logoUrl?: string;
            marketplaceProfile?: "mercado-de-pulgas";
            source?: "site" | "qr";
          }
    ) => {
      try {
        const options =
          typeof documentOrOptions === "string"
            ? { document: documentOrOptions }
            : documentOrOptions || {};
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: "same-origin",
          body: JSON.stringify({
            name,
            email,
            password,
            document: options.document,
            accountType: options.accountType,
            companyName: options.companyName,
            logoUrl: options.logoUrl,
            marketplaceProfile: options.marketplaceProfile,
            source: options.source
          }),
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

  const logout = useCallback(async (redirectTo?: string) => {
    setState({ user: null, token: null, isLoading: false });
    writeToStorage(null, null);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin"
      });
    } catch (error) {
      console.error("Erro ao encerrar sessao:", error);
    }

    if (typeof window !== "undefined") {
      const fallbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.assign(redirectTo || fallbackUrl);
    }
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
