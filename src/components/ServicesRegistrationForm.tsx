"use client";

import { useEffect, useState } from "react";

import Notice from "@/components/Notice";
import { onlyDigits, validateCNPJ } from "@/lib/document";
import { DEFAULT_SERVICE_ACTIVITIES } from "@/lib/serviceActivities";
import { useAuth } from "@/lib/useAuth";

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

type SubmissionMode = "update-current" | "new-account";

export default function ServicesRegistrationForm() {
  const { user, token, register, updateUser } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [activityType, setActivityType] = useState(DEFAULT_SERVICE_ACTIVITIES[0] || "");
  const [customActivityType, setCustomActivityType] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>("new-account");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resolvedActivityType =
    activityType === "__other__" ? customActivityType.trim() : activityType.trim();
  const canUpdateCurrentAccount = Boolean(user && user.role !== "admin");
  const editingCurrentProfile =
    Boolean(user) && canUpdateCurrentAccount && submissionMode === "update-current";

  function loadUserIntoForm() {
    if (!user) return;

    setCompanyName(user.companyName || "");
    setCnpj(formatCnpj(user.document || ""));
    setAddress(user.address || "");
    setCity(user.city || "");
    setState(user.state || "");
    setPhone(formatPhone(user.phone || ""));
    setWebsiteUrl(user.websiteUrl || "");
    setShortDescription(user.shortDescription || "");

    if (user.activityType) {
      const hasPreset = DEFAULT_SERVICE_ACTIVITIES.includes(user.activityType);
      setActivityType(hasPreset ? user.activityType : "__other__");
      setCustomActivityType(hasPreset ? "" : user.activityType);
      return;
    }

    setActivityType(DEFAULT_SERVICE_ACTIVITIES[0] || "");
    setCustomActivityType("");
  }

  function clearFormForNewAccount() {
    setCompanyName("");
    setCnpj("");
    setAddress("");
    setCity("");
    setState("");
    setPhone("");
    setWebsiteUrl("");
    setShortDescription("");
    setEmail("");
    setPassword("");
    setActivityType(DEFAULT_SERVICE_ACTIVITIES[0] || "");
    setCustomActivityType("");
    setError(null);
    setSuccess(null);
  }

  useEffect(() => {
    if (!user || user.role === "admin") {
      setSubmissionMode("new-account");
      return;
    }

    if (user.marketplaceProfile === "services") {
      setSubmissionMode("update-current");
      return;
    }

    setSubmissionMode("new-account");
  }, [user]);

  useEffect(() => {
    if (!editingCurrentProfile) return;
    loadUserIntoForm();
  }, [editingCurrentProfile, user]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateCNPJ(cnpj)) {
      setError("Informe um CNPJ válido para o cadastro empresarial.");
      return;
    }

    if (!resolvedActivityType) {
      setError("Selecione ou informe o tipo de atividade.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingCurrentProfile) {
        if (!token) {
          throw new Error("Sua sessão expirou. Faça login novamente.");
        }

        const response = await fetch("/api/auth/me", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          credentials: "same-origin",
          body: JSON.stringify({
            document: onlyDigits(cnpj),
            companyName,
            phone: onlyDigits(phone),
            activityType: resolvedActivityType,
            address,
            city,
            state,
            websiteUrl,
            shortDescription
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Não foi possível atualizar o perfil.");
        }

        updateUser(data.user);
        setSuccess("Perfil de serviços salvo com sucesso. Redirecionando para a página da empresa.");
        window.setTimeout(() => {
          window.location.assign(`/servicos/${data.user.id}`);
        }, 1200);
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error("Informe e-mail e senha para criar a nova conta da empresa.");
        }

        const createdUser = await register(companyName, email, password, {
          document: onlyDigits(cnpj),
          phone: onlyDigits(phone),
          accountType: "company",
          companyName,
          marketplaceProfile: "services",
          activityType: resolvedActivityType,
          address,
          city,
          state,
          websiteUrl,
          shortDescription,
          source: "site",
          autoLogin: !user
        });

        setSuccess("Prestador cadastrado com sucesso. Redirecionando para a página da empresa.");
        window.setTimeout(() => {
          window.location.assign(`/servicos/${createdUser.id}`);
        }, 1200);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível concluir o cadastro."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <Notice title="Cadastro de serviços" variant="info">
        Cadastre empresas de funilaria, restauração, tapeçaria, elétrica, peças e outros serviços relacionados ao setor.
      </Notice>

      {user?.role === "admin" ? (
        <Notice title="Conta administrativa" variant="warning">
          Para evitar misturar permissões administrativas com um perfil público de serviços, esta tela cria sempre uma nova conta empresarial.
        </Notice>
      ) : null}

      {user ? (
        <Notice title="Conta autenticada" variant="info">
          <div className="grid gap-3">
            <p>
              {editingCurrentProfile
                ? "Você está editando o perfil de serviços vinculado à conta atual."
                : "Para evitar sobrescrever a conta logada, o modo padrão desta tela cria uma nova empresa em uma conta separada."}
            </p>

            {canUpdateCurrentAccount ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearFormForNewAccount();
                    setSubmissionMode("new-account");
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    submissionMode === "new-account"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Nova empresa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionMode("update-current");
                    setError(null);
                    setSuccess(null);
                    loadUserIntoForm();
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold ${
                    submissionMode === "update-current"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Usar conta atual
                </button>
              </div>
            ) : null}
          </div>
        </Notice>
      ) : null}

      {error ? (
        <Notice title="Validação" variant="warning">
          {error}
        </Notice>
      ) : null}

      {success ? (
        <Notice title="Cadastro enviado" variant="success">
          {success}
        </Notice>
      ) : null}

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Nome da empresa</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Nome fantasia ou razão social"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">CNPJ</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          inputMode="numeric"
          value={cnpj}
          onChange={(event) => setCnpj(formatCnpj(event.target.value))}
          placeholder="00.000.000/0000-00"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Telefone</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={phone}
          onChange={(event) => setPhone(formatPhone(event.target.value))}
          placeholder="(11) 99999-9999"
        />
      </label>

      <label className="grid gap-1 md:col-span-2">
        <span className="text-sm font-semibold text-slate-900">Tipo de atividade</span>
        <select
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={activityType}
          onChange={(event) => setActivityType(event.target.value)}
        >
          {DEFAULT_SERVICE_ACTIVITIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value="__other__">Outro</option>
        </select>
      </label>

      {activityType === "__other__" ? (
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Atividade personalizada</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={customActivityType}
            onChange={(event) => setCustomActivityType(event.target.value)}
            placeholder="Ex.: vidraçaria, pintura, mecânica especializada"
          />
        </label>
      ) : null}

      <label className="grid gap-1 md:col-span-2">
        <span className="text-sm font-semibold text-slate-900">Endereço</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Rua, número e complemento"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Município</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Município"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Estado</span>
        <input
          required
          maxLength={2}
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={state}
          onChange={(event) => setState(event.target.value.toUpperCase())}
          placeholder="SP"
        />
      </label>

      <label className="grid gap-1 md:col-span-2">
        <span className="text-sm font-semibold text-slate-900">Descrição curta</span>
        <textarea
          required
          className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          placeholder="Explique em poucas linhas o que a empresa faz."
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Site (opcional)</span>
        <input
          type="url"
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          placeholder="https://..."
        />
      </label>

      {!editingCurrentProfile ? (
        <>
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">E-mail</span>
            <input
              required
              type="email"
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="contato@empresa.com"
            />
          </label>

          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Senha</span>
            <input
              required
              type="password"
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Crie uma senha segura"
            />
          </label>
        </>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting
          ? "Enviando..."
          : editingCurrentProfile
            ? "Salvar perfil de serviço"
            : "Cadastrar serviço"}
      </button>
    </form>
  );
}
