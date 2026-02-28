import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/Container";
import ListingSubmissionForm from "@/components/ListingSubmissionForm";
import PageIntro from "@/components/PageIntro";

export const metadata: Metadata = {
  title: "Anunciar",
  description: "Cadastre gratuitamente um anuncio de veiculo antigo."
};

export default function ListingSubmitPage() {
  return (
    <>
      <PageIntro
        title="Anunciar veiculo"
        subtitle="Cadastro gratuito de classificado. Admin publica automaticamente; usuario comum passa por aprovacao."
      />

      <Container className="py-10">
        <div className="mx-auto mb-4 flex max-w-2xl justify-end">
          <Link href="/classificados/planos" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver planos</Link>
        </div>
        <div className="mx-auto max-w-2xl">
          <ListingSubmissionForm />
        </div>
      </Container>
    </>
  );
}
