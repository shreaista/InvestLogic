import "server-only";

import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Use local SQLite file; for production, switch to DATABASE_URL (PostgreSQL via drizzle)
const dbPath =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "ipa.db");

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const sqlite = new Database(dbPath);
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export * from "./schema";
