"use client";

import Link from "next/link";

import AdminBannersPanel from "@/components/AdminBannersPanel";
import AdminCatalogPanel from "@/components/AdminCatalogPanel";
import AdminSettingsPanel from "@/components/AdminSettingsPanel";
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

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
        </div>

        <div className="mt-10">
          <AdminSettingsPanel />
        </div>

        <div className="mt-10">
          <AdminCatalogPanel token={token} />
        </div>

        <div className="mt-10">
          <AdminBannersPanel
            token={token}
            fixedSection="home"
            title="Banners Topo Home"
            description="Gestao dos banners exibidos no topo da home."
          />
        </div>

        <div className="mt-10">
          <AdminBannersPanel
            token={token}
            fixedSection="listings"
            title="Banners Anuncios"
            description="Gestao dos banners da area de classificados."
          />
        </div>
      </Container>
    </>
  );
}
