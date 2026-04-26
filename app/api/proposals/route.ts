import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  requireSession,
  requireTenant,
  requireRBACPermission,
  RBAC_PERMISSIONS,
  requireUserRole,
  jsonError,
} from "@/lib/authz";
import { getPostgresPool } from "@/lib/postgres";
import { listProposalsWithAssignmentFromPg } from "@/lib/proposals/listProposalsPg";

const FALLBACK_TENANT_ID = "tenant_ipa_001";
const CREATED_BY_PLACEHOLDER = "user_admin_001";

/**
 * GET /api/proposals — legacy: all proposals for user (mock).
 * GET /api/proposals?fund_id=... — PostgreSQL proposals for that fund.
 */
export async function GET(request: NextRequest) {
  const fundId = request.nextUrl.searchParams.get("fund_id");

  if (fundId) {
    try {
      const user = await requireSession();
      const tenantId = user.tenantId ?? FALLBACK_TENANT_ID;

      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        const fundCheck = await client.query(
          `SELECT 1 FROM funds WHERE fund_id = $1 AND tenant_id = $2 LIMIT 1`,
          [fundId, tenantId]
        );
        if (fundCheck.rows.length === 0) {
          return NextResponse.json({ ok: false, error: "Fund not found" }, { status: 404 });
        }

        const result = await client.query(
          `SELECT proposal_id, proposal_name, applicant_name, requested_amount, sector, stage, geography,
                  business_model, description, status, review_priority, created_at, updated_at
           FROM proposals
           WHERE fund_id = $1 AND tenant_id = $2
           ORDER BY created_at DESC`,
          [fundId, tenantId]
        );

        const proposals = result.rows.map((row) => ({
          proposal_id: row.proposal_id,
          proposal_name: row.proposal_name,
          applicant_name: row.applicant_name,
          requested_amount: row.requested_amount,
          sector: row.sector,
          stage: row.stage,
          geography: row.geography,
          business_model: row.business_model,
          description: row.description,
          status: row.status,
          review_priority: row.review_priority,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));

        return NextResponse.json({ ok: true, proposals });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("[Proposals API] GET (fund) Error:", error);
      return jsonError(error);
    }
  }

  try {
    const user = await requireSession();
    requireRBACPermission(user, RBAC_PERMISSIONS.PROPOSAL_READ);
    const tenantId = requireTenant(user);

    const proposals = await listProposalsWithAssignmentFromPg(tenantId);

    return NextResponse.json({
      ok: true,
      data: { proposals },
    });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * POST /api/proposals — create proposal linked to a fund (PostgreSQL).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin", "fund_manager"]);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const rawFundId = body.fund_id ?? body.fundId;
    const fundId =
      typeof rawFundId === "string" ? rawFundId.trim() : null;
    const proposalName = typeof body.proposal_name === "string" ? body.proposal_name.trim() : "";
    console.log("[POST /api/proposals] backend received fund_id", fundId);
    if (!fundId) {
      return NextResponse.json({ ok: false, error: "fund_id is required" }, { status: 400 });
    }
    if (!proposalName) {
      return NextResponse.json({ ok: false, error: "proposal_name is required" }, { status: 400 });
    }

    const tenantId = user.tenantId ?? FALLBACK_TENANT_ID;
    console.log("[POST /api/proposals] tenantId for fund lookup", tenantId);
    const applicantName =
      typeof body.applicant_name === "string" ? body.applicant_name.trim() : "";
    const requestedAmountRaw = body.requested_amount;
    let requestedAmount: number | null = null;
    if (requestedAmountRaw !== null && requestedAmountRaw !== undefined && requestedAmountRaw !== "") {
      const n = Number(requestedAmountRaw);
      if (Number.isNaN(n)) {
        return NextResponse.json({ ok: false, error: "requested_amount must be a number" }, { status: 400 });
      }
      requestedAmount = n;
    }

    const sector = typeof body.sector === "string" ? body.sector.trim() || null : null;
    const stage = typeof body.stage === "string" ? body.stage.trim() || null : null;
    const geography = typeof body.geography === "string" ? body.geography.trim() || null : null;
    const businessModel =
      typeof body.business_model === "string" ? body.business_model.trim() || null : null;
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;

    const proposalId = randomUUID();

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      const fundCheck = await client.query(
        `SELECT 1 FROM funds WHERE fund_id = $1 AND tenant_id = $2 LIMIT 1`,
        [fundId, tenantId]
      );
      console.log(
        "[POST /api/proposals] fund lookup result rowCount",
        fundCheck.rows.length,
        "for fund_id",
        fundId
      );
      if (fundCheck.rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Fund not found" }, { status: 404 });
      }

      await client.query(
        `INSERT INTO proposals (
          proposal_id, tenant_id, fund_id, proposal_name, applicant_name, requested_amount,
          sector, stage, geography, business_model, description,
          status, review_priority, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'new', 'medium', $12, NOW(), NOW())`,
        [
          proposalId,
          tenantId,
          fundId,
          proposalName,
          applicantName,
          requestedAmount,
          sector,
          stage,
          geography,
          businessModel,
          description,
          CREATED_BY_PLACEHOLDER,
        ]
      );
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true, proposal_id: proposalId });
  } catch (error) {
    console.error("[Proposals API] POST Error:", error);
    return jsonError(error);
  }
}
