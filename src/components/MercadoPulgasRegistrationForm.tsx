"use client";

import { useState } from "react";

import Notice from "@/components/Notice";
import { onlyDigits, validateCNPJ } from "@/lib/document";
import { useAuth } from "@/lib/useAuth";

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function MercadoPulgasRegistrationForm() {
  const { user, register } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateCNPJ(cnpj)) {
      setError("Informe um CNPJ válido para o cadastro empresarial.");
      return;
    }

    setSubmitting(true);

    try {
      await register(responsibleName, email, password, {
        document: onlyDigits(cnpj),
        accountType: "company",
        companyName,
        marketplaceProfile: "mercado-de-pulgas",
        source: "site"
      });

      setSuccess(
        "Empresa cadastrada com sucesso. Se houver moderacao ativa, a conta pode ficar aguardando liberacao."
      );
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

  if (user) {
    return (
      <Notice title="Cadastro ja iniciado" variant="info">
        Sua conta ja esta autenticada. Se precisar completar a operação comercial, siga pelo painel do cliente.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
      <Notice title="Cadastro empresarial" variant="info">
        Esta area aceita empresas de pecas, ferramentas, materiais, funilaria e serviços relacionados. O documento permitido aqui e exclusivamente CNPJ.
      </Notice>

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
        <span className="text-sm font-semibold text-slate-900">Empresa</span>
        <input
          required
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Nome fantasia ou razão social"
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

      <label className="grid gap-1">
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
        {submitting ? "Enviando..." : "Cadastrar empresa"}
      </button>
    </form>
  );
}
