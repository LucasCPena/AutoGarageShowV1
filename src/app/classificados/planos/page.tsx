import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/Container";
import PageIntro from "@/components/PageIntro";

export const metadata: Metadata = {
  title: "Planos de anuncios",
  description: "Conheca os planos de destaque para classificados."
};

export default function ListingPlansPage() {
  return (
    <>
      <PageIntro
        title="Planos de anuncios"
        subtitle="O destaque permanece ativo por 30 dias."
      />

      <Container className="py-10">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-semibold text-slate-500">Plano gratuito</div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Publicacao padrao</h2>
            <p className="mt-2 text-sm text-slate-600">Anuncio em ordem cronologica, sujeito a aprovacao.</p>
          </article>
          <article className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <div className="text-sm font-semibold text-brand-700">Plano destaque</div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Destaque por 30 dias</h2>
            <p className="mt-2 text-sm text-slate-700">Seu anuncio vai para a vitrine de destaques por um periodo fixo de 30 dias.</p>
          </article>
        </div>

        <Link
          href="/classificados/anunciar"
          className="mt-6 inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Quero anunciar
        </Link>
      </Container>
    </>
  );
}
