import "server-only";

import type { Proposal, ProposalStatus } from "@/lib/mock/proposals";
import { getPostgresPool } from "@/lib/postgres";
import type { ProposalDetailRow } from "@/lib/proposals/proposalDetailTypes";

export type { ProposalDetailRow };

/** Full `proposals` row (+ optional `fund_name`) for API routes. */
export type ProposalRecordPg = {
  proposal_id: string;
  tenant_id: string;
  fund_id: string;
  proposal_name: string;
  applicant_name: string;
  requested_amount: number | null;
  sector: string | null;
  stage: string | null;
  geography: string | null;
  business_model: string | null;
  description: string | null;
  status: string;
  review_priority: string;
  created_at: string;
  updated_at: string;
  fund_name: string | null;
};

function rowToRecord(row: Record<string, unknown>): ProposalRecordPg {
  const created = row.created_at;
  const updated = row.updated_at;
  const createdAt =
    created instanceof Date
      ? created.toISOString()
      : typeof created === "string"
        ? created
        : new Date().toISOString();
  const updatedAt =
    updated instanceof Date
      ? updated.toISOString()
      : typeof updated === "string"
        ? updated
        : createdAt;

  const amt = row.requested_amount;
  let requested_amount: number | null = null;
  if (amt != null && amt !== "") {
    const n = Number(amt);
    if (!Number.isNaN(n)) requested_amount = n;
  }

  return {
    proposal_id: String(row.proposal_id),
    tenant_id: String(row.tenant_id ?? ""),
    fund_id: String(row.fund_id ?? ""),
    proposal_name: String(row.proposal_name ?? ""),
    applicant_name: String(row.applicant_name ?? ""),
    requested_amount,
    sector: row.sector != null ? String(row.sector) : null,
    stage: row.stage != null ? String(row.stage) : null,
    geography: row.geography != null ? String(row.geography) : null,
    business_model: row.business_model != null ? String(row.business_model) : null,
    description: row.description != null ? String(row.description) : null,
    status: String(row.status ?? ""),
    review_priority: String(row.review_priority ?? "medium"),
    created_at: createdAt,
    updated_at: updatedAt,
    fund_name: row.fund_name != null ? String(row.fund_name) : null,
  };
}

/**
 * Load a single proposal by `proposal_id` and tenant (PostgreSQL), all core columns.
 */
export async function getProposalRecordPg(
  tenantId: string,
  proposalId: string
): Promise<ProposalRecordPg | null> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        p.proposal_id,
        p.tenant_id,
        p.fund_id,
        p.proposal_name,
        p.applicant_name,
        p.requested_amount,
        p.sector,
        p.stage,
        p.geography,
        p.business_model,
        p.description,
        p.status,
        p.review_priority,
        p.created_at,
        p.updated_at,
        f.fund_name AS fund_name
       FROM proposals p
       LEFT JOIN funds f
         ON f.fund_id = p.fund_id AND f.tenant_id = p.tenant_id
       WHERE p.proposal_id = $1 AND p.tenant_id = $2
       LIMIT 1`,
      [proposalId, tenantId]
    );
    const row = result.rows[0];
    return row ? rowToRecord(row) : null;
  } finally {
    client.release();
  }
}

/** Persist workflow status on `proposals` (e.g. `validated` after AI validation completes). */
export async function setProposalStatusPg(
  tenantId: string,
  proposalId: string,
  status: string
): Promise<boolean> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE proposals SET status = $1, updated_at = NOW() WHERE proposal_id = $2 AND tenant_id = $3`,
      [status, proposalId, tenantId]
    );
    return (result.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}

/**
 * Load a single proposal by `proposal_id` and tenant (PostgreSQL).
 */
export async function getProposalDetailPg(
  tenantId: string,
  proposalId: string
): Promise<ProposalDetailRow | null> {
  const full = await getProposalRecordPg(tenantId, proposalId);
  if (!full) return null;
  return {
    proposal_id: full.proposal_id,
    fund_id: full.fund_id,
    proposal_name: full.proposal_name,
    applicant_name: full.applicant_name,
    requested_amount: full.requested_amount,
    sector: full.sector,
    stage: full.stage,
    geography: full.geography,
    business_model: full.business_model,
    description: full.description,
    status: full.status,
    review_priority: full.review_priority,
    created_at: full.created_at,
    fund_name: full.fund_name,
  };
}

function mockStatusToDb(status: ProposalStatus): string {
  const map: Record<ProposalStatus, string> = {
    New: "new",
    Assigned: "assigned",
    "In Review": "in_review",
    Approved: "approved",
    Declined: "declined",
    Deferred: "deferred",
  };
  return map[status] ?? "new";
}

function mockPriorityToDb(priority: "High" | "Medium" | "Low"): string {
  const map = { High: "high", Medium: "medium", Low: "low" } as const;
  return map[priority] ?? "medium";
}

/** Map legacy mock proposal to the same shape as PostgreSQL detail rows. */
export function mockProposalToDetailRow(p: Proposal): ProposalDetailRow {
  let created_at = new Date().toISOString();
  if (p.submittedAt) {
    const d = new Date(p.submittedAt);
    if (!Number.isNaN(d.getTime())) created_at = d.toISOString();
  }

  return {
    proposal_id: p.id,
    fund_id: p.fundId ?? "",
    proposal_name: p.name,
    applicant_name: p.applicant,
    requested_amount: p.amount,
    sector: p.sector ?? null,
    stage: typeof p.stage === "string" ? p.stage : null,
    geography: p.geography ?? null,
    business_model: p.businessModel ?? null,
    description: p.description ?? null,
    status: mockStatusToDb(p.status),
    review_priority: mockPriorityToDb(p.priority),
    created_at,
    fund_name: p.fund || null,
  };
}
