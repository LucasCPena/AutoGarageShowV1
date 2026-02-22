"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ClassifiedsClientSections from "@/components/ClassifiedsClientSections";
import Container from "@/components/Container";
import HeroSlider from "@/components/HeroSlider";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import type { Listing } from "@/lib/database";
import { fetchJson } from "@/lib/fetch-json";
import { useAuth } from "@/lib/useAuth";

export default function ClassifiedsPage() {
  const { token, isLoading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const headers: HeadersInit | undefined = token
      ? { Authorization: `Bearer ${token}` }
      : undefined;

    fetchJson<{ listings?: Listing[] }>("/api/listings", {
      headers,
      cache: "no-store"
    })
      .then((data) => {
        if (cancelled) return;
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Erro ao buscar classificados:", err);
        setError("Erro ao carregar classificados");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

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
        <section className="mb-8">
          <HeroSlider section="listings" />
        </section>

        <ClassifiedsClientSections listings={listings} />
      </Container>
    </>
  );
}
