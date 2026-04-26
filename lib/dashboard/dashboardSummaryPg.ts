import "server-only";

import type { PoolClient } from "pg";
import { getPostgresPool } from "@/lib/postgres";
import { queryAuditLogPg } from "@/lib/audit/pgAudit";
import type {
  AttentionSeverity,
  DashboardActivityItem,
  DashboardAttentionItem,
  DashboardSummaryPayload,
} from "@/lib/dashboard/dashboardSummaryTypes";

export type {
  AttentionSeverity,
  DashboardActivityItem,
  DashboardAttentionItem,
  DashboardSummaryPayload,
} from "@/lib/dashboard/dashboardSummaryTypes";

function normalizeStatus(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function auditActionLabel(action: string): string {
  const map: Record<string, string> = {
    "proposal_document.upload": "Document uploaded",
    "proposal.evaluate": "Evaluation completed",
    "proposal.status_update": "Proposal status updated",
    "proposal.report_generated": "Report generated",
    "proposal.generate_report": "Report generated",
    "fund_mandate.upload": "Mandate uploaded",
    "fund_mandate.create": "Mandate created",
  };
  return map[action] ?? action.replace(/\./g, " · ");
}

type ProposalRow = {
  proposal_id: string;
  proposal_name: string;
  status: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  doc_count: number;
  has_extract: boolean | null;
  has_validation: boolean;
  has_evaluation: boolean;
  has_report: boolean;
  latest_val_score: number | null;
};

async function tableExists(client: PoolClient, tableName: string): Promise<boolean> {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [tableName]
  );
  return r.rows.length > 0;
}

function mapProposalRows(rows: Record<string, unknown>[]): ProposalRow[] {
  return rows.map((r) => ({
    proposal_id: String(r.proposal_id),
    proposal_name: String(r.proposal_name ?? ""),
    status: String(r.status ?? "new"),
    created_by: String(r.created_by ?? ""),
    created_at: r.created_at as Date | string,
    updated_at: r.updated_at as Date | string,
    doc_count: Number(r.doc_count) || 0,
    has_extract: r.has_extract === true ? true : r.has_extract === false ? false : null,
    has_validation: Boolean(r.has_validation),
    has_evaluation: Boolean(r.has_evaluation),
    has_report: Boolean(r.has_report),
    latest_val_score: r.latest_val_score != null ? Number(r.latest_val_score) : null,
  }));
}

async function loadProposalRowsForDashboard(
  client: PoolClient,
  tenantId: string,
  hasExtractionsTable: boolean
): Promise<ProposalRow[]> {
  const extractSelect = hasExtractionsTable
    ? `(SELECT pde.has_extracted FROM proposal_document_extractions pde
        WHERE pde.proposal_id = p.proposal_id AND pde.tenant_id = p.tenant_id LIMIT 1)`
    : `NULL::boolean`;

  const result = await client.query(
    `SELECT
      p.proposal_id,
      p.proposal_name,
      p.status,
      p.created_by,
      p.created_at,
      p.updated_at,
      COALESCE(dc.cnt, 0)::int AS doc_count,
      ${extractSelect} AS has_extract,
      EXISTS (
        SELECT 1 FROM proposal_validations pv
        WHERE pv.proposal_id = p.proposal_id AND pv.tenant_id = p.tenant_id
      ) AS has_validation,
      EXISTS (
        SELECT 1 FROM proposal_evaluations pe
        WHERE pe.proposal_id = p.proposal_id AND pe.tenant_id = p.tenant_id
      ) AS has_evaluation,
      EXISTS (
        SELECT 1 FROM proposal_reports pr
        WHERE pr.proposal_id = p.proposal_id AND pr.tenant_id = p.tenant_id
      ) AS has_report,
      (
        SELECT pv.validation_score FROM proposal_validations pv
        WHERE pv.proposal_id = p.proposal_id AND pv.tenant_id = p.tenant_id
        ORDER BY pv.created_at DESC LIMIT 1
      ) AS latest_val_score
    FROM proposals p
    LEFT JOIN (
      SELECT proposal_id, tenant_id, COUNT(*)::int AS cnt
      FROM proposal_documents
      WHERE tenant_id = $1
      GROUP BY proposal_id, tenant_id
    ) dc ON dc.proposal_id = p.proposal_id AND dc.tenant_id = p.tenant_id
    WHERE p.tenant_id = $1`,
    [tenantId]
  );

  return mapProposalRows(result.rows);
}

