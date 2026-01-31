"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ClassifiedsClientSections from "@/components/ClassifiedsClientSections";
import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import type { Listing } from "@/lib/mockData";

export default function ClassifiedsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/listings')
      .then(res => res.json())
      .then(data => {
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao buscar classificados:', err);
        setError('Erro ao carregar classificados');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando classificados...</div>
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
        title="Classificados"
        subtitle="Ordenação tipo OLX, destaque pago e expiração automática (configuráveis no admin)."
      >
        <Link
          href="/classificados/anunciar"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Anunciar
        </Link>
      </PageIntro>

      <Container className="py-10">
        <ClassifiedsClientSections listings={listings} />
      </Container>
    </>
  );
}
