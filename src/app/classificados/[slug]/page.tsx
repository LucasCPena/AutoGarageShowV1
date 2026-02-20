import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/Container";
import CommentsSection from "@/components/CommentsSection";
import ListingFeaturePanel from "@/components/ListingFeaturePanel";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { formatCurrencyBRL } from "@/lib/format";
import { db } from "@/lib/database";
import { listingJsonLd } from "@/lib/schema";
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

        <Notice title="Controle anti-fraude (planejado)" variant="info">
          Para publicar, o usuário precisa validar e-mail. Haverá limites por CPF/CNPJ
          e aprovação manual antes de gerar URL pública.
        </Notice>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="grid gap-6 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Image
                src={images[0]}
                alt={listing.title}
                width={1200}
                height={800}
                className="h-80 w-full object-cover"
                priority
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {images.slice(1).map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <Image
                    src={src}
                    alt={`${listing.title} - foto ${index + 2}`}
                    width={1200}
                    height={800}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
              ))}
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

              <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                No sistema final: imagens em WEBP com versões 480/960/1600 e zoom.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-900">Destaque</div>
              <p className="mt-2 text-sm text-slate-600">
                Aumente a visibilidade do anúncio.
              </p>

              <div className="mt-4">
                <ListingFeaturePanel listing={listing} amountLabel="R$ 15,00" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <CommentsSection listingId={listing.id} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-sm font-semibold text-slate-900">Contato</div>
              <div className="mt-3 grid gap-2 text-sm text-slate-700">
                {listing.contact?.phone ? (
                  <a
                    href={`tel:${listing.contact.phone}`}
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Telefone: {listing.contact.phone}
                  </a>
                ) : (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                    Telefone nao informado.
                  </div>
                )}

                {listing.contact?.email ? (
                  <a
                    href={`mailto:${listing.contact.email}`}
                    className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    E-mail: {listing.contact.email}
                  </a>
                ) : (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
                    E-mail nao informado.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}
