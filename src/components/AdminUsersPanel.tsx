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
  documentType?: "cpf" | "cnpj";
  phone?: string;
  accountType?: "individual" | "company" | "agency";
  companyName?: string;
  logoUrl?: string;
  approvalStatus?: "approved" | "pending";
  verificationStatus?: "verified" | "unverified";
  listingLimitOverride?: number | null;
  marketplaceProfile?: "mercado-de-pulgas";
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

type DraftState = Pick<
  AdminUser,
  | "role"
  | "accountType"
  | "companyName"
  | "logoUrl"
  | "approvalStatus"
  | "verificationStatus"
  | "listingLimitOverride"
>;

function toDraft(user: AdminUser): DraftState {
  return {
    role: user.role,
    accountType: user.accountType ?? "individual",
    companyName: user.companyName ?? "",
    logoUrl: user.logoUrl ?? "",
    approvalStatus: user.approvalStatus ?? "approved",
    verificationStatus: user.verificationStatus ?? "verified",
    listingLimitOverride:
      typeof user.listingLimitOverride === "number" ? user.listingLimitOverride : null
  };
}

export default function AdminUsersPanel({ token }: Props) {
  const { user, updateUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});

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
      setDrafts(
        nextUsers.reduce<Record<string, DraftState>>((acc, item) => {
          acc[item.id] = toDraft(item);
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

    void loadUsers();
  }, [token]);

  async function saveUser(targetUser: AdminUser) {
    const draft = drafts[targetUser.id];
    if (!draft) return;

    setBusyId(targetUser.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify(draft)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel atualizar o usuario.");
      }

      const updatedUser = data.user as AdminUser;
      setUsers((current) =>
        current.map((item) => (item.id === updatedUser.id ? updatedUser : item))
      );
      setDrafts((current) => ({
        ...current,
        [updatedUser.id]: toDraft(updatedUser)
      }));

      if (user?.id === updatedUser.id) {
        updateUser(updatedUser);
      }

      setMessage({
        type: "success",
        text: "Usuario atualizado com sucesso."
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

  function updateDraft(userId: string, updates: Partial<DraftState>) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        ...updates
      }
    }));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Usuarios do admin</div>
          <div className="mt-1 text-sm text-slate-600">
            Gerencie perfis, aprovacao, tipo de conta e limites individuais por cliente.
          </div>
        </div>
        <div className="text-sm text-slate-600">
          {users.length} usuario(s) • {adminCount} admin(s)
        </div>
      </div>

      {message ? (
        <div className="mt-4">
          <Notice
            title={message.type === "success" ? "Sucesso" : "Erro"}
            variant={message.type === "success" ? "success" : "warning"}
          >
            {message.text}
          </Notice>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando usuarios...</div>
        ) : users.length === 0 ? (
          <Notice title="Sem usuarios" variant="info">
            Nenhum usuario encontrado.
          </Notice>
        ) : (
          users.map((item) => {
            const draft = drafts[item.id] || toDraft(item);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                  <div className="text-sm text-slate-600">
                    <div className="font-semibold text-slate-900">
                      {item.companyName || item.name}
                    </div>
                    <div className="mt-1 break-all">{item.email}</div>
                    <div className="mt-1">
                      Documento: {item.document || "Nao informado"}{" "}
                      {item.documentType ? `(${item.documentType.toUpperCase()})` : ""}
                    </div>
                    <div className="mt-1">Telefone: {item.phone || "Nao informado"}</div>
                    <div className="mt-1">
                      Perfil especial: {item.marketplaceProfile || "padrao"}
                    </div>
                    <div className="mt-1">
                      Criado em: {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </div>
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt={item.companyName || item.name}
                        className="mt-3 h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-1"
                      />
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Permissao
                      </span>
                      <select
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={draft.role}
                        disabled={busyId === item.id}
                        onChange={(event) =>
                          updateDraft(item.id, {
                            role: event.target.value as AdminUser["role"]
                          })
                        }
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tipo de conta
                      </span>
                      <select
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={draft.accountType}
                        disabled={busyId === item.id}
                        onChange={(event) =>
                          updateDraft(item.id, {
                            accountType: event.target.value as DraftState["accountType"]
                          })
                        }
                      >
                        <option value="individual">Pessoa fisica</option>
                        <option value="company">Empresa</option>
                        <option value="agency">Agencia</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Aprovacao
                      </span>
                      <select
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={draft.approvalStatus}
                        disabled={busyId === item.id}
                        onChange={(event) =>
                          updateDraft(item.id, {
                            approvalStatus: event.target.value as DraftState["approvalStatus"]
                          })
                        }
                      >
                        <option value="approved">Aprovado</option>
                        <option value="pending">Pendente</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Verificacao
                      </span>
                      <select
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={draft.verificationStatus}
                        disabled={busyId === item.id}
                        onChange={(event) =>
                          updateDraft(item.id, {
                            verificationStatus:
                              event.target.value as DraftState["verificationStatus"]
                          })
                        }
                      >
                        <option value="verified">Verificado</option>
                        <option value="unverified">Nao verificado</option>
                      </select>
                    </label>

                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Nome empresarial
                      </span>
                      <input
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={draft.companyName || ""}
                        disabled={busyId === item.id}
                        onChange={(event) =>
                          updateDraft(item.id, { companyName: event.target.value })
                        }
                        placeholder="Preencha para contas empresa/agencia"
                      />
                    </label>

                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Logo (URL)
                      </span>
                      <input
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={draft.logoUrl || ""}
                        disabled={busyId === item.id}
                        onChange={(event) =>
                          updateDraft(item.id, { logoUrl: event.target.value })
                        }
                        placeholder="/uploads/... ou https://..."
                      />
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Limite individual
                      </span>
                      <input
                        type="number"
                        min={0}
                        className="h-11 rounded-md border border-slate-300 px-3 text-sm"
                        value={draft.listingLimitOverride ?? ""}
                        disabled={busyId === item.id}
                        onChange={(event) =>
                          updateDraft(item.id, {
                            listingLimitOverride: event.target.value
                              ? Number(event.target.value)
                              : null
                          })
                        }
                        placeholder="Usar padrao do sistema"
                      />
                    </label>

                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => saveUser(item)}
                        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {busyId === item.id ? "Salvando..." : "Salvar usuario"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
