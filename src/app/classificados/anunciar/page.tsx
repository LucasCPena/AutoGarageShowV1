import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import Container from "@/components/Container";
import ListingSubmissionGate from "@/components/ListingSubmissionGate";
import PageIntro from "@/components/PageIntro";
import { hasPublicListingPageAccess } from "@/lib/public-listing-access";

export const metadata: Metadata = {
  title: "Anunciar",
  description: "Cadastre gratuitamente um anuncio de veiculo antigo."
};

export default function ListingSubmitPage() {
  const hasLimitedListingAccess = hasPublicListingPageAccess(cookies());

  return (
    <>
      <PageIntro
        title="Anunciar veiculo"
        subtitle={
          hasLimitedListingAccess
            ? "Preencha os dados do carro e envie o anuncio. Esse acesso foi liberado somente para esta area."
            : "Primeiro validamos o anunciante. Depois liberamos os dados do veiculo e o envio das fotos."
        }
      />

      <Container className="py-10">
        {hasLimitedListingAccess ? null : (
          <div className="mx-auto mb-4 flex max-w-2xl justify-end">
            <Link href="/planos" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver planos</Link>
          </div>
        )}
        <div className="mx-auto max-w-2xl">
          <ListingSubmissionGate publicAccess={hasLimitedListingAccess} />
        </div>
      </Container>
    </>
  );
}
