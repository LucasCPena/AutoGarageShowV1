import type { Metadata } from "next";

import Container from "@/components/Container";
import HeroSlider from "@/components/HeroSlider";
import ListingPlansSection from "@/components/ListingPlansSection";
import PageIntro from "@/components/PageIntro";

export const metadata: Metadata = {
  title: "Planos de anuncios",
  description: "Conheca os planos de destaque para classificados."
};

export default function ListingPlansPage() {
  return (
    <>
      <PageIntro
        title="Planos de anuncios"
        subtitle="O destaque permanece ativo por 30 dias."
      />

      <Container className="py-10">
        <section className="mb-8">
          <HeroSlider section="plans" />
        </section>
        <ListingPlansSection showTitle={false} />
      </Container>
    </>
  );
}
