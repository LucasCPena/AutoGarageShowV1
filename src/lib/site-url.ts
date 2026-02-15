const DEFAULT_SITE_URL = "https://www.autogarageshow.com.br";
const LOCAL_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost", "::1", "[::1]"]);
const URL_WITH_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const HOST_PATH = /^[a-z0-9.-]+(?::\d+)?\/.+$/i;
const KNOWN_UPLOAD_TYPES = new Set(["listing", "event", "banner", "news", "site", "misc"]);
const BARE_FILENAME = /^[^/\\]+\.[a-z0-9]{2,5}$/i;
const IMAGE_DATA_URI = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i;

type AssetUploadType = "listing" | "event" | "banner" | "news" | "site" | "misc";

type PublicAssetOptions = {
  uploadType?: AssetUploadType;
};

function normalizeSiteUrl(url: string | undefined) {
  if (!url) return DEFAULT_SITE_URL;

  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_SITE_URL;

  const candidate = URL_WITH_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
      return DEFAULT_SITE_URL;
    }
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function normalizeOptionalOrigin(url: string | undefined) {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  const candidate = URL_WITH_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
}

function normalizeHostPath(value: string) {
  const [hostPort, ...rest] = value.split("/");
  if (!hostPort || rest.length === 0) return undefined;

  const hostname = hostPort.split(":")[0]?.toLowerCase() || "";
  const pathname = `/${rest.join("/")}`;
  if (!pathname || pathname === "/") return undefined;

  if (LOCAL_HOSTS.has(hostname)) {
    return pathname;
  }

  return `https://${hostPort}${pathname}`;
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
const uploadsBaseUrl = normalizeOptionalOrigin(
  process.env.NEXT_PUBLIC_UPLOADS_BASE_URL || process.env.UPLOADS_BASE_URL
);

function applyUploadsBase(pathname: string) {
  if (!uploadsBaseUrl) return pathname;
  if (!pathname.startsWith("/uploads/")) return pathname;
  return `${uploadsBaseUrl}${pathname}`;
}

export function normalizeAssetReference(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("data:")) {
    return IMAGE_DATA_URI.test(trimmed) ? trimmed : undefined;
  }

  if (trimmed.startsWith("blob:")) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}` || undefined;
      }
      return parsed.toString();
    } catch {
      return undefined;
    }
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return applyUploadsBase(trimmed);
  }

  const withoutDotSlash = trimmed.replace(/^\.\//, "");

  if (
    withoutDotSlash.startsWith("uploads/") ||
    withoutDotSlash.startsWith("placeholders/")
  ) {
    return applyUploadsBase(`/${withoutDotSlash}`);
  }

  if (HOST_PATH.test(withoutDotSlash)) {
    return normalizeHostPath(withoutDotSlash) || undefined;
  }

  return withoutDotSlash;
}

export function toAbsoluteUrl(path: string) {
  const normalized = normalizeAssetReference(path) ?? path;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const normalizedPath = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${siteUrl}${normalizedPath}`;
}

function joinUploadsPath(pathname: string) {
  return pathname.startsWith("/uploads/") ? pathname : `/uploads/${pathname}`;
}

function resolveUploadsPathFromRaw(
  rawValue: string,
  uploadType?: AssetUploadType
) {
  const trimmed = rawValue.trim().replace(/^\.\/+/, "");
  if (!trimmed) return undefined;

  if (trimmed.startsWith("/uploads/")) return trimmed;
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;

  const firstSegment = trimmed.split("/")[0]?.toLowerCase() || "";
  if (KNOWN_UPLOAD_TYPES.has(firstSegment) && trimmed.includes("/")) {
    return joinUploadsPath(trimmed);
  }

  if (uploadType && BARE_FILENAME.test(trimmed)) {
    return `/uploads/${uploadType}/${trimmed}`;
  }

  return undefined;
}

export function toPublicAssetUrl(value: unknown, options: PublicAssetOptions = {}) {
  if (typeof value !== "string") return normalizeAssetReference(value);

  const uploadResolved = resolveUploadsPathFromRaw(value, options.uploadType);
  if (uploadResolved) return applyUploadsBase(uploadResolved);

  return normalizeAssetReference(value);
}

export function toPublicAssetUrls(value: unknown, options: PublicAssetOptions = {}): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toPublicAssetUrl(item, options))
    .filter((item): item is string => Boolean(item));
}
