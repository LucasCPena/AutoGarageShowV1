"use client";

import Link from "next/link";

type Props = {
  className?: string;
  showTitle?: boolean;
};

export default function ListingPlansSection({ className = "", showTitle = true }: Props) {
  return (
    <section className={className}>
      {showTitle ? (
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Planos de anuncios</h2>
            <p className="mt-1 text-sm text-slate-600">
              Escolha entre publicacao gratuita ou destaque por 30 dias.
            </p>
          </div>
          <Link
            href="/classificados/planos"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver detalhes
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="text-sm font-semibold text-slate-500">Plano gratuito</div>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Publicacao padrao</h3>
          <p className="mt-2 text-sm text-slate-600">
            Anuncio em ordem cronologica, sujeito a aprovacao.
          </p>
          <Link
            href="/classificados/anunciar"
            className="mt-4 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Publicar gratis
          </Link>
        </article>

        <article className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
          <div className="text-sm font-semibold text-brand-700">Plano destaque</div>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Destaque por 30 dias</h3>
          <p className="mt-2 text-sm text-slate-700">
            Seu anuncio vai para a vitrine de destaques por um periodo fixo de 30 dias.
          </p>
          <Link
            href="/classificados/anunciar"
            className="mt-4 inline-flex rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Quero destacar
          </Link>
        </article>
      </div>
    </section>
  );
}
