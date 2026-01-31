"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatDateLong } from "@/lib/date";

interface News {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: 'eventos' | 'classificados' | 'geral' | 'dicas';
  coverImage: string;
  author: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

function byPublishedAtDesc(a: News, b: News) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/noticias')
      .then(res => res.json())
      .then(data => {
        setNews(data.news || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar notícias:', err);
        setError('Erro ao carregar notícias');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando notícias...</div>
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

  const items = [...news].sort(byPublishedAtDesc);

  return (
    <>
      <PageIntro
        title="Notícias"
        subtitle="Conteúdo sobre carros antigos, eventos e classificados."
      />

      <Container className="py-10">
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {items.map((article) => (
            <Link
              key={article.id}
              href={`/noticias/${article.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white hover:border-brand-200 sm:flex-row"
            >
              <Image
                src={article.coverImage}
                alt={article.title}
                width={1200}
                height={800}
                className="h-48 w-full object-cover sm:h-auto sm:w-56"
              />
              <div className="flex-1 p-5">
                <div className="text-xs font-semibold text-brand-700 capitalize">
                  {article.category}
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900 group-hover:text-brand-800">
                  {article.title}
                </div>
                <div className="mt-2 text-sm text-slate-600">{article.excerpt}</div>
                <div className="mt-4 text-xs text-slate-500">
                  Por {article.author} • {formatDateLong(article.createdAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}
