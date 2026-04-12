"use client";

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

export default function MotorcyclesPage() {
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

    fetchJson<{ listings?: Listing[] }>("/api/listings?vehicleType=motorcycle", {
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
        console.error("Erro ao buscar motos:", err);
        setError("Erro ao carregar motos");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

  if (loading) {
    return (
      <Container className="py-10">
        <div>Carregando motos...</div>
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
        title="Motos"
        subtitle="Encontre motos aprovadas pela plataforma em uma vitrine dedicada."
      />

      <Container className="py-10">
        <div className="page-with-sidebar">
          <div>
            <section className="mb-8">
              <HeroSlider section="listings" />
            </section>

            <MarketplaceSectionNav current="motos" />

            <ClassifiedsClientSections
              listings={listings}
              forcedVehicleType="motorcycle"
              featuredSectionTitle="Motos em destaque"
              featuredSectionSubtitle="Seleção de motos promovidas e aprovadas para a vitrine principal."
              latestSectionTitle="Últimas motos"
              latestSectionSubtitle="Confira as motos cadastradas mais recentemente, com data e hora do anúncio."
            />
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
