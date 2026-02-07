import { dbFile } from "./database.file";
import { dbMysql } from "./database.mysql";

export * from "./database.types";

const useMysql =
  process.env.DB_PROVIDER === "mysql" ||
  Boolean(process.env.MYSQL_URL) ||
  Boolean(process.env.MYSQL_HOST);

export const db = useMysql ? dbMysql : dbFile;
