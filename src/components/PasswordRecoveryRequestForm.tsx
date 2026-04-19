"use client";

import { useState } from "react";

import Notice from "@/components/Notice";

export default function PasswordRecoveryRequestForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewResetUrl, setPreviewResetUrl] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setPreviewResetUrl(null);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível enviar a recuperação.");
      }

      setMessage(data.message || "Confira seu e-mail para continuar.");
      setPreviewResetUrl(
        typeof data.previewResetUrl === "string" ? data.previewResetUrl : null
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível enviar a recuperação."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-xl gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm leading-6 text-slate-600">
        Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link para você
        criar uma nova senha.
      </p>

      {message ? (
        <Notice title="Solicitação enviada" variant="success">
          {message}
        </Notice>
      ) : null}

      {previewResetUrl ? (
        <Notice title="Link de desenvolvimento" variant="info">
          <a
            href={previewResetUrl}
            className="font-semibold text-brand-700 hover:text-brand-800"
          >
            Abrir link de recuperação
          </a>
        </Notice>
      ) : null}

      {error ? (
        <Notice title="Erro" variant="warning">
          {error}
        </Notice>
      ) : null}

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-900">E-mail</span>
        <input
          required
          type="email"
          className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu@email.com"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Recuperar senha"}
      </button>
    </form>
  );
}
