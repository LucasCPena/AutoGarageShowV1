"use client";

import Link from "next/link";

import AdminCatalogPanel from "@/components/AdminCatalogPanel";
import AdminCommentsPanel from "@/components/AdminCommentsPanel";
import AdminOrganizersPanel from "@/components/AdminOrganizersPanel";
import AdminPrivacyPanel from "@/components/AdminPrivacyPanel";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";
import AdminMetricsPanel from "@/components/AdminMetricsPanel";
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
          Você precisa estar logado como administrador para acessar esta página.
        </Notice>
      </Container>
    );
  }

  if (user.role !== "admin") {
    return (
      <Container className="py-10">
        <Notice title="Acesso Restrito" variant="warning">
          Esta área é exclusiva para administradores.
        </Notice>
      </Container>
    );
  }

  return (
    <>
      <PageIntro
        title="Admin"
        subtitle="Painel administrativo com organização por veículos, eventos, notícias, banners, planos e operação."
      />

      <Container className="py-10">
        <Notice title="CRUD por tela" variant="info">
          O CRUD de eventos, veículos e notícias agora fica dentro das próprias páginas:
          /eventos, /veiculos e /noticias.
        </Notice>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Link
            href="/eventos"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Gerenciar eventos
          </Link>
          <Link
            href="/veiculos"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Gerenciar veículos
          </Link>
          <Link
            href="/noticias"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Gerenciar notícias
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
          <a
            href="#admin-privacy-panel"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:border-brand-300 hover:text-brand-700"
          >
            Política de privacidade
          </a>
        </div>

        <div className="mt-10">
          <AdminSettingsPanel />
        </div>

        <div className="mt-10">
          <AdminPrivacyPanel token={token} />
        </div>

        <div className="mt-10">
          <AdminMetricsPanel token={token} />
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
