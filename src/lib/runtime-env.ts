import fs from "node:fs";
import path from "node:path";

const RUNTIME_ENV_LOADED_FLAG = "__AGS_RUNTIME_ENV_LOADED__";

function stripInlineComment(value: string) {
  // Keep values like URLs and passwords unless the hash starts a comment.
  const hashIndex = value.indexOf("#");
  if (hashIndex <= 0) return value;
  const beforeHash = value.slice(hashIndex - 1, hashIndex);
  if (!/\s/.test(beforeHash)) return value;
  return value.slice(0, hashIndex).trimEnd();
}

function unquote(value: string) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
    return value.slice(1, -1);
  }
  return stripInlineComment(value);
}

function parseEnvFile(content: string) {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    if (!key) continue;

    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    result[key] = unquote(rawValue);
  }

  return result;
}

export function loadRuntimeEnvFiles() {
  const globalWithFlag = globalThis as Record<string, unknown>;
  if (globalWithFlag[RUNTIME_ENV_LOADED_FLAG]) return;
  globalWithFlag[RUNTIME_ENV_LOADED_FLAG] = true;

  const rootDir = process.cwd();
  const candidates = [
    ".env",
    ".env.production",
    "BD.env",
    ".env.local",
    ".env.production.local"
  ];

  for (const filename of candidates) {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) continue;

    try {
      const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined || process.env[key] === "") {
          process.env[key] = value;
        }
      }
    } catch {
      // Ignore malformed env files and continue with other candidates.
    }
  }
}

