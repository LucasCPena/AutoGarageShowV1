"use client";

import { useState } from "react";

import Link from "next/link";

import AuthModal from "@/components/AuthModal";
import ListingSubmissionForm from "@/components/ListingSubmissionForm";
import Notice from "@/components/Notice";
import { useAuth } from "@/lib/useAuth";

export default function ListingSubmissionGate() {
  const { user, isLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  if (isLoading) {
    return (
      <Notice title="Carregando" variant="info">
        Verificando sessao do usuario.
      </Notice>
    );
  }

  if (!user) {
    return (
      <>
        <div className="grid gap-4">
          <Notice title="Login obrigatorio" variant="info">
            Para anunciar um veiculo, faca login ou cadastre-se antes de preencher o formulario.
          </Notice>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setAuthModalOpen(true);
              }}
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Cadastrar para anunciar
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthModalOpen(true);
              }}
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ja tenho conta
            </button>
            <Link
              href="/planos"
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver planos
            </Link>
          </div>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authMode}
          redirectTo="/classificados/anunciar"
        />
      </>
    );
  }

  return <ListingSubmissionForm />;
}
