"use client";

import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { useAuth } from "@/lib/useAuth";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  document?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  token: string | null;
};

type Message = {
  type: "success" | "error";
  text: string;
} | null;

export default function AdminUsersPanel({ token }: Props) {
  const { user, updateUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, AdminUser["role"]>>({});

  const adminCount = useMemo(
    () => users.filter((item) => item.role === "admin").length,
    [users]
  );

  function authHeaders(): HeadersInit | undefined {
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }

  async function loadUsers() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/users", {
        headers: authHeaders(),
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel carregar usuarios.");
      }

      const nextUsers: AdminUser[] = Array.isArray(data.users) ? data.users : [];
      setUsers(nextUsers);
      setDraftRoles(
        nextUsers.reduce((acc: Record<string, AdminUser["role"]>, item: AdminUser) => {
          acc[item.id] = item.role;
          return acc;
        }, {})
      );
    } catch (loadError) {
      setMessage({
        type: "error",
        text:
          loadError instanceof Error
            ? loadError.message
            : "Nao foi possivel carregar usuarios."
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage({
        type: "error",
        text: "Sessao expirada. Faca login novamente como admin."
      });
      return;
    }

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function saveRole(targetUser: AdminUser) {
    const nextRole = draftRoles[targetUser.id];
    if (!nextRole || nextRole === targetUser.role) return;

    setBusyId(targetUser.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify({ role: nextRole })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel atualizar o usuario.");
      }

      const updatedUser = data.user as AdminUser;
      setUsers((current) =>
        current.map((item) => (item.id === updatedUser.id ? updatedUser : item))
      );
      setDraftRoles((current) => ({
        ...current,
        [updatedUser.id]: updatedUser.role
      }));

      if (user?.id === updatedUser.id) {
        updateUser({ role: updatedUser.role });
      }

      setMessage({
        type: "success",
        text: "Permissao do usuario atualizada com sucesso."
      });
    } catch (saveError) {
      setMessage({
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "Nao foi possivel atualizar o usuario."
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Usuarios do admin</div>
          <div className="mt-1 text-sm text-slate-600">
            Controle de acesso dos usuarios cadastrados no painel.
          </div>
        </div>
        <div className="text-sm text-slate-600">
          {users.length} usuario(s) • {adminCount} admin(s)
        </div>
      </div>

      {message ? (
        <div className="mt-4">
          <Notice title={message.type === "success" ? "Sucesso" : "Erro"} variant={message.type === "success" ? "success" : "warning"}>
            {message.text}
          </Notice>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando usuarios...</div>
        ) : users.length === 0 ? (
          <Notice title="Sem usuarios" variant="info">
            Nenhum usuario encontrado.
          </Notice>
        ) : (
          users.map((item) => {
            const draftRole = draftRoles[item.id] || item.role;
            const isDirty = draftRole !== item.role;

            return (
              <div
                key={item.id}
                className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_200px]"
              >
                <div className="text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">{item.name}</div>
                  <div className="mt-1 break-all">{item.email}</div>
                  <div className="mt-1">Documento: {item.document || "Nao informado"}</div>
                  <div className="mt-1">Telefone: {item.phone || "Nao informado"}</div>
                  <div className="mt-1">
                    Criado em: {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Permissao
                    </span>
                    <select
                      className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                      value={draftRole}
                      disabled={busyId === item.id}
                      onChange={(event) =>
                        setDraftRoles((current) => ({
                          ...current,
                          [item.id]: event.target.value as AdminUser["role"]
                        }))
                      }
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={!isDirty || busyId === item.id}
                    onClick={() => saveRole(item)}
                    className="inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {busyId === item.id ? "Salvando..." : "Salvar permissao"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
