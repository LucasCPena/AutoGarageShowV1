import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveUploadPath } from "@/lib/uploads-storage";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const PLACEHOLDER_BY_TYPE: Record<string, string> = {
  banner: "banner.svg",
  event: "event.svg",
  news: "news.svg",
  listing: "car.svg",
  site: "banner.svg"
};

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function getLegacyUploadsOrigin() {
  const raw =
    process.env.LEGACY_UPLOADS_BASE_URL ||
    process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ||
    "";

  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

async function readFileIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

async function readPlaceholderFor(relativePath: string) {
  const firstSegment = relativePath.split("/")[0]?.toLowerCase() || "";
  const fileName = PLACEHOLDER_BY_TYPE[firstSegment] || "event.svg";
  const placeholderPath = path.join(process.cwd(), "public", "placeholders", fileName);
  return readFileIfExists(placeholderPath);
}

async function fetchFromLegacyAndCache(relativePath: string, targetPath: string) {
  const legacyOrigin = getLegacyUploadsOrigin();
  if (!legacyOrigin) return null;

  const candidateUrls = [
    `${legacyOrigin}/uploads/${relativePath}`,
    `${legacyOrigin}/public/uploads/${relativePath}`
  ];

  for (const remoteUrl of candidateUrls) {
    const response = await fetch(remoteUrl, { cache: "no-store" });
    if (!response.ok) continue;

    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, bytes);
    return bytes;
  }

  return null;
}

async function readBundledUploadAndCache(relativePath: string, targetPath: string) {
  const bundledPath = path.join(process.cwd(), "public", "uploads", relativePath);
  const bundled = await readFileIfExists(bundledPath);
  if (!bundled) return null;

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, bundled);
  return bundled;
}

type Params = { path?: string[] };

export async function GET(_request: Request, { params }: { params: Params }) {
  const relativePath = (params.path || []).join("/");
  if (!relativePath) {
    return new Response("Not found", { status: 404 });
  }

  let filePath: string;
  try {
    filePath = resolveUploadPath(relativePath);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  let bytes = await readFileIfExists(filePath);
  if (!bytes) {
    try {
      bytes = await readBundledUploadAndCache(relativePath, filePath);
    } catch {
      bytes = null;
    }
  }

  if (!bytes) {
    try {
      bytes = await fetchFromLegacyAndCache(relativePath, filePath);
    } catch {
      bytes = null;
    }
  }

  if (!bytes) {
    const placeholder = await readPlaceholderFor(relativePath);
    if (!placeholder) return new Response("Not found", { status: 404 });
    return new Response(placeholder, {
      status: 200,
      headers: {
        "cache-control": "public, max-age=300",
        "content-type": "image/svg+xml"
      }
    });
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      "cache-control": CACHE_CONTROL,
      "content-type": getContentType(filePath)
    }
  });
}

export async function HEAD(request: Request, context: { params: Params }) {
  const response = await GET(request, context);
  return new Response(null, {
    status: response.status,
    headers: response.headers
  });
}
