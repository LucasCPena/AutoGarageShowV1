import path from "node:path";

const DEFAULT_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function normalizeSegments(input: string) {
  const segments = input
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);

  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new Error("Caminho de upload invalido.");
    }
  }

  return segments;
}

export function getUploadsStorageDir() {
  const configured = process.env.UPLOADS_STORAGE_DIR?.trim();
  if (!configured) return DEFAULT_UPLOADS_DIR;
  return path.resolve(configured);
}

export function resolveUploadPath(relativePath: string) {
  const segments = normalizeSegments(relativePath);
  return path.join(getUploadsStorageDir(), ...segments);
}

export function resolveUploadPathFromUrlPath(urlPath: string) {
  const normalized = urlPath.replace(/^\/+/, "");
  if (!normalized.startsWith("uploads/")) {
    throw new Error("URL de upload invalida.");
  }

  return resolveUploadPath(normalized.slice("uploads/".length));
}

