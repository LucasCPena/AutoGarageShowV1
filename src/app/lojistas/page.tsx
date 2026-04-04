import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/Container";
import MarketplaceSectionNav from "@/components/MarketplaceSectionNav";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import SidebarBannerStack from "@/components/SidebarBannerStack";
import { db, type Listing } from "@/lib/database";
import { formatDateTime } from "@/lib/date";
import { formatCurrencyBRL } from "@/lib/format";
import { normalizeAssetReference } from "@/lib/site-url";
import { getUserDisplayName, isCompanyAccount, normalizeUserRecord } from "@/lib/userProfiles";

export const metadata: Metadata = {
  title: "Lojistas",
  description: "Vitrine publica das lojas e agencias anunciantes cadastradas na plataforma."
};

export const dynamic = "force-dynamic";

type DealerCard = {
  id: string;
  displayName: string;
  accountType: "company" | "agency";
  logoUrl?: string;
  listings: Listing[];
  carCount: number;
  motorcycleCount: number;
  latestCreatedAt?: string;
};

function getVisibleListings(listings: Listing[]) {
  return listings
    .filter((listing) => listing.status === "approved" || listing.status === "active")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default async function DealersPage() {
  let dealerCards: DealerCard[] = [];
  let loadError = false;

  try {
    const [users, listings] = await Promise.all([db.users.getAll(), db.listings.getAll()]);
    const visibleListings = getVisibleListings(listings);

    dealerCards = users
      .map((user) => normalizeUserRecord(user))
      .filter((user) => isCompanyAccount(user) && user.approvalStatus !== "pending")
      .map((user) => {
        const sellerListings = visibleListings.filter((listing) => listing.createdBy === user.id);
        const carCount = sellerListings.filter(
          (listing) => (listing.vehicleType ?? "car") !== "motorcycle"
        ).length;
        const motorcycleCount = sellerListings.length - carCount;
        const accountType: DealerCard["accountType"] =
          user.accountType === "agency" ? "agency" : "company";

        return {
          id: user.id,
          displayName: getUserDisplayName(user),
          accountType,
          logoUrl: normalizeAssetReference(user.logoUrl),
          listings: sellerListings,
          carCount,
          motorcycleCount,
          latestCreatedAt: sellerListings[0]?.createdAt
        };
      })
      .filter((dealer) => dealer.listings.length > 0)
      .sort((a, b) => {
        const byCount = b.listings.length - a.listings.length;
        if (byCount !== 0) return byCount;

        const aDate = a.latestCreatedAt ? new Date(a.latestCreatedAt).getTime() : 0;
        const bDate = b.latestCreatedAt ? new Date(b.latestCreatedAt).getTime() : 0;
        return bDate - aDate;
      });
  } catch (error) {
    loadError = true;
    console.error("Erro ao carregar lojistas:", error);
  }

  const totalListings = dealerCards.reduce((total, dealer) => total + dealer.listings.length, 0);
  const totalMotorcycles = dealerCards.reduce(
    (total, dealer) => total + dealer.motorcycleCount,
    0
  );

  return (
    <>
      <PageIntro
        title="Lojistas"
        subtitle="Explore as lojas e agencias com anuncios ativos publicados na plataforma."
      />

      <Container className="py-10">
        <div className="page-with-sidebar">
          <div>
            <MarketplaceSectionNav current="lojistas" />

            {loadError ? (
              <Notice title="Erro" variant="warning">
                Nao foi possivel carregar os lojistas agora.
              </Notice>
            ) : null}

            {!loadError ? (
              <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Lojas ativas
                  </div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{dealerCards.length}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Anuncios publicados
                  </div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{totalListings}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Motos no marketplace
                  </div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{totalMotorcycles}</div>
                </div>
              </section>
            ) : null}

            {!loadError && dealerCards.length === 0 ? (
              <Notice title="Sem lojistas" variant="info">
                Nenhuma loja com anuncios ativos foi encontrada no momento.
              </Notice>
            ) : null}

            <div className="grid gap-6">
              {dealerCards.map((dealer) => (
                <article
                  key={dealer.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      {dealer.logoUrl ? (
                        <img
                          src={dealer.logoUrl}
                          alt={dealer.displayName}
                          className="h-20 w-20 rounded-2xl border border-slate-200 bg-white p-2 object-contain"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
                          {dealer.displayName.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {dealer.accountType === "agency" ? "Agencia" : "Lojista"}
                        </div>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                          {dealer.displayName}
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                          Vitrine publica com todos os anuncios ativos desta loja.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {dealer.listings.length} anuncio(s)
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Carros: {dealer.carCount}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            Motos: {dealer.motorcycleCount}
                          </span>
                          {dealer.latestCreatedAt ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              Ultimo cadastro: {formatDateTime(dealer.latestCreatedAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/empresas/${dealer.id}`}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Ver loja
                    </Link>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {dealer.listings.slice(0, 3).map((listing) => (
                      <article
                        key={listing.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      >
                        <Link href={`/veiculos/${listing.slug}`} className="block">
                          <img
                            src={normalizeAssetReference(listing.images?.[0]) || "/placeholders/car.svg"}
                            alt={listing.title}
                            className="h-44 w-full object-cover"
                          />
                        </Link>

                        <div className="p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {formatDateTime(listing.createdAt) || "Data nao informada"}
                          </div>
                          <Link
                            href={`/veiculos/${listing.slug}`}
                            className="mt-2 block text-base font-semibold text-slate-900 hover:text-brand-800"
                          >
                            {listing.title}
                          </Link>
                          <div className="mt-1 text-sm text-slate-600">
                            {[listing.city && listing.state ? `${listing.city}/${listing.state}` : "", `${listing.make} ${listing.model}`]
                              .filter(Boolean)
                              .join(" | ")}
                          </div>
                          <div className="mt-3 text-lg font-bold text-slate-900">
                            {formatCurrencyBRL(listing.price)}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
