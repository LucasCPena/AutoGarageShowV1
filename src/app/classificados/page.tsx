"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import ClassifiedsClientSections from "@/components/ClassifiedsClientSections";
import Container from "@/components/Container";
import HeroSlider from "@/components/HeroSlider";
import MarketplaceSectionNav from "@/components/MarketplaceSectionNav";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import SidebarBannerStack from "@/components/SidebarBannerStack";
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
        subtitle="Encontre veículos, motos e serviços especializados em uma vitrine unificada."
      />

      <Container className="py-10">
        <section id="classificados-banner" className="mb-8">
          <HeroSlider section="listings" />
        </section>

        <div className="page-with-sidebar">
          <div>
            <MarketplaceSectionNav current="veiculos" />

            <section className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3">
              <a
                href="#classificados-banner"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
              >
                Banner principal
              </a>
              <a
                href="#classificados-destaques"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
              >
                Em destaque
              </a>
              <a
                href="#classificados-recentes"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
              >
                Últimos veículos
              </a>
              <Link
                href="/servicos"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
              >
                Serviços
              </Link>
            </section>

            <ClassifiedsClientSections listings={listings} />
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
