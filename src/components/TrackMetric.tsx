"use client";

import { useEffect } from "react";

type Props = {
  eventType:
    | "page_view"
    | "listing_view"
    | "company_page_view"
    | "banner_click"
    | "contact_click"
    | "message_sent"
    | "search";
  entityType: "page" | "listing" | "company" | "banner" | "search";
  path: string;
  entityId?: string;
  ownerUserId?: string;
  label?: string;
};

export function sendMetric(payload: Props & { metadata?: Record<string, string | number | boolean> }) {
  return fetch("/api/metrics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => undefined);
}

export default function TrackMetric(props: Props) {
  useEffect(() => {
    void sendMetric(props);
  }, [props]);

  return null;
}

