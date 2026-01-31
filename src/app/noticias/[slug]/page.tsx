"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import PageIntro from "@/components/PageIntro";
import { formatDateLong } from "@/lib/date";

interface News {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: 'eventos' | 'classificados' | 'geral' | 'dicas';
  coverImage: string;
  author: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

type Props = {
  params: {
    slug: string;
  };
};

function toMetaDescription(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}

export default function NewsDetailPage({ params }: Props) {
  const [article, setArticle] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/noticias`)
      .then(res => res.json())
      .then(data => {
        const foundArticle = data.news?.find((n: News) => n.slug === params.slug);
        if (foundArticle) {
          setArticle(foundArticle);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar notícia:', err);
        setLoading(false);
      });
  }, [params.slug]);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando notícia...</div>
      </Container>
    );
  }

  if (!article) {
    return notFound();
  }

  const paragraphs = article.content
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <PageIntro title={article.title} subtitle={`${article.category} • ${formatDateLong(article.createdAt)}`}>
        <Link
          href="/noticias"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
      </PageIntro>

      <Container className="py-10">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <Image
              src={article.coverImage}
              alt={article.title}
              width={1200}
              height={800}
              className="h-72 w-full object-cover"
              priority
            />
          </div>

          <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
            <div className="text-xs font-semibold text-brand-700 capitalize">
              {article.category}
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {article.title}
            </h2>
            <div className="mt-2 text-sm text-slate-500">
              Por {article.author} • {formatDateLong(article.createdAt)}
            </div>

            <div className="mt-6 grid gap-4 text-sm leading-relaxed text-slate-700">
              {paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </article>
        </div>
      </Container>
    </>
  );
}
