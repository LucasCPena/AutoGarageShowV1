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
import ZoomableImage from "@/components/ZoomableImage";
import { getUserFromAuthToken } from "@/lib/auth-middleware";
import { AUTH_COOKIE_NAME } from "@/lib/auth-token";
import { db } from "@/lib/database";
import { formatCurrencyBRL } from "@/lib/format";
import { listingImageAlt } from "@/lib/image-alt";
import { sanitizeListingForViewer } from "@/lib/privacy";
import { listingJsonLd } from "@/lib/schema";
import { logServerError } from "@/lib/server-log";
import { normalizeAssetReference } from "@/lib/site-url";

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

export const dynamic = "force-dynamic";

async function findVisibleListing(slug: string) {
  try {
    const listing = await db.listings.findBySlug(slug);
    const isVisible =
      listing && (listing.status === "approved" || listing.status === "active");
    return isVisible ? listing : null;
  } catch (error) {
    logServerError("Erro ao buscar classificado por slug", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await findVisibleListing(params.slug);

  if (!listing) {
    return {
      title: "Anuncio",
      description: "Anuncio nao encontrado."
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
  const listingYearLabel = listingYear ? String(listingYear) : "Ano nao informado";
  const images = (safeListing.images?.length
    ? safeListing.images
    : ["/placeholders/car.svg"]
  ).map((image) => normalizeAssetReference(image) || "/placeholders/car.svg");

  const locationLabel = formatLocation(safeListing.city, safeListing.state);
  const subtitleParts = [
    locationLabel,
    listingYearLabel,
    formatCurrencyBRL(safeListing.price)
  ].filter(Boolean);

  return (
    <>
      <PageIntro title={safeListing.title} subtitle={subtitleParts.join(" • ")}>
        <Link
          href="/veiculos"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar
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
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <ZoomableImage
                src={images[0]}
                alt={listingImageAlt(safeListing.title, 1)}
                width={1200}
                height={800}
                className="h-80 w-full object-cover"
                priority
              />
            </div>

            <div>
              <ListingGallery images={images} title={safeListing.title} />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Descricao</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    {safeListing.description}
                  </p>
                </div>

                {null}
              </div>
            </section>
          </div>

          <aside className="grid gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-900">Detalhes</div>
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
                    {locationLabel || "Nao informado"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Preco</dt>
                  <dd className="mt-1 text-lg font-bold text-slate-900">
                    {formatCurrencyBRL(safeListing.price)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <CommentsSection listingId={safeListing.id} />
            </div>

            <ListingDetailSidebar listing={safeListing} />
          </aside>
        </div>
      </Container>
    </>
  );
}
