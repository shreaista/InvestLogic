import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { getPostgresPool } from "../postgres";

export const db = drizzle(getPostgresPool(), { schema });

export function getDb() {
  return db;
}

export * from "./schema";
