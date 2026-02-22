import type { Metadata } from "next";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { db } from "@/lib/database";
import { eventImageAlt } from "@/lib/image-alt";
import { normalizeAssetReference } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Organizadores",
  description: "Vitrine de logos dos organizadores."
};

export const dynamic = "force-dynamic";

type Organizer = {
  id: string;
  logo: string;
  link?: string;
  createdAt: string;
  updatedAt: string;
};

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

export default async function OrganizersPage() {
  let organizers: Organizer[] = [];
  let loadError = false;

  try {
    organizers = await db.organizers.getAll();
    organizers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    loadError = true;
    console.error("Erro ao carregar organizadores:", error);
  }

  return (
    <>
      <PageIntro
        title="Organizadores"
        subtitle="Logos dos parceiros e organizadores cadastrados pela administracao."
      />

      <Container className="py-10">
        {loadError ? (
          <Notice title="Erro" variant="warning">
            Nao foi possivel carregar os organizadores agora.
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
                <div className="flex h-44 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6">
                  <img
                    src={logo}
                    alt={eventImageAlt("logo do organizador", index + 1)}
                    className="h-full w-full object-contain"
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
      </Container>
    </>
  );
}
