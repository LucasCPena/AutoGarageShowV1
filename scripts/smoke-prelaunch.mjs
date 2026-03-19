#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const port = process.env.PORT || "3012";
const base = process.env.BASE_URL || `http://127.0.0.1:${port}`;
const shouldStartServer = process.env.SKIP_SERVER !== "1";
const results = [];
const prelaunchCopy = "portal de carros antigos do Brasil";
const headerMarker = "sticky top-0 z-50";

function addResult(test, ok, status, detail) {
  results.push({ test, ok, status, detail });
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return "";
  return setCookieHeader.split(";")[0] || "";
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    redirect: "manual",
    ...options
  });

  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }

  let json = null;
  if (bodyText) {
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = null;
    }
  }

  return { response, bodyText, json };
}

async function waitForServer() {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) {
        return;
      }
    } catch {
      // server still starting
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Servidor nao respondeu em ${base}`);
}

function startServer() {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", port],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DB_PROVIDER: process.env.DB_PROVIDER || "file"
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  return child;
}

async function stopServer(child) {
  if (!child || child.killed) return;

  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.kill();
    setTimeout(resolve, 3000);
  });
}

async function run() {
  let server = null;

  try {
    if (shouldStartServer) {
      server = startServer();
      await waitForServer();
    }

    const guestHome = await request("/");
    addResult(
      "guest_home_prelaunch",
      guestHome.response.status === 200 &&
        guestHome.bodyText.includes(prelaunchCopy) &&
        guestHome.bodyText.includes("Entrar") &&
        !guestHome.bodyText.includes(headerMarker),
      guestHome.response.status,
      "Visitante ve tela de pre-lancamento na home"
    );

    const guestEvents = await request("/eventos");
    addResult(
      "guest_internal_route_prelaunch",
      guestEvents.response.status === 200 &&
        guestEvents.bodyText.includes(prelaunchCopy) &&
        guestEvents.bodyText.includes("Entrar") &&
        !guestEvents.bodyText.includes(headerMarker),
      guestEvents.response.status,
      "Visitante nao acessa conteudo interno"
    );

    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@teste.com",
        password: "admin123"
      })
    });

    const authCookie = extractCookie(login.response.headers.get("set-cookie"));
    addResult(
      "login_sets_auth_cookie",
      login.response.status === 200 &&
        authCookie.startsWith("ags_auth=") &&
        login.json?.user?.email === "admin@teste.com",
      login.response.status,
      authCookie ? "Cookie de sessao emitido" : "Cookie ausente"
    );

    const meWithCookie = await request("/api/auth/me", {
      headers: {
        Cookie: authCookie
      }
    });
    addResult(
      "cookie_auth_allows_me",
      meWithCookie.response.status === 200 &&
        meWithCookie.json?.user?.email === "admin@teste.com",
      meWithCookie.response.status,
      "Sessao validada so com cookie"
    );

    const authEvents = await request("/eventos", {
      headers: {
        Cookie: authCookie
      }
    });
    addResult(
      "logged_user_accesses_site_normally",
      authEvents.response.status === 200 &&
        authEvents.bodyText.includes(headerMarker) &&
        !authEvents.bodyText.includes(prelaunchCopy),
      authEvents.response.status,
      "Conteudo interno liberado para autenticado"
    );

    const logout = await request("/api/auth/logout", {
      method: "POST",
      headers: {
        Cookie: authCookie
      }
    });

    const clearedCookie = extractCookie(logout.response.headers.get("set-cookie")) || "ags_auth=";
    addResult(
      "logout_clears_cookie",
      logout.response.status === 200 && clearedCookie.startsWith("ags_auth="),
      logout.response.status,
      clearedCookie || "Cookie limpo"
    );

    const guestAfterLogout = await request("/eventos", {
      headers: {
        Cookie: clearedCookie
      }
    });
    addResult(
      "logout_returns_to_prelaunch",
      guestAfterLogout.response.status === 200 &&
        guestAfterLogout.bodyText.includes(prelaunchCopy) &&
        guestAfterLogout.bodyText.includes("Entrar") &&
        !guestAfterLogout.bodyText.includes(headerMarker),
      guestAfterLogout.response.status,
      "Area interna voltou a ficar bloqueada"
    );
  } finally {
    await stopServer(server);
  }

  for (const result of results) {
    console.log(`[${result.status}] ${result.test} => ${result.ok} :: ${result.detail}`);
  }

  const failures = results.filter((result) => !result.ok);
  console.log(`TOTAL=${results.length} FAIL=${failures.length}`);

  if (failures.length > 0) {
    for (const failure of failures) {
      console.log(`FAIL: ${failure.test} [status=${failure.status}] ${failure.detail}`);
    }
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("Smoke prelaunch failed:", error);
  process.exit(1);
});
