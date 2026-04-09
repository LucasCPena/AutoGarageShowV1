import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import Container from "@/components/Container";
import ListingSubmissionGate from "@/components/ListingSubmissionGate";
import ListingPlansSection from "@/components/ListingPlansSection";
import MarketplaceImportantNotice from "@/components/MarketplaceImportantNotice";
import PageIntro from "@/components/PageIntro";
import { hasPublicListingPageAccess } from "@/lib/public-listing-access";
import type { ListingVehicleType } from "@/lib/database";

export const metadata: Metadata = {
  title: "Anunciar",
  description: "Cadastre gratuitamente um anuncio de veiculo antigo."
};

type Props = {
  searchParams?: {
    tipo?: string;
  };
};

export default function ListingSubmitPage({ searchParams }: Props) {
  const hasLimitedListingAccess = hasPublicListingPageAccess(cookies());
  const initialVehicleType: ListingVehicleType =
    searchParams?.tipo === "moto" ? "motorcycle" : "car";

  return (
    <>
      <PageIntro
        title="Anuncie"
        subtitle={
          hasLimitedListingAccess
            ? "Preencha os dados do carro e envie o anuncio. Esse acesso foi liberado somente para esta area."
            : "Escolha a categoria, consulte os planos ativos e siga para o formulario de publicacao."
        }
      />

      <Container className="py-10">
        {hasLimitedListingAccess ? null : (
          <>
            <section className="mx-auto mb-8 grid max-w-5xl gap-4 md:grid-cols-3">
              <Link
                href="/veiculos/anunciar#formulario-anuncio"
                className="flex min-h-40 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 px-6 text-center text-4xl font-bold text-slate-900 hover:border-brand-200 hover:bg-brand-50"
              >
                Veiculos
              </Link>
              <Link
                href="/veiculos/anunciar?tipo=moto#formulario-anuncio"
                className="flex min-h-40 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 px-6 text-center text-4xl font-bold text-slate-900 hover:border-brand-200 hover:bg-brand-50"
              >
                Motos
              </Link>
              <Link
                href="/servicos/cadastrar"
                className="flex min-h-40 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 px-6 text-center text-4xl font-bold text-slate-900 hover:border-brand-200 hover:bg-brand-50"
              >
                Servicos
              </Link>
            </section>

            <MarketplaceImportantNotice />

            <section className="mx-auto mb-10 max-w-5xl">
              <ListingPlansSection />
            </section>
          </>
        )}

        <div id="formulario-anuncio" className="mx-auto grid max-w-2xl gap-8 scroll-mt-28">
          <ListingSubmissionGate
            publicAccess={hasLimitedListingAccess}
            initialVehicleType={initialVehicleType}
          />
          <MarketplaceImportantNotice />
        </div>
      </Container>
    </>
  );
}
