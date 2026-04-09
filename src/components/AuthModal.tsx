"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import Notice from "@/components/Notice";
import { onlyDigits } from "@/lib/document";
import { useAuth } from "@/lib/useAuth";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
  redirectTo?: string;
};

function formatDocument(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function AuthModal({
  isOpen,
  onClose,
  defaultMode = "login",
  redirectTo = "/"
}: Props) {
  const { login, register } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [documentValue, setDocumentValue] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setMode(defaultMode);
  }, [defaultMode, isOpen]);

  useEffect(() => {
    setError("");
    setSubmitted(false);
    setDocumentValue("");
    setCompanyName("");
  }, [mode]);

  const documentDigits = useMemo(() => onlyDigits(documentValue), [documentValue]);
  const isCompanyRegistration = mode === "register" && documentDigits.length === 14;

  if (!mounted || !isOpen) return null;

  function finishSuccess() {
    onClose();
    setSubmitted(false);
    setEmail("");
    setPassword("");
    setName("");
    setCompanyName("");
    setDocumentValue("");

    if (typeof window !== "undefined") {
      const fallbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.assign(redirectTo || fallbackUrl);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!email || !password || (mode === "register" && (!name || !documentValue))) {
      setError("Preencha todos os campos obrigatorios.");
      return;
    }

    if (isCompanyRegistration && !companyName.trim()) {
      setError("Informe o nome da empresa para cadastro com CNPJ.");
      return;
    }

    setSubmitted(true);

    if (mode === "register") {
      register(name, email, password, {
        document: documentValue,
        accountType: isCompanyRegistration ? "company" : "individual",
        companyName: isCompanyRegistration ? companyName : undefined
      })
        .then(() => {
          window.setTimeout(() => {
            finishSuccess();
          }, 1000);
        })
        .catch((submitError) => {
          setError(submitError.message || "Erro ao cadastrar. Tente novamente.");
          setSubmitted(false);
        });
      return;
    }

    login(email, password)
      .then(() => {
        window.setTimeout(() => {
          finishSuccess();
        }, 1000);
      })
      .catch((submitError) => {
        setError(submitError.message || "Erro ao autenticar. Tente novamente.");
        setSubmitted(false);
      });
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 text-slate-400 hover:text-slate-600"
          aria-label="Fechar autenticacao"
        >
          x
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            {mode === "login" ? "Entrar" : "Cadastrar"}
          </h2>
        </div>

        {submitted ? (
          <Notice title="Sucesso" variant="success">
            {mode === "login" ? "Login realizado com sucesso!" : "Cadastro realizado com sucesso!"}
          </Notice>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" ? (
              <>
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-semibold text-slate-900">
                    Nome
                  </label>
                  <input
                    id="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <label
                    htmlFor="document"
                    className="mb-1 block text-sm font-semibold text-slate-900"
                  >
                    CPF ou CNPJ
                  </label>
                  <input
                    id="document"
                    required
                    value={documentValue}
                    onChange={(event) => setDocumentValue(formatDocument(event.target.value))}
                    className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                    placeholder="Digite seu CPF ou CNPJ"
                    inputMode="numeric"
                  />
                </div>

                {isCompanyRegistration ? (
                  <div>
                    <label
                      htmlFor="companyName"
                      className="mb-1 block text-sm font-semibold text-slate-900"
                    >
                      Nome da empresa
                    </label>
                    <input
                      id="companyName"
                      required
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                      placeholder="Razao social ou nome fantasia"
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-900">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-semibold text-slate-900"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
                placeholder="Sua senha"
              />
            </div>

            {mode === "login" ? (
              <div className="text-right text-sm">
                <a
                  href="/recuperar-senha"
                  onClick={onClose}
                  className="font-semibold text-brand-700 hover:text-brand-800"
                >
                  Esqueci minha senha
                </a>
              </div>
            ) : null}

            {error ? (
              <Notice title="Erro" variant="warning">
                {error}
              </Notice>
            ) : null}

            <button
              type="submit"
              className="h-11 w-full rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {mode === "login" ? "Entrar" : "Cadastrar"}
            </button>

            <div className="text-center text-sm text-slate-600">
              {mode === "login" ? (
                <>
                  Nao tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-brand-700 hover:text-brand-800"
                  >
                    Cadastre-se
                  </button>
                </>
              ) : (
                <>
                  Ja tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-brand-700 hover:text-brand-800"
                  >
                    Entrar
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
