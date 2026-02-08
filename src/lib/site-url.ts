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
