import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/postgres";
import { requireSession, requireUserRole } from "@/lib/authz";
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
      const tenantId = (await getActiveTenantId()) ?? FALLBACK_TENANT_ID;
      let result;
      try {
        result = await client.query(
          `SELECT
            fund_id AS id,
            fund_name AS name,
            fund_code AS code,
            tenant_id,
            status,
            created_at,
            updated_at
          FROM funds
          WHERE tenant_id = $1
          ORDER BY fund_name`,
          [tenantId]
        );
      } catch (qErr) {
        const msg = qErr instanceof Error ? qErr.message : String(qErr);
        if (msg.toLowerCase().includes("updated_at") || msg.includes("42703")) {
          console.warn("[Funds API] GET retry without updated_at", qErr);
          result = await client.query(
            `SELECT
              fund_id AS id,
              fund_name AS name,
              fund_code AS code,
              tenant_id,
              status,
              created_at,
              created_at AS updated_at
            FROM funds
            WHERE tenant_id = $1
            ORDER BY fund_name`,
            [tenantId]
          );
        } else {
          throw qErr;
        }
      }

      const funds = result.rows.map((row) => ({
        fund_id: row.id,
        fund_name: row.name,
        fund_code: row.code,
        tenant_id: row.tenant_id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
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
      try {
        await client.query(
          `INSERT INTO funds (
          fund_id, tenant_id, fund_name, fund_code, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())`,
          [fundId, tenantId, fundName, fundCode || null]
        );
      } catch (insErr) {
        const msg = insErr instanceof Error ? insErr.message : String(insErr);
        if (msg.toLowerCase().includes("updated_at") || msg.includes("42703")) {
          await client.query(
            `INSERT INTO funds (
            fund_id, tenant_id, fund_name, fund_code, status, created_at
          ) VALUES ($1, $2, $3, $4, 'active', NOW())`,
            [fundId, tenantId, fundName, fundCode || null]
          );
        } else {
          throw insErr;
        }
      }

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Funds API] POST Error:", error);
    return NextResponse.json(
      { ok: false, error: "Could not create fund" },
      { status: 500 }
    );
  }
}
