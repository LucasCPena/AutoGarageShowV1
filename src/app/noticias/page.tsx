"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import AdminNewsPanel from "@/components/AdminNewsPanel";
import Container from "@/components/Container";
import NewsCrudActions from "@/components/NewsCrudActions";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatDateLong } from "@/lib/date";
import { fetchJson } from "@/lib/fetch-json";
import { newsImageAlt } from "@/lib/image-alt";
import { normalizeAssetReference } from "@/lib/site-url";
import { useAuth } from "@/lib/useAuth";

interface News {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: "eventos" | "classificados" | "geral" | "dicas";
  coverImage: string;
  author: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

function byPublishedAtDesc(a: News, b: News) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function getNewsCoverSrc(coverImage?: string) {
  return normalizeAssetReference(coverImage) || "/placeholders/news.svg";
}

export default function NewsPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCrud, setShowCrud] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const isAdmin = user?.role === "admin";
    const url = isAdmin ? "/api/noticias?scope=all" : "/api/noticias";
    const headers: HeadersInit | undefined =
      isAdmin && token ? { Authorization: `Bearer ${token}` } : undefined;

    fetchJson<{ news?: News[] }>(url, { headers })
      .then((data) => {
        if (cancelled) return;
        setNews(data.news || []);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        console.error("Erro ao buscar noticias:", fetchError);
        setError("Erro ao carregar noticias");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, token, user?.role]);

  const items = useMemo(() => [...news].sort(byPublishedAtDesc), [news]);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando noticias...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-10">
        <Notice title="Erro" variant="warning">
          {error}
        </Notice>
      </Container>
    );
  }

  return (
    <>
      <PageIntro
        title="Noticias"
        subtitle="Conteudo sobre carros antigos, eventos e classificados."
      />

      <Container className="py-10">
        {authLoading ? null : user?.role === "admin" ? (
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCrud((current) => !current)}
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {showCrud ? "Fechar editor" : "Nova noticia"}
            </button>
          </div>
        ) : null}

        {!authLoading && user?.role === "admin" && showCrud ? (
          <div className="mb-8">
            <AdminNewsPanel token={token} />
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {items.map((article) => {
            const expanded = Boolean(expandedCards[article.id]);
            const canExpand = article.excerpt.trim().length > 220;

            return (
              <article
                key={article.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="sm:flex">
                  <Link href={`/noticias/${article.slug}`} className="group block shrink-0 sm:w-52">
                    <Image
                      src={getNewsCoverSrc(article.coverImage)}
                      alt={newsImageAlt(article.title)}
                      width={1200}
                      height={800}
                      className="h-36 w-full object-cover sm:h-full sm:min-h-[190px]"
                    />
                  </Link>

                  <div className="flex-1 p-4">
                    <Link
                      href={`/noticias/${article.slug}`}
                      className="text-base font-semibold text-slate-900 hover:text-brand-800"
                    >
                      {article.title}
                    </Link>

                    <p className={`mt-2 text-sm text-slate-600 ${expanded ? "" : "line-clamp-4"}`}>
                      {article.excerpt}
                    </p>

                    {canExpand ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCards((current) => ({
                            ...current,
                            [article.id]: !current[article.id]
                          }))
                        }
                        className="mt-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
                      >
                        {expanded ? "Ler menos" : "Leia mais"}
                      </button>
                    ) : null}

                    <div className="mt-3 text-xs text-slate-500">
                      Por {article.author} • {formatDateLong(article.createdAt)}
                    </div>

                    <Link
                      href={`/noticias/${article.slug}`}
                      className="mt-2 inline-flex text-xs font-semibold text-brand-700 hover:text-brand-800"
                    >
                      Ler noticia completa
                    </Link>
                  </div>
                </div>

                {user?.role === "admin" ? (
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status: {article.status}
                    </div>
                    <NewsCrudActions
                      newsId={article.id}
                      editHref={`/noticias/gerenciar/${article.id}`}
                      compact
                      onDeleted={() =>
                        setNews((current) => current.filter((item) => item.id !== article.id))
                      }
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </Container>
    </>
  );
}
