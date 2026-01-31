import type { Metadata } from "next";

import Container from "@/components/Container";
import ListingSubmissionForm from "@/components/ListingSubmissionForm";
import PageIntro from "@/components/PageIntro";

export const metadata: Metadata = {
  title: "Anunciar",
  description:
    "Cadastre gratuitamente um anúncio (10+ anos) para aprovação. Protótipo de formulário (apenas front-end)."
};

export default function ListingSubmitPage() {
  return (
    <>
      <PageIntro
        title="Anunciar veículo"
        subtitle="Cadastro gratuito com aprovação manual. Protótipo (sem backend)."
      />

      <Container className="py-10">
        <div className="mx-auto max-w-2xl">
          <ListingSubmissionForm />
        </div>
      </Container>
    </>
  );
}
