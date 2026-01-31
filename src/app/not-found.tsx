import Link from "next/link";

import Container from "@/components/Container";

export default function NotFound() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Página não encontrada
        </h1>
        <p className="mt-3 text-slate-600">
          A URL pode estar incorreta ou o conteúdo pode não estar disponível.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Voltar para a Home
          </Link>
          <Link
            href="/eventos"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver calendário
          </Link>
        </div>
      </div>
    </Container>
  );
}
