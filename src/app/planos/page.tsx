import type { Metadata } from "next";

import Container from "@/components/Container";
import HeroSlider from "@/components/HeroSlider";
import ListingPlansSection from "@/components/ListingPlansSection";
import PageIntro from "@/components/PageIntro";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos",
  description: "Conheça os planos disponíveis para anunciar na plataforma."
};

export default function PlansPage() {
  return (
    <>
      <PageIntro
        title="Planos"
        subtitle="Consulte os planos disponíveis para anunciar no portal."
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
