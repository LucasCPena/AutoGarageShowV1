import type { Event } from "@/lib/database";

export function isPublicEventStatus(status: Event["status"]) {
  return status === "approved" || status === "completed";
}
