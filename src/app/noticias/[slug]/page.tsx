"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import NewsCrudActions from "@/components/NewsCrudActions";
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
  content: string;
  excerpt: string;
  category: "eventos" | "classificados" | "geral" | "dicas";
  coverImage: string;
  author: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

type Props = {
  params: {
    slug: string;
  };
};

function getNewsCoverSrc(coverImage?: string) {
  return normalizeAssetReference(coverImage) || "/placeholders/news.svg";
}

export default function NewsDetailPage({ params }: Props) {
  const { user, token, isLoading: authLoading } = useAuth();
  const [article, setArticle] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    const isAdmin = user?.role === "admin";
    const url = isAdmin ? "/api/noticias?scope=all" : "/api/noticias";
    const headers: HeadersInit | undefined =
      isAdmin && token ? { Authorization: `Bearer ${token}` } : undefined;

    fetchJson<{ news?: News[] }>(url, { headers })
      .then((data) => {
        const foundArticle = data.news?.find((item) => item.slug === params.slug);
        if (foundArticle) {
          setArticle(foundArticle);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Erro ao buscar noticia:", error);
        setLoading(false);
      });
  }, [authLoading, params.slug, token, user?.role]);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando noticia...</div>
      </Container>
    );
  }

  if (!article) {
    return notFound();
  }

  const paragraphs = article.content
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      <PageIntro title={article.title} subtitle={formatDateLong(article.createdAt)}>
        <Link
          href="/noticias"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
      </PageIntro>

      <Container className="py-10">
        <div className="mx-auto max-w-3xl">
          <NewsCrudActions
            newsId={article.id}
            editHref={`/noticias/gerenciar/${article.id}`}
          />

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <Image
              src={getNewsCoverSrc(article.coverImage)}
              alt={newsImageAlt(article.title)}
              width={1200}
              height={800}
              className="h-72 w-full object-cover"
              priority
            />
          </div>

          <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {article.title}
            </h2>
            <div className="mt-2 text-sm text-slate-500">
              Por {article.author} • {formatDateLong(article.createdAt)}
            </div>

            <div className="mt-6 grid gap-4 text-sm leading-relaxed text-slate-700">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        </div>
      </Container>
    </>
  );
}
