import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import PageIntro from "@/components/PageIntro";
import SidebarBannerStack from "@/components/SidebarBannerStack";
import TrackMetric from "@/components/TrackMetric";
import { db } from "@/lib/database";
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
  const visibleListings = listings.filter(
    (listing) => listing.status === "approved" || listing.status === "active"
  );

  if (!isCompanyAccount(normalizedUser) && visibleListings.length === 0) {
    return notFound();
  }

  const displayName = getUserDisplayName(normalizedUser);
  const logo = normalizeAssetReference(normalizedUser.logoUrl);

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
                    className="h-20 w-20 rounded-2xl border border-slate-200 object-contain bg-white p-2"
                  />
                ) : null}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {normalizedUser.accountType === "agency" ? "Painel de agencia" : "Pagina da empresa"}
                  </div>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">{displayName}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Veja todos os veiculos anunciados por esta conta corporativa em um unico lugar.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleListings.map((listing) => (
                <article
                  key={listing.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <Link href={`/veiculos/${listing.slug}`} className="block">
                    <img
                      src={normalizeAssetReference(listing.images?.[0]) || "/placeholders/car.svg"}
                      alt={listing.title}
                      className="h-52 w-full object-cover"
                    />
                  </Link>
                  <div className="p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      {listing.vehicleType === "motorcycle" ? "Moto" : "Veiculo"}
                    </div>
                    <Link
                      href={`/veiculos/${listing.slug}`}
                      className="mt-2 block text-lg font-semibold text-slate-900 hover:text-brand-800"
                    >
                      {listing.title}
                    </Link>
                    <div className="mt-1 text-sm text-slate-600">
                      {listing.city}/{listing.state} • {listing.make} {listing.model}
                    </div>
                    <div className="mt-3 text-lg font-bold text-slate-900">
                      {formatCurrencyBRL(listing.price)}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}

