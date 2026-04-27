import "server-only";

import { getPostgresPool } from "@/lib/postgres";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(r: Record<string, unknown>): Tenant {
  const id = String(r.id ?? r.tenant_id ?? "");
  const name = String(r.name ?? r.tenant_name ?? "");
  const rawSlug = r.slug ?? r.tenant_code;
  const slug =
    rawSlug != null && String(rawSlug).trim() !== ""
      ? String(rawSlug)
      : name
        ? name.toLowerCase().replace(/\s+/g, "-")
        : id;
  const ca = r.created_at;
  const ua = r.updated_at;
  const createdAt =
    ca instanceof Date ? ca.toISOString() : ca != null ? String(ca) : new Date().toISOString();
  const updatedAt =
    ua instanceof Date ? ua.toISOString() : ua != null ? String(ua) : createdAt;
  return {
    id,
    name,
    slug: slug || id,
    status: r.status != null ? String(r.status) : undefined,
    createdAt,
    updatedAt,
  };
}

/**
 * List tenants. Uses Azure-style columns (tenant_id, tenant_name, tenant_code) when available,
 * otherwise legacy (id, name, slug).
 */
export async function listTenants(): Promise<Tenant[]> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    try {
      const r = await client.query(`
        SELECT
          tenant_id AS id,
          tenant_name AS name,
          tenant_code AS slug,
          created_at,
          updated_at
        FROM tenants
        ORDER BY tenant_name NULLS LAST, tenant_id
      `);
      return (r.rows as Record<string, unknown>[]).map(mapRow);
    } catch (e) {
      console.warn("[db/tenants] Azure-style list failed, trying legacy", e);
    }
    try {
      const r2 = await client.query(`
        SELECT id, name, slug, created_at, updated_at
        FROM tenants
        ORDER BY name NULLS LAST, id
      `);
      return (r2.rows as Record<string, unknown>[]).map(mapRow);
    } catch (e2) {
      console.warn("[db/tenants] listTenants failed", e2);
      return [];
    }
  } finally {
    client.release();
  }
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    try {
      const r = await client.query(
        `SELECT
          tenant_id AS id,
          tenant_name AS name,
          tenant_code AS slug,
          created_at,
          updated_at
         FROM tenants
         WHERE tenant_id = $1
         LIMIT 1`,
        [id]
      );
      if (r.rows[0]) return mapRow(r.rows[0] as Record<string, unknown>);
    } catch (e) {
      console.warn("[db/tenants] getTenantById Azure-style failed, trying legacy", e);
    }
    try {
      const r2 = await client.query(
        `SELECT id, name, slug, created_at, updated_at FROM tenants WHERE id = $1 LIMIT 1`,
        [id]
      );
      return r2.rows[0] ? mapRow(r2.rows[0] as Record<string, unknown>) : null;
    } catch (e) {
      console.warn("[db/tenants] getTenantById failed", e);
      return null;
    }
  } finally {
    client.release();
  }
}
