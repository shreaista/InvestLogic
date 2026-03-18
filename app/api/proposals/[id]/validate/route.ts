// POST /api/proposals/[id]/validate
// Simple proposal validation - checks for revenue, forecast, competitor in proposal text

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  type Proposal,
} from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import { listProposalDocuments } from "@/lib/storage/proposalDocuments";
import { extractTextFromBlobs } from "@/lib/evaluation/textExtraction";
import { validate_proposal } from "@/lib/evaluation/simpleValidation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);

    const proposalResult = getProposalForUser({
      tenantId,
      userId: ctx.user.id || "",
      role: ctx.role,
      proposalId: id,
    });

    if (proposalResult.accessDenied) {
      throw new AuthzHttpError(403, "You do not have access to this proposal");
    }

    if (!proposalResult.proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const proposal = proposalResult.proposal as Proposal;

    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const docsResult = await listProposalDocuments(tenantId, id);
    const docs = docsResult.flat.filter(
      (d) => !d.blobPath.includes("/evaluations/")
    );

    if (docs.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          score: 0,
          findings: ["No proposal documents uploaded"],
        },
      });
    }

    const proposalBlobs = docs.map((d) => ({
      blobPath: d.blobPath,
      contentType: d.contentType,
      filename: d.filename,
      uploadedAt: d.uploadedAt,
    }));

    const { results } = await extractTextFromBlobs(proposalBlobs);
    const combinedText = results.map((r) => r.text).join("\n\n");

    const validation = validate_proposal(combinedText);

    return NextResponse.json({
      ok: true,
      data: {
        score: validation.score,
        findings: validation.findings,
      },
    });
  } catch (error) {
    console.error("[validate.route] Error validating proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to validate proposal" },
      { status: 500 }
    );
  }
}
