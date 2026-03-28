"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import AuthModal from "@/components/AuthModal";
import ListingSubmissionForm from "@/components/ListingSubmissionForm";
import Notice from "@/components/Notice";
import { useAuth } from "@/lib/useAuth";

type Props = {
  publicAccess?: boolean;
};

export default function ListingSubmissionGate({ publicAccess = false }: Props) {
  const { user, isLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  useEffect(() => {
    if (!publicAccess || user || isLoading) return;
    setAuthMode("register");
    setAuthModalOpen(true);
  }, [isLoading, publicAccess, user]);

  if (isLoading) {
    return (
      <Notice title="Carregando" variant="info">
        Verificando sessao do usuario.
      </Notice>
    );
  }

  if (publicAccess && !user) {
    return (
      <>
        <div className="grid gap-4">
          <Notice title="Acesso pelo QR Code" variant="info">
            Este link libera somente o cadastro de carro no pre-lancamento. Faca seu cadastro ou entre para continuar.
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
              Cadastrar para continuar
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
          </div>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authMode}
          redirectTo="/veiculos/anunciar"
        />
      </>
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
          redirectTo="/veiculos/anunciar"
        />
      </>
    );
  }

  if (publicAccess) {
    return (
      <div className="grid gap-4">
        <Notice title="Cadastro liberado" variant="info">
          Seu acesso por QR Code esta limitado a esta area de cadastro de carro.
        </Notice>
        <ListingSubmissionForm publicAccess={false} />
      </div>
    );
  }

  return <ListingSubmissionForm publicAccess={false} />;
}
