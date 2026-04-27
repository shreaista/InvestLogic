import "server-only";

import type { ProposalStage, ProposalStatus, ProposalWithAssignment } from "@/lib/mock/proposals";
import { getPostgresPool } from "@/lib/postgres";

function dbStatusToProposalStatus(s: string): ProposalStatus {
  const key = s.toLowerCase().trim().replace(/\s+/g, "_");
  const map: Record<string, ProposalStatus> = {
    new: "New",
    assigned: "Assigned",
    in_review: "In Review",
    approved: "Approved",
    declined: "Declined",
    deferred: "Deferred",
  };
  return map[key] ?? "New";
}

function dbReviewPriorityToUi(p: string): "High" | "Medium" | "Low" {
  const k = p.toLowerCase();
  if (k === "high") return "High";
  if (k === "low") return "Low";
  return "Medium";
}

function formatSubmittedAt(created: unknown): string {
  if (created instanceof Date) return created.toISOString();
  if (typeof created === "string") return created;
  return new Date().toISOString();
}

/**
 * All proposals for a tenant from PostgreSQL (newest first).
 */
export async function listProposalsWithAssignmentFromPg(
  tenantId: string
): Promise<ProposalWithAssignment[]> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        p.proposal_id,
        p.fund_id,
        p.proposal_name,
        p.applicant_name,
        p.requested_amount,
        p.sector,
        p.stage,
        p.status,
        p.review_priority,
        p.created_at,
        f.fund_name AS fund_name
       FROM proposals p
       LEFT JOIN funds f
         ON f.fund_id = p.fund_id AND f.tenant_id = p.tenant_id
       WHERE p.tenant_id = $1
       ORDER BY p.created_at DESC`,
      [tenantId]
    );

    return result.rows.map((row) => {
      const amt = row.requested_amount;
      const amount =
        amt != null && amt !== "" && !Number.isNaN(Number(amt)) ? Number(amt) : 0;
      const sector = row.sector != null ? String(row.sector) : undefined;
      const stageRaw = row.stage != null ? String(row.stage) : undefined;
      const stage = stageRaw as ProposalStage | undefined;

      const item: ProposalWithAssignment = {
        id: String(row.proposal_id),
        name: String(row.proposal_name ?? ""),
        applicant: String(row.applicant_name ?? ""),
        fund: row.fund_name != null ? String(row.fund_name) : String(row.fund_id ?? ""),
        fundId: String(row.fund_id ?? ""),
        amount,
        status: dbStatusToProposalStatus(String(row.status ?? "new")),
        assignedToUserId: null,
        assignedToName: null,
        tenantId,
        submittedAt: formatSubmittedAt(row.created_at),
        dueDate: null,
        priority: dbReviewPriorityToUi(String(row.review_priority ?? "medium")),
        sector,
        stage,
        assignmentType: "none",
        assignedQueueId: null,
        assignedQueueName: null,
      };
      return item;
    });
  } catch (e) {
    console.warn("[listProposalsPg] query failed", e);
    return [];
  } finally {
    client.release();
  }
}
