import type { Metadata } from "next";
import Link from "next/link";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import { db } from "@/lib/database";
import { eventImageAlt } from "@/lib/image-alt";
import { normalizeAssetReference } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Organizadores",
  description: "Logos e contatos dos organizadores de eventos cadastrados."
};

export const dynamic = "force-dynamic";

type Organizer = {
  name: string;
  logo: string;
  eventsCount: number;
  lastEventSlug: string;
};

function buildOrganizerKey(name: string, logo: string) {
  return `${name.trim().toLowerCase()}::${logo.trim().toLowerCase()}`;
}

export default async function OrganizersPage() {
  let organizers: Organizer[] = [];
  let loadError = false;

  try {
    const events = await db.events.getAll();
    const approved = events.filter((event) => event.status === "approved");
    const map = new Map<string, Organizer>();

    approved.forEach((event) => {
      const name = String(event.contactName || "").trim();
      const logo = normalizeAssetReference(event.organizerLogo || event.coverImage || event.images?.[0]);
      if (!name || !logo) return;

      const key = buildOrganizerKey(name, logo);
      const current = map.get(key);
      if (current) {
        current.eventsCount += 1;
        current.lastEventSlug = event.slug;
        return;
      }

      map.set(key, {
        name,
        logo,
        eventsCount: 1,
        lastEventSlug: event.slug
      });
    });

    organizers = Array.from(map.values()).sort((a, b) => b.eventsCount - a.eventsCount);
  } catch (error) {
    loadError = true;
    console.error("Erro ao carregar organizadores:", error);
  }

  return (
    <>
      <PageIntro
        title="Organizadores"
        subtitle="Vitrine de logos dos organizadores cadastrados nos eventos."
      />

      <Container className="py-10">
        {loadError ? (
          <Notice title="Erro" variant="warning">
            Nao foi possivel carregar os organizadores agora.
          </Notice>
        ) : null}

        {!loadError && organizers.length === 0 ? (
          <Notice title="Sem organizadores" variant="info">
            Cadastre eventos com logo do organizador para exibir esta vitrine.
          </Notice>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {organizers.map((organizer) => (
              <article
                key={`${organizer.name}-${organizer.logo}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-center bg-slate-50 p-6">
                  <img
                    src={organizer.logo}
                    alt={eventImageAlt(`logo do organizador ${organizer.name}`)}
                    className="h-24 w-24 rounded-lg border border-slate-200 object-contain bg-white p-2"
                  />
                </div>
                <div className="p-4">
                  <div className="text-sm font-semibold text-slate-900">{organizer.name}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    Eventos cadastrados: {organizer.eventsCount}
                  </div>
                  <Link
                    href={`/eventos/${organizer.lastEventSlug}`}
                    className="mt-3 inline-flex text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Ver ultimo evento
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
