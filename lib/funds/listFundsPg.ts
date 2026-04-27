import "server-only";
import { getPostgresPool } from "@/lib/postgres";
import type { Fund } from "@/lib/types";

export interface FundsRow {
  fund_id: string;
  fund_name: string;
  fund_code: string | null;
  status: string;
  geography: string | null;
  stage_focus: string | null;
  ticket_size_min: number | null;
  ticket_size_max: number | null;
  created_at: string;
}

function rowToFund(row: FundsRow, tenantId: string): Fund {
  return {
    id: String(row.fund_id),
    tenantId,
    name: row.fund_name,
    code: row.fund_code ?? undefined,
    status: (row.status?.toLowerCase() === "inactive" ? "inactive" : "active") as "active" | "inactive",
    createdAt: row.created_at ?? "",
    updatedAt: row.created_at ?? "",
  };
}

/**
 * Get a single fund from PostgreSQL by fund_id.
 */
export async function getFundByIdPg(tenantId: string, fundId: string): Promise<Fund | null> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        fund_id,
        fund_name,
        fund_code,
        status,
        geography,
        stage_focus,
        ticket_size_min,
        ticket_size_max,
        created_at
       FROM funds 
       WHERE tenant_id = $1 AND fund_id = $2 
       LIMIT 1`,
      [tenantId, fundId]
    );
    const row = result.rows[0];
    return row ? rowToFund(row as FundsRow, tenantId) : null;
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
    const result = await client.query(
      `SELECT 
        fund_id,
        fund_name,
        fund_code,
        status,
        geography,
        stage_focus,
        ticket_size_min,
        ticket_size_max,
        created_at
       FROM funds 
       WHERE tenant_id = $1 
       ORDER BY fund_name`,
      [tenantId]
    );
    return result.rows.map((row) => rowToFund(row as FundsRow, tenantId));
  } catch (e) {
    console.warn("[listFundsPg] listFundsPg failed", e);
    return [];
  } finally {
    client.release();
  }
}
