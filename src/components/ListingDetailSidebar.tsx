"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import Notice from "@/components/Notice";
import ListingMessageForm from "@/components/ListingMessageForm";
import ListingFeaturePanel from "@/components/ListingFeaturePanel";
import type { Listing } from "@/lib/database";
import { sendMetric } from "@/components/TrackMetric";
import { useAuth } from "@/lib/useAuth";

type Props = {
  listing: Listing;
  companyListingCount?: number;
};

function firstTwoNames(name?: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "Anunciante";
  return parts.slice(0, 2).join(" ");
}

export default function ListingDetailSidebar({ listing, companyListingCount = 0 }: Props) {
  const { user, token, isLoading } = useAuth();
  const [privateContact, setPrivateContact] = useState(listing.contact);
  const hasPrivateContact = Boolean(
    privateContact?.email || privateContact?.phone || privateContact?.name
  );

  useEffect(() => {
    setPrivateContact(listing.contact);
  }, [listing.contact]);

  useEffect(() => {
    if (!user) return;
    if (privateContact?.email || privateContact?.phone || privateContact?.name) return;

    fetch(`/api/listings/${listing.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
      credentials: "same-origin"
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Não foi possível carregar o contato.");
        }
        setPrivateContact(data?.listing?.contact || { name: "", email: "", phone: "" });
      })
      .catch(() => undefined);
  }, [listing.id, privateContact?.email, privateContact?.name, privateContact?.phone, token, user]);

  if (isLoading && !hasPrivateContact) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Carregando informações privadas...
      </div>
    );
  }

  if (!user && !hasPrivateContact) {
    return (
      <Notice title="Area para usuários logados" variant="info">
        Faça login para ver contato completo.
      </Notice>
    );
  }

  const ownerName = firstTwoNames(privateContact?.name);
  const phone = privateContact?.phone?.trim();
  const email = privateContact?.email?.trim();
  const companyLink =
    listing.ownerProfile &&
    (listing.ownerProfile.accountType === "company" ||
      listing.ownerProfile.accountType === "agency")
      ? `/empresas/${listing.ownerProfile.id}`
      : null;
  const sellerLabel = listing.ownerProfile?.accountType === "agency" ? "agência" : "anunciante";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold text-slate-900">Contato</div>
      <div className="mt-3 grid gap-2 text-sm text-slate-700">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          Responsavel: {ownerName}
        </div>

        {phone ? (
          <a
            href={`tel:${phone}`}
            onClick={() =>
              void sendMetric({
                eventType: "contact_click",
                entityType: "listing",
                entityId: listing.id,
                ownerUserId: listing.createdBy,
                path: `/veiculos/${listing.slug}`,
                label: `${listing.title} telefone`,
                metadata: {
                  contactType: "phone"
                }
              })
            }
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Telefone: {phone}
          </a>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
            Telefone não informado.
          </div>
        )}

        {email ? (
          <a
            href={`mailto:${email}`}
            onClick={() =>
              void sendMetric({
                eventType: "contact_click",
                entityType: "listing",
                entityId: listing.id,
                ownerUserId: listing.createdBy,
                path: `/veiculos/${listing.slug}`,
                label: `${listing.title} email`,
                metadata: {
                  contactType: "email"
                }
              })
            }
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            E-mail: {email}
          </a>
        ) : (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
            E-mail não informado.
          </div>
        )}
      </div>

      {companyLink ? (
        <Link
          href={companyLink}
          className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100"
        >
          {companyListingCount > 0
            ? `Ver todos os ${companyListingCount} anúncio(s) deste ${sellerLabel}`
            : `Ver todos os anúncios deste ${sellerLabel}`}
        </Link>
      ) : null}

      <ListingFeaturePanel listing={listing} />

      <ListingMessageForm listingId={listing.id} />
    </div>
  );
}
