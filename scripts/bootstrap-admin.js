/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

const PASSWORD_HASH_PREFIX = "scrypt:v1";

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

function getConfig() {
  const url = process.env.MYSQL_URL?.trim();
  if (url) {
    return { uri: url };
  }

  const host = process.env.MYSQL_HOST?.trim();
  const user = process.env.MYSQL_USER?.trim();
  const password = process.env.MYSQL_PASSWORD ?? "";
  const database = process.env.MYSQL_DATABASE?.trim();
  const port = Number(process.env.MYSQL_PORT || 3306);

  if (!host || !user || !database) {
    throw new Error(
      "Defina MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD e MYSQL_DATABASE em BD.env."
    );
  }

  return {
    host,
    user,
    password,
    database,
    port
  };
}

function hashPassword(password) {
  const normalized = String(password || "");
  if (!normalized) {
    throw new Error("Senha inválida.");
  }

  if (normalized.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
    return normalized;
  }

  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(normalized, salt, 64).toString("base64url");
  return `${PASSWORD_HASH_PREFIX}$${salt}$${hash}`;
}

function nowIso() {
  return new Date().toISOString();
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function printUsage() {
  console.log(`
Uso:
  node scripts/bootstrap-admin.js --email <email> --name <nome> --password <senha>

Exemplos:
  node scripts/bootstrap-admin.js --email lucascicalap@hotmail.com --name Lucas --password "Lucas@AGS2026"
  node scripts/bootstrap-admin.js --email eduardo@autogarageshow.local --name Eduardo --password "Eduardo@AGS2026"
`);
}

async function getUserColumns(connection) {
  const [rows] = await connection.query("SHOW COLUMNS FROM users");
  return new Set(
    Array.isArray(rows)
      ? rows.map((row) => String(row.Field || "").trim().toLowerCase()).filter(Boolean)
      : []
  );
}

function filterExistingColumns(columns, entries) {
  return entries.filter(([column]) => columns.has(column));
}

async function main() {
  loadEnv();

  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const email = String(args.email || "").trim().toLowerCase();
  const name = String(args.name || "").trim();
  const password = String(args.password || "");

  if (!email || !name || !password) {
    printUsage();
    throw new Error("Informe --email, --name e --password.");
  }

  if (password.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }

  const config = getConfig();
  const connection = config.uri
    ? await mysql.createConnection(config.uri)
    : await mysql.createConnection(config);

  try {
    const columns = await getUserColumns(connection);
    const [rows] = await connection.query(
      "SELECT id, email, role FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
      [email]
    );

    const existing = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const timestamp = nowIso();
    const passwordHash = hashPassword(password);

    if (existing && existing.id) {
      const updateEntries = filterExistingColumns(columns, [
        ["name", name],
        ["password", passwordHash],
        ["role", "admin"],
        ["account_type", "individual"],
        ["approval_status", "approved"],
        ["verification_status", "verified"],
        ["updated_at", timestamp]
      ]);

      const setClause = updateEntries.map(([column]) => `${column} = ?`).join(", ");
      const params = updateEntries.map(([, value]) => value);
      params.push(existing.id);

      await connection.query(`UPDATE users SET ${setClause} WHERE id = ?`, params);

      console.log(
        JSON.stringify(
          {
            action: "updated",
            email,
            id: existing.id,
            role: "admin"
          },
          null,
          2
        )
      );
      return;
    }

    const newUserId = crypto.randomUUID();
    const insertEntries = filterExistingColumns(columns, [
      ["id", newUserId],
      ["name", name],
      ["email", email],
      ["password", passwordHash],
      ["role", "admin"],
      ["account_type", "individual"],
      ["approval_status", "approved"],
      ["verification_status", "verified"],
      ["created_at", timestamp],
      ["updated_at", timestamp]
    ]);

    const columnList = insertEntries.map(([column]) => column).join(", ");
    const placeholders = insertEntries.map(() => "?").join(", ");
    const params = insertEntries.map(([, value]) => value);

    await connection.query(
      `INSERT INTO users (${columnList}) VALUES (${placeholders})`,
      params
    );

    console.log(
      JSON.stringify(
        {
          action: "created",
          email,
          id: newUserId,
          role: "admin"
        },
        null,
        2
      )
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[bootstrap-admin] Falhou.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
