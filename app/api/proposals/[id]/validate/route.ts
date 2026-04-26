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
import { getProposalRecordPg, setProposalStatusPg } from "@/lib/proposals/proposalDetail";
import { resolveProposalDocumentsForExtraction } from "@/lib/proposals/resolveProposalDocumentsForExtraction";
import { extractTextFromBlobs } from "@/lib/evaluation/textExtraction";
import { validate_proposal } from "@/lib/evaluation/simpleValidation";
import { persistProposalValidation } from "@/lib/pg/persistProposalRecords";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);

    const record = await getProposalRecordPg(tenantId, id);
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

    const resolved = await resolveProposalDocumentsForExtraction(tenantId, id);
    console.log(
      `[validate.route] proposal ${id} tenant ${tenantId}: proposal_documents (db)=${resolved.dbCount}, ` +
        `source=${resolved.fromDb ? "postgres" : "azure_blob_fallback"}, ` +
        `resolved_for_extraction=${resolved.sources.length}`
    );

    const docs = resolved.sources;

    if (docs.length === 0) {
      await persistProposalValidation({
        tenantId,
        proposalId: id,
        validationScore: 0,
        summary: "No proposal documents uploaded",
        findings: [{ type: "missing", message: "No proposal documents uploaded" }],
      });
      await setProposalStatusPg(tenantId, id, "validated");
      return NextResponse.json({
        ok: true,
        data: {
          score: 0,
          findings: ["No proposal documents uploaded"],
          checks: [
            {
              id: "completeness",
              label: "Document completeness",
              passed: false,
              detail: "0%",
              issue: "No documents to analyze",
            },
            {
              id: "revenue",
              label: "Revenue narrative",
              passed: false,
              issue: "No proposal documents uploaded",
            },
            {
              id: "forecast",
              label: "Financial projections",
              passed: false,
              issue: "No proposal documents uploaded",
            },
            {
              id: "risk",
              label: "Risk coverage",
              passed: false,
              issue: "No proposal documents uploaded",
            },
            {
              id: "competitors",
              label: "Competitive context",
              passed: false,
              issue: "No proposal documents uploaded",
            },
            {
              id: "team",
              label: "Team information",
              passed: false,
              issue: "No proposal documents uploaded",
            },
          ],
          overallLabel: "Critical gaps",
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

    const conf =
      validation.score >= 80 ? "high" : validation.score >= 55 ? "medium" : "low";

    await persistProposalValidation({
      tenantId,
      proposalId: id,
      validationScore: validation.score,
      confidence: conf,
      summary: validation.findings.slice(0, 3).join(" · ") || "Validation complete",
      findings: validation.findings.map((f) => ({ message: f })),
    });

    await setProposalStatusPg(tenantId, id, "validated");

    return NextResponse.json({
      ok: true,
      data: {
        score: validation.score,
        findings: validation.findings,
        checks: validation.checks,
        overallLabel: validation.overallLabel,
      },
    });
  } catch (error) {
    console.error("[validate.route] Error validating proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json({ ok: false, error: "Failed to validate proposal" }, { status: 500 });
  }
}
