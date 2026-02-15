#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const dotenv = require("dotenv");

const rootDir = path.join(__dirname, "..");

function loadEnvFromFile(filename) {
  const filePath = path.join(rootDir, filename);
  if (!fs.existsSync(filePath)) return false;

  const parsed = dotenv.parse(fs.readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
  return true;
}

const loadedFiles = [
  ".env",
  ".env.production",
  ".env.local",
  ".env.production.local",
  "BD.env"
].filter((file) => loadEnvFromFile(file));

const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || "3000";

const nextBin = path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);

const child = spawn(
  process.execPath,
  [nextBin, "start", "-H", host, "-p", String(port)],
  {
    stdio: "inherit",
    shell: false,
    env: process.env
  }
);

if (loadedFiles.length > 0) {
  console.log(`[start-hostinger] env loaded from: ${loadedFiles.join(", ")}`);
}

console.log(
  `[start-hostinger] DB_PROVIDER=${process.env.DB_PROVIDER || "(undefined)"} MYSQL_HOST=${process.env.MYSQL_HOST || "(undefined)"} MYSQL_DATABASE=${process.env.MYSQL_DATABASE || "(undefined)"}`
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("[start-hostinger] Falha ao iniciar Next.js:", error);
  process.exit(1);
});
