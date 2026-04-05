"use client";

import { useState } from "react";

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

export default function ServicesRegistrationForm() {
  const { user, register } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resolvedActivityType =
    activityType === "__other__" ? customActivityType.trim() : activityType.trim();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateCNPJ(cnpj)) {
      setError("Informe um CNPJ valido para o cadastro empresarial.");
      return;
    }

    if (!resolvedActivityType) {
      setError("Selecione ou informe o tipo de atividade.");
      return;
    }

    setSubmitting(true);

    try {
      await register(responsibleName, email, password, {
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
        source: "site"
      });

      setSuccess("Prestador cadastrado com sucesso. Redirecionando para a vitrine de servicos.");
      window.setTimeout(() => {
        window.location.assign("/servicos");
      }, 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel concluir o cadastro."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return (
      <Notice title="Conta autenticada" variant="info">
        Sua conta ja esta autenticada. Para cadastrar outro prestador, encerre a sessao atual antes de continuar.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <Notice title="Cadastro de servicos" variant="info">
        Cadastre empresas de funilaria, restauracao, tapeçaria, eletrica, pecas e outros servicos relacionados ao setor.
      </Notice>

      {error ? (
        <Notice title="Validacao" variant="warning">
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
          placeholder="Nome fantasia ou razao social"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Responsavel</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={responsibleName}
          onChange={(event) => setResponsibleName(event.target.value)}
          placeholder="Nome do responsavel"
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
            placeholder="Ex.: Vidracaria, pintura, mecanica especializada"
          />
        </label>
      ) : null}

      <label className="grid gap-1 md:col-span-2">
        <span className="text-sm font-semibold text-slate-900">Endereco</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Rua, numero e complemento"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Municipio</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Municipio"
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
        <span className="text-sm font-semibold text-slate-900">Descricao curta</span>
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

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Cadastrar servico"}
      </button>
    </form>
  );
}
