import "server-only";
import { getPostgresPool } from "@/lib/postgres";
import type { Fund } from "@/lib/types";

/** Row shape from SELECT with AS aliases (never select bare id/name/code from funds). */
export interface FundsRow {
  id: string;
  name: string;
  code: string | null;
  tenant_id: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

const LIST_SQL = `
  SELECT
    fund_id AS id,
    fund_name AS name,
    fund_code AS code,
    tenant_id,
    status,
    created_at,
    updated_at
  FROM funds
  WHERE tenant_id = $1
  ORDER BY fund_name
`;

/** Fallback when updated_at is not present in DB. */
const LIST_SQL_NO_UPDATED = `
  SELECT
    fund_id AS id,
    fund_name AS name,
    fund_code AS code,
    tenant_id,
    status,
    created_at,
    created_at AS updated_at
  FROM funds
  WHERE tenant_id = $1
  ORDER BY fund_name
`;

const BY_ID_SQL = `
  SELECT
    fund_id AS id,
    fund_name AS name,
    fund_code AS code,
    tenant_id,
    status,
    created_at,
    updated_at
  FROM funds
  WHERE tenant_id = $1 AND fund_id = $2
  LIMIT 1
`;

const BY_ID_SQL_NO_UPDATED = `
  SELECT
    fund_id AS id,
    fund_name AS name,
    fund_code AS code,
    tenant_id,
    status,
    created_at,
    created_at AS updated_at
  FROM funds
  WHERE tenant_id = $1 AND fund_id = $2
  LIMIT 1
`;

function rowToFund(row: FundsRow): Fund {
  const ca =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at ?? "");
  const ua =
    row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : String(row.updated_at ?? ca);
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    name: String(row.name ?? ""),
    code: row.code != null && String(row.code) !== "" ? String(row.code) : undefined,
    status: (row.status?.toLowerCase() === "inactive" ? "inactive" : "active") as
      | "active"
      | "inactive",
    createdAt: ca,
    updatedAt: ua,
  };
}

/**
 * Get a single fund from PostgreSQL by fund_id.
 */
export async function getFundByIdPg(tenantId: string, fundId: string): Promise<Fund | null> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    let result;
    try {
      result = await client.query(BY_ID_SQL, [tenantId, fundId]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("updated_at") || msg.includes("42703")) {
        console.warn("[listFundsPg] getFundById retry without updated_at", e);
        result = await client.query(BY_ID_SQL_NO_UPDATED, [tenantId, fundId]);
      } else {
        throw e;
      }
    }
    const row = result.rows[0] as FundsRow | undefined;
    return row ? rowToFund(row) : null;
  } catch (e) {
    console.warn("[listFundsPg] getFundByIdPg failed", e);
    return null;
  } finally {
    client.release();
  }
}

/**
 * List funds from PostgreSQL for the given tenant.
 */
export async function listFundsPg(tenantId: string): Promise<Fund[]> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    let result;
    try {
      result = await client.query(LIST_SQL, [tenantId]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("updated_at") || msg.includes("42703")) {
        console.warn("[listFundsPg] list retry without updated_at", e);
        result = await client.query(LIST_SQL_NO_UPDATED, [tenantId]);
      } else {
        throw e;
      }
    }
    return (result.rows as FundsRow[]).map((row) => rowToFund(row));
  } catch (e) {
    console.warn("[listFundsPg] listFundsPg failed", e);
    return [];
  } finally {
    client.release();
  }
}
