import type {
  AdvertiserMessage,
  Event,
  Listing,
  MetricEvent,
  User
} from "@/lib/database";
import { onlyDigits } from "@/lib/document";

type Viewer =
  | Pick<User, "id" | "role">
  | null
  | undefined;

function trimText(value: string | null | undefined) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function normalizePath(path: string) {
  const normalized = path.trim();
  if (!normalized) return "/";

  try {
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      const url = new URL(normalized);
      return `${url.pathname || "/"}${url.hash ? "" : ""}`;
    }
  } catch {
    return normalized.split("?")[0]?.split("#")[0] || "/";
  }

  return normalized.split("?")[0]?.split("#")[0] || "/";
}

function canManageOwnedEntity(viewer: Viewer, ownerUserId?: string) {
  if (!viewer) return false;
  if (viewer.role === "admin") return true;
  return Boolean(ownerUserId && viewer.id === ownerUserId);
}

export function maskDocument(value: string | null | undefined) {
  const digits = onlyDigits(value);
  if (!digits) return undefined;
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${"*".repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`;
}

export function maskPhone(value: string | null | undefined) {
  const digits = onlyDigits(value);
  if (!digits) return undefined;
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${"*".repeat(Math.max(digits.length - 4, 0))}${digits.slice(-4)}`;
}

export function maskEmail(value: string | null | undefined) {
  const normalized = trimText(value);
  if (!normalized) return undefined;

  const [localPart, domainPart] = normalized.split("@");
  if (!localPart || !domainPart) return undefined;

  const visibleLocal =
    localPart.length <= 2
      ? `${localPart[0] || "*"}*`
      : `${localPart.slice(0, 2)}***`;

  const domainSegments = domainPart.split(".");
  const firstSegment = domainSegments[0] || "";
  const visibleDomain = firstSegment.length <= 2 ? `${firstSegment[0] || "*"}*` : `${firstSegment.slice(0, 2)}***`;

  return `${visibleLocal}@${visibleDomain}${domainSegments.length > 1 ? `.${domainSegments.slice(1).join(".")}` : ""}`;
}

export function sanitizeUserForSession(user: User) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function sanitizeUserForAdminList(user: User) {
  const safeUser = sanitizeUserForSession(user);
  return {
    ...safeUser,
    document: maskDocument(user.document),
    phone: maskPhone(user.phone)
  };
}

export function sanitizeListingForViewer(listing: Listing, viewer: Viewer) {
  const canViewContact = Boolean(viewer);
  const canViewDocument = canManageOwnedEntity(viewer, listing.createdBy);

  return {
    ...listing,
    document: canViewDocument ? listing.document : "",
    contact: canViewContact
      ? listing.contact
      : {
          name: "",
          email: "",
          phone: ""
        }
  };
}

export function sanitizeEventForViewer(event: Event, viewer: Viewer) {
  return {
    ...event,
    contactDocument: canManageOwnedEntity(viewer, event.createdBy)
      ? event.contactDocument
      : undefined
  };
}

export function sanitizeAdvertiserMessageForViewer(
  message: AdvertiserMessage,
  viewer: Viewer
) {
  if (
    !viewer ||
    viewer.role === "admin" ||
    viewer.id === message.recipientUserId ||
    viewer.id === message.senderUserId
  ) {
    return message;
  }

  return {
    ...message,
    senderEmail: maskEmail(message.senderEmail) || "",
    senderPhone: maskPhone(message.senderPhone),
    message: ""
  };
}

export function sanitizeMetricPath(path: string) {
  return normalizePath(path).slice(0, 255);
}

export function sanitizeMetricLabel(
  label: string | null | undefined,
  eventType?: MetricEvent["eventType"]
) {
  const normalized = trimText(label);
  if (!normalized) return undefined;
  if (eventType === "search") {
    return "Busca interna";
  }
  return normalized.replace(/\s+/g, " ").slice(0, 120);
}

export function sanitizeMetricMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return undefined;

  const sanitizedEntries: Array<readonly [string, string | number | boolean]> = [];

  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)
    .filter(([entryKey]) => {
      const normalizedKey = entryKey.trim().toLowerCase();
      if (normalizedKey === "queryfingerprint") {
        return true;
      }
      return !/(email|phone|document|cpf|cnpj|(^query$)|message|password|token)/i.test(
        normalizedKey
      );
    })
    .slice(0, 10)) {
    if (typeof value === "boolean") {
      sanitizedEntries.push([key, value]);
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      sanitizedEntries.push([key, value]);
      continue;
    }

    if (typeof value === "string") {
      sanitizedEntries.push([key, value.trim().slice(0, 120)]);
    }
  }

  if (sanitizedEntries.length === 0) return undefined;
  return Object.fromEntries(sanitizedEntries);
}
