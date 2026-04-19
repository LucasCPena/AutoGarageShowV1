"use client";

import Link from "next/link";

import AdminPlansPanel from "@/components/AdminPlansPanel";
import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { useAuth } from "@/lib/useAuth";

export default function AdminPlansPage() {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Container className="py-10">
        <div>Carregando...</div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-10">
        <Notice title="Acesso Restrito" variant="warning">
          Você precisa estar logado como administrador para acessar esta página.
        </Notice>
      </Container>
    );
  }

  if (user.role !== "admin") {
    return (
      <Container className="py-10">
        <Notice title="Acesso Restrito" variant="warning">
          Esta area e exclusiva para administradores.
        </Notice>
      </Container>
    );
  }

  return (
    <>
      <PageIntro
        title="Planos"
        subtitle="Cadastre e organize os planos exibidos na aba pública de planos."
      >
        <Link
          href="/admin"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar para admin
        </Link>
      </PageIntro>

      <Container className="py-10">
        <AdminPlansPanel token={token} />
      </Container>
    </>
  );
}
