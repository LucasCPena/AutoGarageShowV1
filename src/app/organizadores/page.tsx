import type { Metadata } from "next";

import Container from "@/components/Container";
import HeroSlider from "@/components/HeroSlider";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import SidebarBannerStack from "@/components/SidebarBannerStack";
import { db, type Banner, type Organizer } from "@/lib/database";
import { normalizeAssetReference } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Organizadores e Clubes",
  description: "Vitrine de logos dos organizadores e clubes parceiros."
};

export const dynamic = "force-dynamic";

const ORGANIZERS_BANNER_ASPECT_RATIO = 3.5;

function normalizeOrganizerLink(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return undefined;
}

function isBannerActiveNow(banner: Banner) {
  const now = Date.now();
  const start = new Date(banner.startDate).getTime();
  const end = banner.endDate ? new Date(banner.endDate).getTime() : Number.POSITIVE_INFINITY;

  return banner.status === "active" && now >= start && now <= end;
}

export default async function OrganizersPage() {
  let organizers: Organizer[] = [];
  let managedBanners: Banner[] = [];
  let loadError = false;

  try {
    organizers = await db.organizers.getAll();
    organizers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    loadError = true;
    console.error("Erro ao carregar organizadores:", error);
  }

  try {
    managedBanners = await db.banners.findBySection("organizers");
  } catch (error) {
    console.error("Erro ao carregar banner de organizadores:", error);
  }

  const bannerOrganizer = organizers.find((organizer) =>
    Boolean(normalizeAssetReference(organizer.bannerTop))
  );
  const organizerBanner = normalizeAssetReference(bannerOrganizer?.bannerTop);
  const hasManagedBanner = managedBanners.some(isBannerActiveNow);

  return (
    <>
      <PageIntro
        title="Organizadores e Clubes"
        subtitle="Logos dos parceiros, organizadores e clubes cadastrados pela administracao."
      />

      <Container className="py-10">
        {hasManagedBanner ? (
          <section id="organizadores-banner" className="mb-8">
            <HeroSlider section="organizers" aspectRatio={ORGANIZERS_BANNER_ASPECT_RATIO} />
          </section>
        ) : organizerBanner ? (
          <section
            id="organizadores-banner"
            className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
          >
            <div
              className="w-full bg-slate-50 p-2"
              style={{ aspectRatio: ORGANIZERS_BANNER_ASPECT_RATIO }}
            >
              <img
                src={organizerBanner}
                alt="Banner dos organizadores e clubes"
                className="h-full w-full object-contain"
              />
            </div>
          </section>
        ) : null}

        <div className="page-with-sidebar">
          <div>
            {loadError ? (
              <Notice title="Erro" variant="warning">
                Não foi possível carregar os organizadores agora.
              </Notice>
            ) : null}

            {!loadError && organizers.length === 0 ? (
              <Notice title="Sem organizadores" variant="info">
                Nenhum organizador cadastrado no momento.
              </Notice>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {organizers.map((organizer, index) => {
                  const logo = normalizeAssetReference(organizer.logo);
                  if (!logo) return null;

                  const href = normalizeOrganizerLink(organizer.link);
                  const card = (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6">
                      <img
                        src={logo}
                        alt={organizer.altText?.trim() || organizer.name?.trim() || `Organizador ${index + 1}`}
                        className="max-h-20 w-auto max-w-[72%] object-contain"
                      />
                    </div>
                  );

                  if (!href) {
                    return (
                      <article key={organizer.id}>
                        {card}
                      </article>
                    );
                  }

                  const external = !href.startsWith("/");

                  return (
                    <article key={organizer.id}>
                      <a
                        href={href}
                        className="block transition hover:scale-[1.01]"
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer nofollow" : undefined}
                      >
                        {card}
                      </a>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <SidebarBannerStack />
        </div>
      </Container>
    </>
  );
}
