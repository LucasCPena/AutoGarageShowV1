/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath, "utf8"));
    Object.assign(process.env, parsed);
  }
}

function masked(value) {
  if (!value) return "(vazio)";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
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
