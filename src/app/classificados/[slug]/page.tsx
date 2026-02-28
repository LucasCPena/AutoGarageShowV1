import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import CommentsSection from "@/components/CommentsSection";
import ListingDetailSidebar from "@/components/ListingDetailSidebar";
import ListingCrudActions from "@/components/ListingCrudActions";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import ZoomableImage from "@/components/ZoomableImage";
import ListingGallery from "@/components/ListingGallery";
import { formatCurrencyBRL } from "@/lib/format";
import { db } from "@/lib/database";
import { listingImageAlt } from "@/lib/image-alt";
import { listingJsonLd } from "@/lib/schema";
import { normalizeAssetReference } from "@/lib/site-url";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

type Props = {
  params: {
    slug: string;
  };
};

type ListingMediaItem =
  | { type: "image"; src: string; alt: string }
  | { type: "youtube"; src: string }
  | { type: "upload"; src: string };

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
    console.error("Erro ao buscar classificado por slug:", error);
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

  const listingYear = listing.modelYear ?? listing.year ?? listing.manufactureYear;
  const listingYearLabel = listingYear ? String(listingYear) : "Ano não informado";
  const images = (listing.images?.length ? listing.images : ["/placeholders/car.svg"])
    .map((image) => normalizeAssetReference(image) || "/placeholders/car.svg");

  const mediaItems: ListingMediaItem[] = images.map((src, index) => ({
    type: "image",
    src,
    alt: listingImageAlt(listing.title, index + 1)
  }));

  const videoUrl = listing.specifications?.mediaVideoUrl?.trim();
  const videoType = listing.specifications?.mediaVideoType;
  const videoPosition = Math.max(
    0,
    Math.min(
      typeof listing.specifications?.mediaVideoPosition === "number"
        ? Math.floor(listing.specifications.mediaVideoPosition)
        : mediaItems.length,
      mediaItems.length
    )
  );

  if (videoUrl) {
    if (videoType === "youtube") {
      const embed = toYouTubeEmbedUrl(videoUrl);
      if (embed) {
        mediaItems.splice(videoPosition, 0, { type: "youtube", src: embed });
      }
    } else if (videoType === "upload") {
      const normalized = normalizeAssetReference(videoUrl);
      if (normalized) {
        mediaItems.splice(videoPosition, 0, { type: "upload", src: normalized });
      }
    }
  }

  const locationLabel = formatLocation(listing.city, listing.state);
  const subtitleParts = [
    locationLabel,
    listingYearLabel,
    formatCurrencyBRL(listing.price)
  ].filter(Boolean);

  return (
    <>
      <PageIntro
        title={listing.title}
        subtitle={subtitleParts.join(" • ")}
      >
        <Link
          href="/classificados"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
        <Link
          href="/classificados/anunciar"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Anunciar
        </Link>
      </PageIntro>

      <Container className="py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              listingJsonLd({
                ...listing,
                images,
                year: listingYear
              })
            )
          }}
        />

        <ListingCrudActions
          listingId={listing.id}
          editHref={`/classificados/gerenciar/${listing.id}`}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="grid gap-6 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {mediaItems[0]?.type === "image" ? (
                <ZoomableImage
                  src={mediaItems[0].src}
                  alt={mediaItems[0].alt}
                  width={1200}
                  height={800}
                  className="h-80 w-full object-cover"
                  priority
                />
              ) : mediaItems[0]?.type === "youtube" ? (
                <iframe
                  src={mediaItems[0].src}
                  title={`Video do anuncio: ${listing.title}`}
                  className="h-80 w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <video
                  src={mediaItems[0]?.src}
                  className="h-80 w-full bg-black object-contain"
                  controls
                  preload="metadata"
                  title={`Video do anuncio: ${listing.title}`}
                />
              )}
            </div>

              <div>
                {/* Client-side gallery with lightbox and video support */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <ListingGallery
                  images={images}
                  title={listing.title}
                  mediaVideoUrl={listing.specifications?.mediaVideoUrl ?? null}
                  mediaVideoType={listing.specifications?.mediaVideoType as any}
                  mediaVideoPosition={listing.specifications?.mediaVideoPosition}
                />
              </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Descrição</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    {listing.description}
                  </p>
                </div>

                {listing.featured ? (
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
                    Em destaque
                  </span>
                ) : null}
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
                    {listing.make} {listing.model}
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
                  <dt className="text-slate-500">Preço</dt>
                  <dd className="mt-1 text-lg font-bold text-slate-900">
                    {formatCurrencyBRL(listing.price)}
                  </dd>
                </div>
              </dl>

            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <CommentsSection listingId={listing.id} />
            </div>

            <ListingDetailSidebar listing={listing} />
          </aside>
        </div>
      </Container>
    </>
  );
}
