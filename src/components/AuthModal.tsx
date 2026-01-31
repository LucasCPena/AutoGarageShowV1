"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import Notice from "@/components/Notice";
import { useAuth } from "@/lib/useAuth";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
};

export default function AuthModal({ isOpen, onClose, defaultMode = "login" }: Props) {
  const { login, register } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when mode changes
  useEffect(() => {
    setError("");
    setSubmitted(false);
  }, [mode]);

  // Evitar renderização no servidor se não estiver montado
  if (!mounted) return null;

  if (!isOpen) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password || (mode === "register" && !name)) {
      setError("Preencha todos os campos.");
      return;
    }

    setSubmitted(true);
    
    if (mode === "register") {
      register(name, email, password)
        .then(() => {
          setTimeout(() => {
            onClose();
            setSubmitted(false);
            setEmail("");
            setPassword("");
            setName("");
          }, 1000);
        })
        .catch((err) => {
          setError(err.message || "Erro ao cadastrar. Tente novamente.");
          setSubmitted(false);
        });
    } else {
      console.log('Tentando fazer login com:', email);
      login(email, password)
        .then((user) => {
          console.log('Login successful:', user);
          setTimeout(() => {
            onClose();
            setSubmitted(false);
            setEmail("");
            setPassword("");
            setName("");
          }, 1000);
        })
        .catch((err) => {
          console.error('Login error:', err);
          setError(err.message || "Erro ao autenticar. Tente novamente.");
          setSubmitted(false);
        });
    }
  }

  if (!isOpen) return null;

  return createPortal(
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-black/50"
      onClick={onClose}
    />

    <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 text-slate-400 hover:text-slate-600"
      >
        ✕
      </button>

      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">
          {mode === "login" ? "Entrar" : "Cadastrar"}
        </h2>
      </div>

      {submitted ? (
        <Notice title="Sucesso" variant="success">
          {mode === "login"
            ? "Login realizado com sucesso!"
            : "Cadastro realizado com sucesso!"}
        </Notice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
  {mode === "register" && (
    <div>
      <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-1">
        Nome
      </label>
      <input
        id="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
        placeholder="Seu nome"
      />
    </div>
  )}

  <div>
    <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-1">
      E-mail
    </label>
    <input
      id="email"
      type="email"
      required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
      placeholder="seu@email.com"
    />
  </div>

  <div>
    <label htmlFor="password" className="block text-sm font-semibold text-slate-900 mb-1">
      Senha
    </label>
    <input
      id="password"
      type="password"
      required
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm"
      placeholder="••••••••"
    />
  </div>

  {error && (
    <Notice title="Erro" variant="warning">
      {error}
    </Notice>
  )}

  <button
    type="submit"
    className="h-11 w-full rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
  >
    {mode === "login" ? "Entrar" : "Cadastrar"}
  </button>

  <div className="text-center text-sm text-slate-600">
    {mode === "login" ? (
      <>
        Não tem conta?{" "}
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
        Já tem conta?{" "}
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

  <div className="text-xs text-slate-500">
    Dica: use e-mail contendo &quot;admin&quot; para acesso de administrador.
  </div>
</form>

      )}
    </div>
  </div>,
  document.body
);


}
