import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import PageIntro from "@/components/PageIntro";
import SidebarBannerStack from "@/components/SidebarBannerStack";
import TrackMetric from "@/components/TrackMetric";
import { db } from "@/lib/database";
import { formatDateTime } from "@/lib/date";
import { formatCurrencyBRL } from "@/lib/format";
import { attachListingOwnerProfiles } from "@/lib/listingOwners";
import { normalizeAssetReference } from "@/lib/site-url";
import { getUserDisplayName, isCompanyAccount, normalizeUserRecord } from "@/lib/userProfiles";

type Props = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: Props) {
  const user = await db.users.findById(params.id);

  if (!user) {
    return notFound();
  }

  const normalizedUser = normalizeUserRecord(user);
  const listings = await attachListingOwnerProfiles(await db.listings.findByUser(user.id));
  const visibleListings = listings
    .filter((listing) => listing.status === "approved" || listing.status === "active")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!isCompanyAccount(normalizedUser) && visibleListings.length === 0) {
    return notFound();
  }

  const displayName = getUserDisplayName(normalizedUser);
  const logo = normalizeAssetReference(normalizedUser.logoUrl);
  const carCount = visibleListings.filter(
    (listing) => (listing.vehicleType ?? "car") !== "motorcycle"
  ).length;
  const motorcycleCount = visibleListings.length - carCount;

  return (
    <>
      <PageIntro
        title={displayName}
        subtitle={`${visibleListings.length} anuncio(s) publicados nesta pagina exclusiva.`}
      >
        <Link
          href="/veiculos"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Ver todos os veiculos
        </Link>
      </PageIntro>

      <Container className="py-10">
        <TrackMetric
          eventType="company_page_view"
          entityType="company"
          entityId={normalizedUser.id}
          ownerUserId={normalizedUser.id}
          path={`/empresas/${normalizedUser.id}`}
          label={displayName}
        />

        <div className="page-with-sidebar">
          <div className="grid gap-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center gap-4">
                {logo ? (
                  <img
                    src={logo}
                    alt={displayName}
                    className="h-20 w-20 rounded-2xl border border-slate-200 bg-white p-2 object-contain"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {normalizedUser.accountType === "agency" ? "Painel de agencia" : "Pagina da loja"}
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">{displayName}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Todos os anuncios desta loja ficam reunidos aqui em um unico endereco publico.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {visibleListings.length} anuncio(s) ativos
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Carros: {carCount}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Motos: {motorcycleCount}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Todos os anuncios da loja</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Lista completa com data e hora de cadastro de cada anuncio.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleListings.map((listing) => (
                  <article
                    key={listing.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <Link href={`/veiculos/${listing.slug}`} className="block">
                      <img
                        src={normalizeAssetReference(listing.images?.[0]) || "/placeholders/car.svg"}
                        alt={listing.title}
                        className="h-52 w-full object-cover"
                      />
                    </Link>

                    <div className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {formatDateTime(listing.createdAt) || "Data nao informada"}
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {listing.vehicleType === "motorcycle" ? "Moto" : "Veiculo"}
                        </span>
                      </div>

                      <Link
                        href={`/veiculos/${listing.slug}`}
                        className="mt-3 block text-lg font-semibold text-slate-900 hover:text-brand-800"
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

                {visibleListings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                    Esta loja ainda nao possui anuncios visiveis.
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
