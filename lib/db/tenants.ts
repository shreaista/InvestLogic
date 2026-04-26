import "server-only";

import { eq } from "drizzle-orm";
import { getDb, tenants as tenantsTable } from "./index";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export async function listTenants(): Promise<Tenant[]> {
  const db = getDb();
  const rows = await db.select().from(tenantsTable);
  return rows;
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const db = getDb();
  const rows = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id)).limit(1);
  return rows[0] ?? null;
}
