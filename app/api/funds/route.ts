import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/postgres";
import { requireSession, requireUserRole, jsonError } from "@/lib/authz";
import { getActiveTenantId } from "@/lib/tenantContext";

const FALLBACK_TENANT_ID = "tenant_ipa_001";

/**
 * GET /api/funds
 * Returns funds for the active tenant from PostgreSQL.
 */
export async function GET() {
  try {
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
        [await getActiveTenantId() ?? FALLBACK_TENANT_ID]
      );

      const funds = result.rows.map((row) => ({
        fund_id: row.fund_id,
        fund_name: row.fund_name,
        fund_code: row.fund_code,
        status: row.status,
        geography: row.geography,
        stage_focus: row.stage_focus,
        ticket_size_min: row.ticket_size_min,
        ticket_size_max: row.ticket_size_max,
        created_at: row.created_at,
      }));

      return NextResponse.json({ ok: true, funds });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Funds API] GET Error:", error);
    return NextResponse.json({ ok: true, funds: [] });
  }
}

/**
 * POST /api/funds
 * Create a new fund. Requires auth and tenant context.
 * Body: { fund_name, fund_code? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);

    const tenantId = (await getActiveTenantId()) ?? user.tenantId ?? FALLBACK_TENANT_ID;

    const body = await request.json();
    const fundName = typeof body?.fund_name === "string" ? body.fund_name.trim() : "";
    const fundCode = typeof body?.fund_code === "string" ? body.fund_code.trim() : null;

    if (!fundName) {
      return NextResponse.json(
        { ok: false, error: "Fund name is required" },
        { status: 400 }
      );
    }

    const fundId = randomUUID();
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query(
        `INSERT INTO funds (
          fund_id, tenant_id, fund_name, fund_code, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())`,
        [fundId, tenantId, fundName, fundCode || null]
      );

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Funds API] POST Error:", error);
    return jsonError(error);
  }
}
