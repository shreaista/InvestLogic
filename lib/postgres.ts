import "server-only";

import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Get PostgreSQL connection pool.
 * Uses: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSLMODE
 */
export function getPostgresPool(): Pool {
  if (!pool) {
    const host = process.env.DB_HOST || "localhost";
    const port = Number(process.env.DB_PORT) || 5432;
    const database = process.env.DB_NAME || "ipa";
    const user = process.env.DB_USER || "postgres";
    const password = process.env.DB_PASSWORD || "";
    const ssl = process.env.DB_SSLMODE === "require" ? { rejectUnauthorized: false } : false;

    console.log("[postgres] config:", { host, port, database, user, passwordLength: password.length });

    pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      ssl,
    });
  }
  return pool;
}
