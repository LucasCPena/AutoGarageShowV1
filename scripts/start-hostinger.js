#!/usr/bin/env node

const path = require("node:path");
const { spawn } = require("node:child_process");

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
