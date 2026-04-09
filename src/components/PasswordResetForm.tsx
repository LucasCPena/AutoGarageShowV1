"use client";

import { useEffect, useState } from "react";

import Notice from "@/components/Notice";

type Props = {
  token: string;
};

export default function PasswordResetForm({ token }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [valid, setValid] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function verifyToken() {
      setVerifying(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/auth/password-reset/verify?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Token invalido ou expirado.");
        }

        if (!active) return;
        setValid(true);
        setAccountEmail(typeof data.email === "string" ? data.email : null);
      } catch (verificationError) {
        if (!active) return;
        setValid(false);
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "Token invalido ou expirado."
        );
      } finally {
        if (active) {
          setVerifying(false);
        }
      }
    }

    void verifyToken();

    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/password-reset/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel redefinir a senha.");
      }

      setMessage(data.message || "Senha redefinida com sucesso.");
      window.setTimeout(() => {
        window.location.assign("/");
      }, 1400);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Nao foi possivel redefinir a senha."
      );
    } finally {
      setLoading(false);
    }
  }

  if (verifying) {
    return (
      <div className="mx-auto max-w-xl">
        <Notice title="Validando link" variant="info">
          Conferindo o token de recuperacao.
        </Notice>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="mx-auto max-w-xl">
        <Notice title="Link invalido" variant="warning">
          {error || "O link de recuperacao nao e mais valido."}
        </Notice>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-xl gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm leading-6 text-slate-600">
        {accountEmail ? `Conta identificada: ${accountEmail}. ` : ""}
        Defina a nova senha para concluir a recuperacao.
      </p>

      {message ? (
        <Notice title="Senha atualizada" variant="success">
          {message}
        </Notice>
      ) : null}

      {error ? (
        <Notice title="Erro" variant="warning">
          {error}
        </Notice>
      ) : null}

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Nova senha</span>
        <input
          required
          type="password"
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Digite a nova senha"
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">Confirmar senha</span>
        <input
          required
          type="password"
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repita a nova senha"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}
