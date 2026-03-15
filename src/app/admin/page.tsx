"use client";

import Link from "next/link";

import AdminCatalogPanel from "@/components/AdminCatalogPanel";
import AdminCommentsPanel from "@/components/AdminCommentsPanel";
import AdminOrganizersPanel from "@/components/AdminOrganizersPanel";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";
import AdminUsersPanel from "@/components/AdminUsersPanel";
import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { useAuth } from "@/lib/useAuth";

export default function AdminPage() {
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
          Voce precisa estar logado como administrador para acessar esta pagina.
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
        title="Admin"
        subtitle="Configuracoes gerais do sistema e atalhos para CRUD nas telas publicas."
      />

      <Container className="py-10">
        <Notice title="CRUD por tela" variant="info">
          O CRUD de eventos, classificados e noticias agora fica dentro das proprias paginas:
          /eventos, /classificados e /noticias.
        </Notice>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link
            href="/eventos"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Gerenciar eventos
          </Link>
          <Link
            href="/classificados"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Gerenciar classificados
          </Link>
          <Link
            href="/noticias"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Gerenciar noticias
          </Link>
          <Link
            href="/admin/banners"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Gerenciar banners
          </Link>
          <Link
            href="/admin/planos"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Gerenciar planos
          </Link>
        </div>

        <div className="mt-10">
          <AdminSettingsPanel />
        </div>

        <div className="mt-10">
          <AdminCatalogPanel token={token} />
        </div>

        <div className="mt-10">
          <AdminCommentsPanel token={token} />
        </div>

        <div className="mt-10">
          <AdminUsersPanel token={token} />
        </div>

        <div className="mt-10">
          <AdminOrganizersPanel token={token} />
        </div>
      </Container>
    </>
  );
}
