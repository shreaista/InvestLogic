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
  try {
    const db = getDb();
    const rows = await db.select().from(tenantsTable);
    return rows;
  } catch (e) {
    console.warn("[db/tenants] listTenants failed", e);
    return [];
  }
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  try {
    const db = getDb();
    const rows = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.warn("[db/tenants] getTenantById failed", e);
    return null;
  }
}
