import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import CommentsSection from "@/components/CommentsSection";
import Container from "@/components/Container";
import ListingCrudActions from "@/components/ListingCrudActions";
import ListingDetailSidebar from "@/components/ListingDetailSidebar";
import ListingGallery from "@/components/ListingGallery";
import PageIntro from "@/components/PageIntro";
import TrackMetric from "@/components/TrackMetric";
import { getUserFromAuthToken } from "@/lib/auth-middleware";
import { AUTH_COOKIE_NAME } from "@/lib/auth-token";
import { db, type Listing } from "@/lib/database";
import { formatDateTime } from "@/lib/date";
import { formatCurrencyBRL } from "@/lib/format";
import { listingImageAlt } from "@/lib/image-alt";
import { attachListingOwnerProfiles } from "@/lib/listingOwners";
import { sanitizeListingForViewer } from "@/lib/privacy";
import { listingJsonLd } from "@/lib/schema";
import { logServerError } from "@/lib/server-log";
import { normalizeAssetReference } from "@/lib/site-url";
import { isCompanyAccount } from "@/lib/userProfiles";

type Props = {
  params: {
    slug: string;
  };
};

function toMetaDescription(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}

function formatLocation(city?: string, state?: string) {
  const cityLabel = city?.trim() ?? "";
  const stateLabel = state?.trim() ?? "";

  if (cityLabel && stateLabel) return `${cityLabel}/${stateLabel}`;
  if (cityLabel) return cityLabel;
  if (stateLabel) return stateLabel;
  return "";
}

function isVisibleListing(listing: Listing | null | undefined): listing is Listing {
  return Boolean(listing && (listing.status === "approved" || listing.status === "active"));
}

function byCreatedAtDesc(a: Listing, b: Listing) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export const dynamic = "force-dynamic";

async function findVisibleListing(slug: string) {
  try {
    const listing = await db.listings.findBySlug(slug);
    if (!isVisibleListing(listing)) return null;

    const [listingWithOwner] = await attachListingOwnerProfiles([listing]);
    return listingWithOwner || null;
  } catch (error) {
    logServerError("Erro ao buscar classificado por slug", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await findVisibleListing(params.slug);

  if (!listing) {
    return {
      title: "Anúncio",
      description: "Anúncio não encontrado."
    };
  }

  const description = toMetaDescription(listing.description);

  return {
    title: listing.title,
    description,
    openGraph: {
      title: listing.title,
      description,
      type: "article"
    }
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const listing = await findVisibleListing(params.slug);

  if (!listing) {
    return notFound();
  }

  const user = await getUserFromAuthToken(cookies().get(AUTH_COOKIE_NAME)?.value ?? null);
  const safeListing = sanitizeListingForViewer(listing, user);

  const listingYear =
    safeListing.modelYear ?? safeListing.year ?? safeListing.manufactureYear;
  const listingYearLabel = listingYear ? String(listingYear) : "Ano não informado";
  const images = (safeListing.images?.length
    ? safeListing.images
    : ["/placeholders/car.svg"]
  ).map((image) => normalizeAssetReference(image) || "/placeholders/car.svg");

  const locationLabel = formatLocation(safeListing.city, safeListing.state);
  const publishedAtLabel = formatDateTime(safeListing.createdAt) || "Data não informada";
  const subtitleParts = [
    locationLabel,
    listingYearLabel,
    formatCurrencyBRL(safeListing.price)
  ].filter(Boolean);
  const sellerPageLabel =
    safeListing.ownerProfile?.accountType === "agency" ? "agência" : "anunciante";

  let companyListingCount = 0;
  let moreFromSeller: Listing[] = [];

  if (safeListing.ownerProfile && isCompanyAccount(safeListing.ownerProfile)) {
    const storeListings = await attachListingOwnerProfiles(
      await db.listings.findByUser(safeListing.createdBy)
    );

    const visibleStoreListings = storeListings
      .filter((item) => isVisibleListing(item))
      .sort(byCreatedAtDesc);

    companyListingCount = visibleStoreListings.length;
    moreFromSeller = visibleStoreListings
      .filter((item) => item.id !== safeListing.id)
      .slice(0, 6)
      .map((item) => sanitizeListingForViewer(item, user));
  }

  return (
    <>
      <PageIntro title={safeListing.title} subtitle={subtitleParts.join(" | ")}>
        <Link
          href="/classificados"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar aos classificados
        </Link>
      </PageIntro>

      <Container className="py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              listingJsonLd({
                ...safeListing,
                images,
                year: listingYear
              })
            )
          }}
        />

        <ListingCrudActions
          listingId={safeListing.id}
          editHref={`/veiculos/gerenciar/${safeListing.id}`}
        />

        <TrackMetric
          eventType="listing_view"
          entityType="listing"
          entityId={safeListing.id}
          ownerUserId={safeListing.createdBy}
          path={`/veiculos/${safeListing.slug}`}
          label={safeListing.title}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="grid gap-6 lg:col-span-2">
            <ListingGallery images={images} title={safeListing.title} />

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Descrição</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    {safeListing.description}
                  </p>
                </div>
              </div>
            </section>

            {moreFromSeller.length > 0 && safeListing.ownerProfile ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Mais anúncios deste {sellerPageLabel}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Veja outros veículos publicados por {safeListing.ownerProfile.displayName}.
                    </p>
                  </div>

                  <Link
                    href={`/empresas/${safeListing.ownerProfile.id}`}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ver página completa
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {moreFromSeller.map((sellerListing) => (
                    <article
                      key={sellerListing.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <Link href={`/veiculos/${sellerListing.slug}`} className="block">
                        <img
                          src={
                            normalizeAssetReference(sellerListing.images?.[0]) ||
                            "/placeholders/car.svg"
                          }
                          alt={listingImageAlt(sellerListing.title)}
                          className="h-44 w-full bg-slate-100 object-contain p-2"
                        />
                      </Link>

                      <div className="p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {formatDateTime(sellerListing.createdAt) || "Data não informada"}
                        </div>
                        <Link
                          href={`/veiculos/${sellerListing.slug}`}
                          className="mt-2 block text-base font-semibold text-slate-900 hover:text-brand-800"
                        >
                          {sellerListing.title}
                        </Link>
                        <div className="mt-1 text-sm text-slate-600">
                          {[formatLocation(sellerListing.city, sellerListing.state), `${sellerListing.make} ${sellerListing.model}`]
                            .filter(Boolean)
                            .join(" | ")}
                        </div>
                        <div className="mt-3 text-lg font-bold text-slate-900">
                          {formatCurrencyBRL(sellerListing.price)}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="grid gap-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Detalhes
              </div>
              <dl className="mt-4 grid gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Marca / Modelo</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {safeListing.make} {safeListing.model}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Ano</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{listingYearLabel}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Cidade / UF</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {locationLabel || "Não informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Publicado em</dt>
                  <dd className="mt-1 font-semibold text-slate-900">{publishedAtLabel}</dd>
                </div>
                {safeListing.ownerProfile ? (
                  <div>
                    <dt className="text-slate-500">
                      {safeListing.ownerProfile.accountType === "agency" ? "Agência" : "Anunciante"}
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {safeListing.ownerProfile.displayName}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-slate-500">Preço</dt>
                  <dd className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrencyBRL(safeListing.price)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <CommentsSection listingId={safeListing.id} />
            </div>

            <ListingDetailSidebar
              listing={safeListing}
              companyListingCount={companyListingCount}
            />
          </aside>
        </div>
      </Container>
    </>
  );
}
