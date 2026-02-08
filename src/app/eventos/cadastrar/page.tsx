import type { Metadata } from "next";

import Container from "@/components/Container";
import EventSubmissionForm from "@/components/EventSubmissionForm";
import PageIntro from "@/components/PageIntro";

export const metadata: Metadata = {
  title: "Cadastrar evento",
  description: "Envie um evento de carros antigos para aprovacao."
};

export default function EventSubmitPage() {
  return (
    <>
      <PageIntro
        title="Cadastrar evento"
        subtitle="Envie um evento para aprovacao manual."
      />

      <Container className="py-10">
        <div className="mx-auto max-w-2xl">
          <EventSubmissionForm />
        </div>
      </Container>
    </>
  );
}

