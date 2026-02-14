const DEFAULT_SITE_URL = "https://www.autogarageshow.com.br";

function normalizeSiteUrl(url: string | undefined) {
  if (!url) return DEFAULT_SITE_URL;
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_SITE_URL;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export function toAbsoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}

export function toPublicAssetUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    return toAbsoluteUrl(trimmed);
  }

  return trimmed;
}

export function toPublicAssetUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toPublicAssetUrl(item))
    .filter((item): item is string => Boolean(item));
}
