/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

function loadEnv() {
  const lockedEnvKeys = new Set(Object.keys(process.env));
  const candidates = [
    ".env",
    ".env.production",
    "BD.env",
    ".env.local",
    ".env.production.local"
  ];

  for (const filename of candidates) {
    const envPath = path.join(process.cwd(), filename);
    if (!fs.existsSync(envPath)) continue;
    const parsed = dotenv.parse(fs.readFileSync(envPath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (lockedEnvKeys.has(key)) continue;
      process.env[key] = value;
    }
  }
}

function masked(value) {
  if (!value) return "(vazio)";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function getColumnMap(rows) {
  return new Map(
    rows
      .map((row) => [
        String(row.Field || row.COLUMN_NAME || "").toLowerCase(),
        row
      ])
      .filter(([column]) => Boolean(column))
  );
}

function getColumnType(row) {
  return String(row?.Type || row?.COLUMN_TYPE || "").toLowerCase();
}

function checkEventsSchema(columnRows) {
  const columns = getColumnMap(columnRows);
  const problems = [];

  if (!columns.has("organizer_logo")) {
    problems.push("events.organizer_logo ausente; o codigo ja salva logo de organizador nessa coluna.");
  }

  for (const column of [
    "contact_document",
    "contact_phone",
    "contact_phone_secondary",
    "contact_email"
  ]) {
    const row = columns.get(column);
    const type = getColumnType(row);
    if (!row) {
      problems.push(`events.${column} ausente.`);
    } else if (!type.includes("text")) {
      problems.push(`events.${column} esta como ${type || "(tipo desconhecido)"}; use TEXT para campos criptografados.`);
    }
  }

  const contactDocument = columns.get("contact_document");
  if (contactDocument && String(contactDocument.Null || "").toUpperCase() === "YES") {
    problems.push("events.contact_document permite NULL; use TEXT NOT NULL.");
  }

  if (problems.length === 0) {
    console.log("[db:check] events schema OK para cadastro com campos criptografados.");
    return;
  }

  console.warn("[db:check] events schema incompativel com cadastro em producao:");
  for (const problem of problems) {
    console.warn(`- ${problem}`);
  }
}

async function main() {
  loadEnv();

  const host = process.env.MYSQL_HOST;
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  console.log("[db:check] Config atual:");
  console.log(`- host: ${host || "(vazio)"}`);
  console.log(`- port: ${Number.isFinite(port) ? port : "(invalido)"}`);
  console.log(`- user: ${user || "(vazio)"}`);
  console.log(`- password: ${masked(password || "")}`);
  console.log(`- database: ${database || "(vazio)"}`);

  if (!host || !user || !password || !database) {
    console.error("[db:check] Faltam variaveis obrigatorias.");
    process.exit(1);
  }

  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000
    });
    const [rows] = await conn.query("SELECT 1 AS ok");
    console.log("[db:check] Conexao OK:", rows[0]);
    try {
      const [countRows] = await conn.query("SELECT COUNT(*) AS total FROM events");
      const total =
        Array.isArray(countRows) && countRows[0] && "total" in countRows[0]
          ? Number(countRows[0].total)
          : 0;
      console.log(`[db:check] events total: ${total}`);

      const [sampleRows] = await conn.query(
        "SELECT id, title, status, start_at FROM events ORDER BY created_at DESC LIMIT 3"
      );
      if (Array.isArray(sampleRows) && sampleRows.length > 0) {
        console.log("[db:check] eventos (amostra):");
        console.table(sampleRows);
      } else {
        console.log("[db:check] eventos (amostra): tabela vazia.");
      }

      const [columnRows] = await conn.query("SHOW COLUMNS FROM events");
      if (Array.isArray(columnRows)) {
        checkEventsSchema(columnRows);
      }
    } catch (eventsError) {
      console.warn("[db:check] Nao foi possivel consultar tabela events.");
      if (eventsError && typeof eventsError === "object" && "code" in eventsError) {
        console.warn(`- code: ${String(eventsError.code)}`);
      }
      if (eventsError && typeof eventsError === "object" && "message" in eventsError) {
        console.warn(`- message: ${String(eventsError.message)}`);
      }
    }
    await conn.end();
  } catch (error) {
    console.error("[db:check] Conexao FALHOU.");
    if (error && typeof error === "object" && "code" in error) {
      console.error(`- code: ${String(error.code)}`);
    }
    if (error && typeof error === "object" && "message" in error) {
      console.error(`- message: ${String(error.message)}`);
    } else {
      console.error(String(error));
    }
    process.exit(1);
  }
}

main();
