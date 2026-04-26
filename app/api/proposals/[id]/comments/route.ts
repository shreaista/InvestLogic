// GET /api/proposals/[id]/comments — list comments (newest first)
// POST /api/proposals/[id]/comments — create comment

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPostgresPool } from "@/lib/postgres";
import {
  getAuthzContext,
  requireTenantAccess,
  requirePermission,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  PROPOSAL_READ,
  type Proposal,
} from "@/lib/authz";
import { getProposalRecordPg } from "@/lib/proposals/proposalDetail";
import { isAuthzError } from "@/lib/authz/errors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const FALLBACK_TENANT = "tenant_ipa_001";
const FALLBACK_USER = "user_admin_001";

const COMMENT_TYPES = new Set(["note", "question", "risk", "decision"]);

function effectiveTenantId(ctx: { tenantId: string | null }): string {
  return ctx.tenantId ?? FALLBACK_TENANT;
}

function effectiveUserId(ctx: { user: { id?: string } }): string {
  return ctx.user.id ?? FALLBACK_USER;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id: proposalId } = await context.params;

  try {
    const ctx = await getAuthzContext();
    requirePermission(ctx, PROPOSAL_READ);

    const tenantId = effectiveTenantId(ctx);
    requireTenantAccess(ctx, tenantId);

    const record = await getProposalRecordPg(tenantId, proposalId);
    if (!record) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const proposal: Proposal = {
      id: record.proposal_id,
      tenantId: record.tenant_id,
    };
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
           c.comment_id,
           c.proposal_id,
           c.tenant_id,
           c.user_id,
           c.comment_text,
           c.comment_type,
           c.created_at,
           COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS user_name
         FROM proposal_comments c
         LEFT JOIN app_users u ON u.user_id::text = c.user_id::text
         WHERE c.proposal_id = $1 AND c.tenant_id = $2
         ORDER BY c.created_at DESC`,
        [proposalId, record.tenant_id]
      );

      const comments = result.rows.map((row: Record<string, unknown>) => ({
        comment_id: String(row.comment_id),
        proposal_id: String(row.proposal_id),
        tenant_id: String(row.tenant_id),
        user_id: String(row.user_id),
        comment_text: String(row.comment_text ?? ""),
        comment_type: String(row.comment_type ?? ""),
        created_at:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : String(row.created_at ?? ""),
        user_name: row.user_name != null && String(row.user_name).trim() !== "" ? String(row.user_name) : null,
      }));

      return NextResponse.json({ ok: true, data: { comments } });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[comments GET]", error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    if (isAuthzError(error)) {
      return NextResponse.json({ ok: false, error: error.safeMessage }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: proposalId } = await context.params;

  try {
    const ctx = await getAuthzContext();
    requirePermission(ctx, PROPOSAL_READ);

    const tenantId = effectiveTenantId(ctx);
    requireTenantAccess(ctx, tenantId);

    const record = await getProposalRecordPg(tenantId, proposalId);
    if (!record) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const proposal: Proposal = {
      id: record.proposal_id,
      tenantId: record.tenant_id,
    };
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    let body: { comment_text?: unknown; comment_type?: unknown };
    try {
      body = (await request.json()) as { comment_text?: unknown; comment_type?: unknown };
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    const commentText = typeof body.comment_text === "string" ? body.comment_text.trim() : "";
    const commentTypeRaw = typeof body.comment_type === "string" ? body.comment_type.trim().toLowerCase() : "";

    if (!commentText) {
      throw new AuthzHttpError(400, "comment_text is required");
    }
    if (!COMMENT_TYPES.has(commentTypeRaw)) {
      throw new AuthzHttpError(400, "comment_type must be one of: note, question, risk, decision");
    }

    const commentId = randomUUID();
    const userId = effectiveUserId(ctx);

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO proposal_comments (
           comment_id,
           proposal_id,
           tenant_id,
           user_id,
           comment_text,
           comment_type,
           created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [commentId, proposalId, record.tenant_id, userId, commentText, commentTypeRaw]
      );
    } finally {
      client.release();
    }

    return NextResponse.json({
      ok: true,
      data: {
        comment_id: commentId,
        proposal_id: proposalId,
        tenant_id: record.tenant_id,
        user_id: userId,
        comment_text: commentText,
        comment_type: commentTypeRaw,
      },
    });
  } catch (error) {
    console.error("[comments POST]", error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    if (isAuthzError(error)) {
      return NextResponse.json({ ok: false, error: error.safeMessage }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to post comment" }, { status: 500 });
  }
}