/** Minimal fallback: proposals + document counts only (when validation/evaluation tables are missing). */
async function loadProposalRowsMinimal(client: PoolClient, tenantId: string): Promise<ProposalRow[]> {
  const result = await client.query(
    `SELECT
      p.proposal_id,
      p.proposal_name,
      p.status,
      p.created_by,
      p.created_at,
      p.updated_at,
      COALESCE(dc.cnt, 0)::int AS doc_count,
      NULL::boolean AS has_extract,
      false AS has_validation,
      false AS has_evaluation,
      false AS has_report,
      NULL::numeric AS latest_val_score
    FROM proposals p
    LEFT JOIN (
      SELECT proposal_id, tenant_id, COUNT(*)::int AS cnt
      FROM proposal_documents
      WHERE tenant_id = $1
      GROUP BY proposal_id, tenant_id
    ) dc ON dc.proposal_id = p.proposal_id AND dc.tenant_id = p.tenant_id
    WHERE p.tenant_id = $1`,
    [tenantId]
  );

  return mapProposalRows(result.rows);
}

export async function buildDashboardSummary(
  tenantId: string,
  userId: string
): Promise<DashboardSummaryPayload | null> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const hasExtractionsTable = await tableExists(client, "proposal_document_extractions");
    const hasAssignmentsTable = await tableExists(client, "proposal_assignments");

    let rows: ProposalRow[];
    let useExtractionTable = hasExtractionsTable;

    try {
      rows = await loadProposalRowsForDashboard(client, tenantId, hasExtractionsTable);
    } catch (firstErr) {
      console.warn("[buildDashboardSummary] primary proposal query failed, using minimal fallback", firstErr);
      try {
        rows = await loadProposalRowsMinimal(client, tenantId);
        useExtractionTable = false;
      } catch (fallbackErr) {
        console.error("[buildDashboardSummary] minimal fallback failed", fallbackErr);
        return null;
      }
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

    let totalProposals = 0;
    let inReview = 0;
    let pendingValidation = 0;
    let approvedThisMonth = 0;

    const pipeline = {
      upload: 0,
      extract: 0,
      validate: 0,
      evaluate: 0,
      report: 0,
      complete: 0,
    };

    let assignedProposals = 0;
    let pendingReviewsUser = 0;
    let completedToday = 0;

    let missingDocuments = 0;
    let stuckInReview = 0;
    let validationFailures = 0;
    let evaluationGaps = 0;

    const needsAttention: DashboardAttentionItem[] = [];

    const assignedSet = new Set<string>();
    let useAssignmentRows = false;
    if (hasAssignmentsTable) {
      try {
        const assignRes = await client.query(
          `SELECT proposal_id FROM proposal_assignments
           WHERE tenant_id = $1 AND assigned_to_user_id = $2`,
          [tenantId, userId]
        );
        for (const r of assignRes.rows) {
          assignedSet.add(String(r.proposal_id));
        }
        useAssignmentRows = true;
      } catch (assignErr) {
        console.warn("[buildDashboardSummary] proposal_assignments unavailable, using created_by fallback", assignErr);
      }
    }

    for (const row of rows) {
      totalProposals++;
      const st = normalizeStatus(row.status);
      const updated =
        row.updated_at instanceof Date ? row.updated_at : new Date(String(row.updated_at));

      if (st === "in_review") inReview++;
      if (st === "assigned") pendingValidation++;

      if (st === "approved" && updated >= startOfMonth) approvedThisMonth++;

      if (useAssignmentRows) {
        if (assignedSet.has(row.proposal_id)) assignedProposals++;
      } else if (row.created_by === userId) {
        assignedProposals++;
      }

      const terminal = st === "approved" || st === "declined" || st === "deferred";
      if (terminal && updated >= startOfToday) completedToday++;

      if (useAssignmentRows) {
        if (assignedSet.has(row.proposal_id) && st === "in_review") pendingReviewsUser++;
      } else if (row.created_by === userId && st === "in_review") {
        pendingReviewsUser++;
      }

      // Without extractions table, treat downstream rows as evidence that extract step is done
      const extractedOk = useExtractionTable
        ? row.has_extract === true
        : Boolean(row.has_validation || row.has_evaluation || row.has_report);

      if (row.doc_count === 0) {
        pipeline.upload++;
        missingDocuments++;
        needsAttention.push({
          id: `doc-${row.proposal_id}`,
          title: "Missing documents",
          detail: `${row.proposal_name} · upload files to proceed`,
          severity: "warning",
          href: `/dashboard/proposals/${row.proposal_id}`,
        });
      } else if (!extractedOk) {
        pipeline.extract++;
      } else if (!row.has_validation) {
        pipeline.validate++;
      } else if (!row.has_evaluation) {
        pipeline.evaluate++;
        evaluationGaps++;
      } else if (!row.has_report) {
        pipeline.report++;
      } else {
        pipeline.complete++;
      }

      if (st === "in_review" && now.getTime() - updated.getTime() > fiveDaysMs) {
        stuckInReview++;
        needsAttention.push({
          id: `stuck-${row.proposal_id}`,
          title: "Review stalled",
          detail: `${row.proposal_name} · no update in 5+ days`,
          severity: "error",
          href: `/dashboard/proposals/${row.proposal_id}`,
        });
      }

      if (row.latest_val_score !== null && row.latest_val_score < 50) {
        validationFailures++;
        needsAttention.push({
          id: `val-${row.proposal_id}`,
          title: "Validation below threshold",
          detail: `${row.proposal_name} · score ${row.latest_val_score}`,
          severity: "warning",
          href: `/dashboard/proposals/${row.proposal_id}`,
        });
      }
    }

    needsAttention.sort((a, b) => {
      const rank = (s: AttentionSeverity) => (s === "error" ? 0 : s === "warning" ? 1 : 2);
      return rank(a.severity) - rank(b.severity);
    });

    type Feed = { ts: number; item: DashboardActivityItem };
    const feed: Feed[] = [];

    const auditRows = await queryAuditLogPg(tenantId, 25);
    for (const e of auditRows) {
      const rid =
        e.resource_type === "proposal" ||
        e.resource_type === "proposal_evaluation" ||
        e.resource_type === "proposal_document" ||
        e.resource_type === "proposal_report"
          ? e.resource_id
          : typeof e.details?.proposalId === "string"
            ? (e.details.proposalId as string)
            : null;

      const label = auditActionLabel(e.action);
      const detail =
        (e.details?.proposalName as string | undefined) ||
        (e.details?.filename as string | undefined) ||
        (e.details?.mandateName as string | undefined) ||
        (rid ? `Resource ${rid.slice(0, 8)}…` : e.resource_type);

      const ts = new Date(e.created_at).getTime();
      feed.push({
        ts,
        item: {
          id: `audit-${e.id}`,
          label,
          detail: typeof detail === "string" ? detail : e.resource_type,
          timeLabel: formatRelativeTime(e.created_at),
          href: rid ? `/dashboard/proposals/${rid}` : "/dashboard/audit",
        },
      });
    }

    const created = await client.query(
      `SELECT proposal_id, proposal_name, created_at FROM proposals
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 12`,
      [tenantId]
    );
    for (const r of created.rows) {
      const pid = String(r.proposal_id);
      const iso = r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at);
      feed.push({
        ts: new Date(iso).getTime(),
        item: {
          id: `created-${pid}`,
          label: "Proposal created",
          detail: String(r.proposal_name ?? pid),
          timeLabel: formatRelativeTime(iso),
          href: `/dashboard/proposals/${pid}`,
        },
      });
    }

    feed.sort((a, b) => b.ts - a.ts);
    const seen = new Set<string>();
    const merged: DashboardActivityItem[] = [];
    for (const f of feed) {
      const key = `${f.item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(f.item);
      if (merged.length >= 15) break;
    }

    return {
      kpis: {
        totalProposals,
        inReview,
        pendingValidation,
        approvedThisMonth,
      },
      needsAttention: needsAttention.slice(0, 20),
      attentionCounts: {
        missingDocuments,
        stuckInReview,
        validationFailures,
        evaluationGaps,
      },
      myWork: {
        assignedProposals,
        pendingReviews: pendingReviewsUser,
        completedToday,
      },
      pipeline,
      recentActivity: merged,
    };
  } catch (err) {
    console.error("[buildDashboardSummary]", err);
    return null;
  } finally {
    client.release();
  }
}
