import type { MetricEvent } from "@/lib/database";

type MetricSummaryOptions = {
  from?: string;
  to?: string;
  ownerUserId?: string;
};

function normalizeDate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : undefined;
}

export function filterMetricEvents(events: MetricEvent[], options: MetricSummaryOptions = {}) {
  const from = normalizeDate(options.from);
  const to = normalizeDate(options.to);

  return events.filter((event) => {
    if (options.ownerUserId && event.ownerUserId !== options.ownerUserId) return false;

    const time = normalizeDate(event.createdAt) ?? 0;
    if (typeof from === "number" && time < from) return false;
    if (typeof to === "number" && time > to) return false;
    return true;
  });
}

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

export function summarizeMetricEvents(events: MetricEvent[]) {
  const byEventType = countBy(events.map((event) => event.eventType));

  const byEntity = events.reduce<
    Array<{
      entityType: MetricEvent["entityType"];
      entityId?: string;
      label?: string;
      count: number;
    }>
  >((acc, event) => {
    const existing = acc.find(
      (item) =>
        item.entityType === event.entityType &&
        item.entityId === event.entityId &&
        item.label === event.label
    );

    if (existing) {
      existing.count += 1;
      return acc;
    }

    acc.push({
      entityType: event.entityType,
      entityId: event.entityId,
      label: event.label,
      count: 1
    });
    return acc;
  }, []);

  byEntity.sort((a, b) => b.count - a.count);

  return {
    totals: {
      visits: byEventType.page_view ?? 0,
      listingViews: byEventType.listing_view ?? 0,
      companyViews: byEventType.company_page_view ?? 0,
      clicks: (byEventType.banner_click ?? 0) + (byEventType.contact_click ?? 0),
      messages: byEventType.message_sent ?? 0,
      searches: byEventType.search ?? 0
    },
    byEventType,
    byEntity
  };
}

