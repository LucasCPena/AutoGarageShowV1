"use client";

import Notice from "@/components/Notice";
import ListingFeaturePanel from "@/components/ListingFeaturePanel";
import type { Listing } from "@/lib/database";
import { useAuth } from "@/lib/useAuth";

type Props = {
  listing: Listing;
};

function firstTwoNames(name?: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "Anunciante";
  return parts.slice(0, 2).join(" ");
}

export default function ListingDetailSidebar({ listing }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Carregando informacoes privadas...
      </div>
    );
  }

  if (!user) {
    return (
      <Notice title="Area para usuarios logados" variant="info">
        Faca login para ver contato completo e opcao de destaque.
      </Notice>
    );
  }

  const ownerName = firstTwoNames(listing.contact?.name);
  const phone = listing.contact?.phone?.trim();
  const email = listing.contact?.email?.trim();

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-900">Destaque</div>
        <p className="mt-2 text-sm text-slate-600">
          Aumente a visibilidade do anuncio.
        </p>

        <div className="mt-4">
          <ListingFeaturePanel listing={listing} amountLabel="R$ 15,00" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-900">Contato</div>
        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            Responsavel: {ownerName}
          </div>

          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Telefone: {phone}
            </a>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
              Telefone nao informado.
            </div>
          )}

          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              E-mail: {email}
            </a>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
              E-mail nao informado.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
