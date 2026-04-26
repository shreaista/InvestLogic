// GET /api/proposals/[id]/extract
// Returns extracted/parsed text from proposal documents for preview

import { NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  type Proposal,
} from "@/lib/authz";
import { getProposalRecordPg } from "@/lib/proposals/proposalDetail";
import { resolveProposalDocumentsForExtraction } from "@/lib/proposals/resolveProposalDocumentsForExtraction";
import { extractTextFromBlobs } from "@/lib/evaluation/textExtraction";
import { persistProposalExtractionAggregate } from "@/lib/pg/persistProposalRecords";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
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
      `[extract.route] proposal ${id} tenant ${tenantId}: proposal_documents (db)=${resolved.dbCount}, ` +
        `source=${resolved.fromDb ? "postgres" : "azure_blob_fallback"}, ` +
        `resolved_for_extraction=${resolved.sources.length}`
    );

    const docs = resolved.sources;

    if (docs.length === 0) {
      await persistProposalExtractionAggregate({
        tenantId,
        proposalId: id,
        charCount: 0,
        previewText: null,
      });
      return NextResponse.json({
        ok: true,
        data: {
          documents: [],
          combinedText: "",
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

    await persistProposalExtractionAggregate({
      tenantId,
      proposalId: id,
      charCount: combinedText.length,
      previewText: combinedText.slice(0, 12000),
    });

    return NextResponse.json({
      ok: true,
      data: {
        documents: results.map((r) => ({
          filename: r.filename,
          text: r.text,
          isPlaceholder: r.isPlaceholder,
          warning: r.warning,
        })),
        combinedText,
      },
    });
  } catch (error) {
    console.error("[extract.route] Error extracting proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json({ ok: false, error: "Failed to extract proposal content" }, { status: 500 });
  }
}
