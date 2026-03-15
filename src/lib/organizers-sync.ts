import { db, type Event, type Organizer } from "@/lib/database";

function normalizeOrganizerName(value: string | undefined | null) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeOrganizerLink(value: string | undefined | null) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return undefined;
}

function buildOrganizerAlt(name: string) {
  return `Logo do organizador ${name}`;
}

function buildOrganizerFromEvent(event: Event): Organizer | null {
  const name = String(event.contactName || "").trim();
  const logo = String(event.organizerLogo || "").trim();
  if (!name || !logo) return null;

  return {
    id: `event-${event.id}`,
    name,
    logo,
    altText: buildOrganizerAlt(name),
    bannerTop: undefined,
    link: normalizeOrganizerLink(event.websiteUrl),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

export function mergeOrganizersWithEventLogos(organizers: Organizer[], events: Event[]) {
  const merged = new Map<string, Organizer>();

  organizers.forEach((organizer) => {
    const key = normalizeOrganizerName(organizer.name);
    if (!key) return;
    merged.set(key, organizer);
  });

  events
    .filter((event) => event.status === "approved" || event.status === "completed")
    .map(buildOrganizerFromEvent)
    .filter((organizer): organizer is Organizer => Boolean(organizer))
    .forEach((organizerFromEvent) => {
      const key = normalizeOrganizerName(organizerFromEvent.name);
      if (!key) return;

      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, organizerFromEvent);
        return;
      }

      merged.set(key, {
        ...organizerFromEvent,
        ...existing,
        logo: existing.logo || organizerFromEvent.logo,
        altText: existing.altText || organizerFromEvent.altText,
        bannerTop: existing.bannerTop,
        link: existing.link || organizerFromEvent.link,
        createdAt: existing.createdAt || organizerFromEvent.createdAt,
        updatedAt: existing.updatedAt || organizerFromEvent.updatedAt
      });
    });

  return Array.from(merged.values());
}

export async function syncOrganizerFromEvent(event: Event) {
  const organizerFromEvent = buildOrganizerFromEvent(event);
  if (!organizerFromEvent) return;

  try {
    const allOrganizers = await db.organizers.getAll();
    const organizerKey = normalizeOrganizerName(organizerFromEvent.name);
    const existing = allOrganizers.find(
      (organizer) => normalizeOrganizerName(organizer.name) === organizerKey
    );

    if (!existing) {
      return;
    }

    await db.organizers.update(existing.id, {
      name: existing.name || organizerFromEvent.name,
      logo: existing.logo,
      altText: existing.altText || organizerFromEvent.altText,
      bannerTop: existing.bannerTop,
      link: existing.link || organizerFromEvent.link
    });
  } catch (error) {
    console.error("Erro ao sincronizar organizador a partir do evento:", error);
  }
}
