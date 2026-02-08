import { dbFile } from "./database.file";
import { dbMysql } from "./database.mysql";

export * from "./database.types";

const useMysql =
  process.env.DB_PROVIDER === "mysql" ||
  Boolean(process.env.MYSQL_URL) ||
  Boolean(process.env.MYSQL_HOST);

const warnedFallbackOps = new Set<string>();
const strictMysqlAll =
  process.env.DB_PROVIDER === "mysql" &&
  process.env.DB_ALLOW_FALLBACK !== "true";
const strictMysqlPrefixes = ["dbMysql.users."];
const mysqlRequiredErrorCode = "MYSQL_REQUIRED_USERS";

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: unknown }).code ?? "").toUpperCase();
  }
  return "";
}

function isMysqlUnavailableError(error: unknown) {
  const code = getErrorCode(error);
  if (
    code === "ER_ACCESS_DENIED_ERROR" ||
    code === "ER_HOST_NOT_PRIVILEGED" ||
    code === "ER_BAD_DB_ERROR" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "PROTOCOL_CONNECTION_LOST"
  ) {
    return true;
  }

  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("access denied") ||
    message.includes("mysql nao configurado") ||
    message.includes("mysql não configurado") ||
    message.includes("connect econnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("connection lost")
  );
}

function warnFallback(path: string, error: unknown) {
  if (warnedFallbackOps.has(path)) return;
  warnedFallbackOps.add(path);
  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[db] MySQL indisponivel em ${path}${code ? ` (${code})` : ""}; usando dbFile. Motivo: ${message}`
  );
}

function requiresStrictMysql(path: string) {
  if (strictMysqlAll) return true;
  return strictMysqlPrefixes.some((prefix) => path.startsWith(prefix));
}

function throwMysqlRequiredError(path: string, cause: unknown): never {
  const error = new Error(
    `MySQL obrigatorio para operacao de autenticacao (${path}).`
  ) as Error & { code?: string; cause?: unknown };
  error.code = mysqlRequiredErrorCode;
  error.cause = cause;
  throw error;
}

export function isMysqlRequiredUsersError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && (error as { code?: unknown }).code === mysqlRequiredErrorCode) {
    return true;
  }
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("mysql obrigatorio para operacao de autenticacao");
}

function withMysqlFallback<T extends Record<string, any>>(
  mysqlTarget: T,
  fileTarget: Record<string, any>,
  path: string
): T {
  return new Proxy(mysqlTarget, {
    get(target, prop, receiver) {
      const mysqlValue = Reflect.get(target, prop, receiver);
      const fileValue = Reflect.get(fileTarget, prop);
      const propPath = `${path}.${String(prop)}`;

      if (typeof mysqlValue === "function" && typeof fileValue === "function") {
        const mysqlMethod = mysqlValue as (...args: unknown[]) => unknown;
        const fileMethod = fileValue as (...args: unknown[]) => unknown;
        return async (...args: unknown[]) => {
          try {
            return await mysqlMethod(...args);
          } catch (error) {
            if (!isMysqlUnavailableError(error)) {
              throw error;
            }
            if (requiresStrictMysql(propPath)) {
              throwMysqlRequiredError(propPath, error);
            }
            warnFallback(propPath, error);
            return await fileMethod(...args);
          }
        };
      }

      if (
        mysqlValue &&
        fileValue &&
        typeof mysqlValue === "object" &&
        typeof fileValue === "object"
      ) {
        return withMysqlFallback(mysqlValue, fileValue, propPath);
      }

      return mysqlValue;
    }
  }) as T;
}

const dbFileCompatible = dbFile as unknown as typeof dbMysql;

export const db = useMysql
  ? withMysqlFallback(dbMysql, dbFileCompatible, "dbMysql")
  : dbFile;
