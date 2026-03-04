"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import AdminBannersPanel from "@/components/AdminBannersPanel";
import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { useAuth } from "@/lib/useAuth";

type BannerSection = "home" | "events" | "listings";

const sectionMeta: Record<
  BannerSection,
  { title: string; description: string; buttonLabel: string }
> = {
  home: {
    title: "Banner de fundo da Home",
    description: "Gerencie apenas a imagem de fundo principal da pagina inicial.",
    buttonLabel: "Home"
  },
  events: {
    title: "Banners da sessao Eventos",
    description: "Gerencie banners exibidos dentro da pagina de eventos.",
    buttonLabel: "Eventos"
  },
  listings: {
    title: "Banners da sessao Classificados",
    description: "Gerencie banners exibidos dentro da pagina de classificados.",
    buttonLabel: "Classificados"
  }
};

export default function AdminBannersPage() {
  const { user, token, isLoading } = useAuth();
  const [section, setSection] = useState<BannerSection>("events");

  const currentMeta = useMemo(() => sectionMeta[section], [section]);

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
        title="Banners"
        subtitle="Tela dedicada apenas para cadastro e gestao de banners."
      >
        <Link
          href="/admin"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar para admin
        </Link>
      </PageIntro>

      <Container className="py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          {(Object.keys(sectionMeta) as BannerSection[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSection(option)}
              className={
                option === section
                  ? "rounded-md border border-brand-500 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700"
                  : "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              }
            >
              {sectionMeta[option].buttonLabel}
            </button>
          ))}
        </div>

        <AdminBannersPanel
          token={token}
          fixedSection={section}
          title={currentMeta.title}
          description={currentMeta.description}
        />
      </Container>
    </>
  );
}
