"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  marketplaceProfile?: "mercado-de-pulgas" | "services";
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

type NewAdminFormState = {
  name: string;
  email: string;
  password: string;
  role: AdminUser["role"];
};

const emptyNewAdminForm: NewAdminFormState = {
  name: "",
  email: "",
  password: "",
  role: "admin"
};

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
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [newAdminForm, setNewAdminForm] = useState<NewAdminFormState>(emptyNewAdminForm);

  const adminCount = useMemo(
    () => users.filter((item) => item.role === "admin").length,
    [users]
  );

  const authHeaders = useCallback((): HeadersInit | undefined => {
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, [token]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/users", {
        headers: authHeaders(),
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível carregar usuários.");
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
            : "Não foi possível carregar usuários."
      });
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage({
        type: "error",
        text: "Sessão expirada. Faça login novamente como admin."
      });
      return;
    }

    void loadUsers();
  }, [loadUsers, token]);

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
        throw new Error(data.error || "Não foi possível atualizar o usuário.");
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
            : "Não foi possível atualizar o usuário."
      });
    } finally {
      setBusyId(null);
    }
  }

  async function createAdminUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingAdmin(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders()
        },
        body: JSON.stringify(newAdminForm)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel criar o usuario.");
      }

      const createdUser = data.user as AdminUser;
      setUsers((current) => [createdUser, ...current]);
      setDrafts((current) => ({
        ...current,
        [createdUser.id]: toDraft(createdUser)
      }));
      setNewAdminForm(emptyNewAdminForm);
      setMessage({
        type: "success",
        text:
          createdUser.role === "admin"
            ? "Administrador criado com sucesso."
            : "Usuario criado com sucesso."
      });
    } catch (createError) {
      setMessage({
        type: "error",
        text:
          createError instanceof Error
            ? createError.message
            : "Nao foi possivel criar o usuario."
      });
    } finally {
      setCreatingAdmin(false);
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
          <div className="text-sm font-semibold text-slate-900">Usuários do admin</div>
          <div className="mt-1 text-sm text-slate-600">
            Gerencie perfis, aprovação, tipo de conta e limites individuais por cliente.
          </div>
        </div>
        <div className="text-sm text-slate-600">
          {users.length} usuário(s) • {adminCount} admin(s)
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

      <form
        onSubmit={createAdminUser}
        className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"
      >
        <div className="md:col-span-4">
          <div className="text-sm font-semibold text-slate-900">Novo acesso administrativo</div>
          <div className="mt-1 text-xs text-slate-500">
            Cadastro criado pelo admin com senha protegida pelo mesmo padrao do login.
          </div>
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nome
          </span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={newAdminForm.name}
            disabled={creatingAdmin}
            onChange={(event) =>
              setNewAdminForm((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            E-mail / login
          </span>
          <input
            type="email"
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={newAdminForm.email}
            disabled={creatingAdmin}
            onChange={(event) =>
              setNewAdminForm((current) => ({ ...current, email: event.target.value }))
            }
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Senha
          </span>
          <input
            type="password"
            minLength={6}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={newAdminForm.password}
            disabled={creatingAdmin}
            onChange={(event) =>
              setNewAdminForm((current) => ({ ...current, password: event.target.value }))
            }
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Permissao
          </span>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={newAdminForm.role}
            disabled={creatingAdmin}
            onChange={(event) =>
              setNewAdminForm((current) => ({
                ...current,
                role: event.target.value as AdminUser["role"]
              }))
            }
          >
            <option value="admin">Administrador</option>
            <option value="user">Usuario comum</option>
          </select>
        </label>

        <div className="md:col-span-4 flex justify-end">
          <button
            type="submit"
            disabled={creatingAdmin}
            className="inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {creatingAdmin ? "Criando..." : "Criar acesso"}
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando usuários...</div>
        ) : users.length === 0 ? (
          <Notice title="Sem usuários" variant="info">
            Nenhum usuário encontrado.
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
                      Documento: {item.document || "Não informado"}{" "}
                      {item.documentType ? `(${item.documentType.toUpperCase()})` : ""}
                    </div>
                    <div className="mt-1">Telefone: {item.phone || "Não informado"}</div>
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
                        Permissão
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
                        <option value="agency">Agência</option>
                      </select>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Aprovação
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
                        Verificação
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
                        <option value="unverified">Não verificado</option>
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
                        placeholder="Preencha para contas empresa/agência"
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

                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Limite de veiculos
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
                        placeholder={
                          draft.accountType === "company" || draft.accountType === "agency"
                            ? "Padrao da loja: 20"
                            : "Padrao CPF: 1"
                        }
                      />
                      {/* Vazio mantem o limite global; numero preenchido libera um limite por loja/cliente. */}
                      <span className="text-xs text-slate-500">
                        Vazio usa o padrao do sistema; informe acima de 20 para liberar mais
                        veiculos para uma loja.
                      </span>
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
