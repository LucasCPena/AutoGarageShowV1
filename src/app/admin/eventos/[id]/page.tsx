"use client";

import Link from "next/link";

import Container from "@/components/Container";
import EventEditForm from "@/components/EventEditForm";
import PageIntro from "@/components/PageIntro";

type Props = {
  params: { id: string };
};

export default function AdminEventEditPage({ params }: Props) {
  return (
    <>
      <PageIntro
        title="Editar evento"
        subtitle="Altere dados, recorrência, contato e status."
      >
        <Link
          href="/admin"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar ao admin
        </Link>
      </PageIntro>

      <Container className="py-10">
        <div className="mx-auto max-w-3xl">
          <EventEditForm eventId={params.id} />
        </div>
      </Container>
    </>
  );
}
