"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import Notice from "@/components/Notice";
import SiteSearchForm from "@/components/SiteSearchForm";
import { normalizeAssetReference } from "@/lib/site-url";

type SearchResultItem = {
  id: string;
  type: "listing" | "event" | "news" | "company";
  title: string;
  subtitle?: string;
  href: string;
  image?: string;
};

type Props = {
  initialQuery?: string;
  initialType?: string;
};

function typeLabel(type: SearchResultItem["type"]) {
  if (type === "listing") return "Veiculo";
  if (type === "event") return "Evento";
  if (type === "news") return "Noticia";
  return "Empresa";
}

export default function SiteSearchResults({
  initialQuery = "",
  initialType = "all"
}: Props) {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      q: initialQuery
    });
    if (initialType && initialType !== "all") {
      params.set("type", initialType);
    }

    fetch(`/api/search?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Nao foi possivel executar a busca.");
        }
        setResults(Array.isArray(data.results) ? data.results : []);
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Erro na busca.");
      })
      .finally(() => setLoading(false));
  }, [initialQuery, initialType]);

  return (
    <div className="grid gap-6">
      <SiteSearchForm initialQuery={initialQuery} initialType={initialType} />

      {loading ? <div className="text-sm text-slate-600">Buscando...</div> : null}
      {error ? (
        <Notice title="Erro" variant="warning">
          {error}
        </Notice>
      ) : null}
      {!loading && !error && initialQuery.trim() && results.length === 0 ? (
        <Notice title="Sem resultados" variant="info">
          Nenhum resultado encontrado para sua busca.
        </Notice>
      ) : null}
      {!initialQuery.trim() ? (
        <Notice title="Busca interna" variant="info">
          Digite um termo para localizar eventos, veiculos, noticias e empresas anunciantes.
        </Notice>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {results.map((item) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.href}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand-300"
          >
            {item.image ? (
              <div className="relative h-44 w-full">
                <Image
                  src={normalizeAssetReference(item.image) || "/placeholders/banner.svg"}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                {typeLabel(item.type)}
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900">{item.title}</div>
              {item.subtitle ? (
                <p className="mt-2 text-sm text-slate-600 line-clamp-3">{item.subtitle}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

