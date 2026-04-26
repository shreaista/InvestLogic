import "server-only";

import { getPostgresPool } from "@/lib/postgres";
import { getProposalDetailPg } from "@/lib/proposals/proposalDetail";
import { recommendationFromFit } from "@/lib/proposals/evaluationCategories";
import type { EvaluationDashboardPayload } from "@/lib/proposals/evaluationDashboardTypes";

export type { EvaluationDashboardPayload } from "@/lib/proposals/evaluationDashboardTypes";

function iso(d: unknown): string | null {
  if (!d) return null;
  if (d instanceof Date) return d.toISOString();
  return String(d);
}

export async function loadEvaluationDashboard(
  tenantId: string,
  proposalId: string
): Promise<EvaluationDashboardPayload | null> {
  const proposal = await getProposalDetailPg(tenantId, proposalId);
  if (!proposal) return null;

  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const fundRes = await client.query(
      `SELECT fund_id, fund_name, fund_code, status, geography, stage_focus, ticket_size_min, ticket_size_max
       FROM funds WHERE tenant_id = $1 AND fund_id = $2 LIMIT 1`,
      [tenantId, proposal.fund_id]
    );
    const fr = fundRes.rows[0];
    const fund = fr
      ? {
          fund_id: String(fr.fund_id),
          fund_name: fr.fund_name != null ? String(fr.fund_name) : null,
          fund_code: fr.fund_code != null ? String(fr.fund_code) : null,
          thesis: null as string | null,
          geography: fr.geography != null ? String(fr.geography) : null,
          stage_focus: fr.stage_focus != null ? String(fr.stage_focus) : null,
          ticket_size_min: fr.ticket_size_min != null ? Number(fr.ticket_size_min) : null,
          ticket_size_max: fr.ticket_size_max != null ? Number(fr.ticket_size_max) : null,
          status: fr.status != null ? String(fr.status) : null,
        }
      : null;

    try {
      const th = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'funds' AND column_name = 'thesis'`
      );
      if (th.rows.length > 0 && fr) {
        const t2 = await client.query(`SELECT thesis FROM funds WHERE tenant_id = $1 AND fund_id = $2 LIMIT 1`, [
          tenantId,
          proposal.fund_id,
        ]);
        if (fund && t2.rows[0]?.thesis != null) {
          fund.thesis = String(t2.rows[0].thesis);
        }
      }
    } catch {
      /* optional column */
    }

    const mandateRes = await client.query(
      `SELECT mandate_id, mandate_name, mandate_version, extracted_text, uploaded_at, status
       FROM fund_mandates
       WHERE tenant_id = $1 AND fund_id = $2 AND COALESCE(status, 'active') = 'active'
       ORDER BY uploaded_at DESC NULLS LAST, mandate_version DESC NULLS LAST
       LIMIT 1`,
      [tenantId, proposal.fund_id]
    );
    const mr = mandateRes.rows[0];
    const mandate = mr
      ? {
          mandate_id: String(mr.mandate_id),
          mandate_name: mr.mandate_name != null ? String(mr.mandate_name) : null,
          mandate_version: mr.mandate_version != null ? Number(mr.mandate_version) : null,
          extracted_text: mr.extracted_text != null ? String(mr.extracted_text) : null,
          uploaded_at: iso(mr.uploaded_at),
          status: mr.status != null ? String(mr.status) : null,
        }
      : null;

    const docsRes = await client.query(
      `SELECT proposal_document_id, file_name, file_type, file_size_bytes, storage_url, uploaded_at
       FROM proposal_documents
       WHERE tenant_id = $1 AND proposal_id = $2
       ORDER BY uploaded_at DESC`,
      [tenantId, proposalId]
    );
    const documents = docsRes.rows.map((d) => ({
      proposal_document_id: String(d.proposal_document_id),
      file_name: String(d.file_name ?? ""),
      file_type: String(d.file_type ?? ""),
      file_size_bytes: Number(d.file_size_bytes) || 0,
      storage_url: String(d.storage_url ?? ""),
      uploaded_at: iso(d.uploaded_at) ?? "",
    }));

    const extRes = await client.query(
      `SELECT char_count, has_extracted, preview_text, updated_at
       FROM proposal_document_extractions
       WHERE tenant_id = $1 AND proposal_id = $2
       LIMIT 1`,
      [tenantId, proposalId]
    );
    const er = extRes.rows[0];
    const extraction = er
      ? {
          char_count: Number(er.char_count) || 0,
          has_extracted: Boolean(er.has_extracted),
          preview_text: er.preview_text != null ? String(er.preview_text) : null,
          updated_at: iso(er.updated_at),
        }
      : null;

    const valRes = await client.query(
      `SELECT validation_id, validation_score, confidence, summary,
        revenue_status, forecast_status, stage_status, ip_status, competitor_status, business_model_status,
        findings_json, created_at
       FROM proposal_validations
       WHERE tenant_id = $1 AND proposal_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, proposalId]
    );
    const vr = valRes.rows[0];
    const validation = vr
      ? {
          validation_id: String(vr.validation_id),
          validation_score: vr.validation_score != null ? Number(vr.validation_score) : null,
          confidence: vr.confidence != null ? String(vr.confidence) : null,
          summary: vr.summary != null ? String(vr.summary) : null,
          revenue_status: vr.revenue_status != null ? String(vr.revenue_status) : null,
          forecast_status: vr.forecast_status != null ? String(vr.forecast_status) : null,
          stage_status: vr.stage_status != null ? String(vr.stage_status) : null,
          ip_status: vr.ip_status != null ? String(vr.ip_status) : null,
          competitor_status: vr.competitor_status != null ? String(vr.competitor_status) : null,
          business_model_status: vr.business_model_status != null ? String(vr.business_model_status) : null,
          findings_json: vr.findings_json ?? null,
          created_at: iso(vr.created_at),
        }
      : null;

    const evRes = await client.query(
      `SELECT evaluation_id, fit_score, confidence, mandate_summary, proposal_summary,
        strengths_json, risks_json, recommendations_json,
        sector_fit, geography_fit, stage_fit, ticket_size_fit, risk_adjustment,
        model_name, blob_path, created_at
       FROM proposal_evaluations
       WHERE tenant_id = $1 AND proposal_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, proposalId]
    );
    const evr = evRes.rows[0];
    const evaluation = evr
      ? {
          evaluation_id: String(evr.evaluation_id),
          fit_score: evr.fit_score != null ? Number(evr.fit_score) : null,
          confidence: evr.confidence != null ? String(evr.confidence) : null,
          mandate_summary: evr.mandate_summary != null ? String(evr.mandate_summary) : null,
          proposal_summary: evr.proposal_summary != null ? String(evr.proposal_summary) : null,
          strengths_json: evr.strengths_json ?? null,
          risks_json: evr.risks_json ?? null,
          recommendations_json: evr.recommendations_json ?? null,
          sector_fit: evr.sector_fit != null ? Number(evr.sector_fit) : null,
          geography_fit: evr.geography_fit != null ? Number(evr.geography_fit) : null,
          stage_fit: evr.stage_fit != null ? Number(evr.stage_fit) : null,
          ticket_size_fit: evr.ticket_size_fit != null ? Number(evr.ticket_size_fit) : null,
          risk_adjustment: evr.risk_adjustment != null ? Number(evr.risk_adjustment) : null,
          model_name: evr.model_name != null ? String(evr.model_name) : null,
          blob_path: evr.blob_path != null ? String(evr.blob_path) : null,
          created_at: iso(evr.created_at),
        }
      : null;

    const repRes = await client.query(
      `SELECT report_id, report_title, score, confidence, executive_summary, decision, pdf_storage_url, created_at
       FROM proposal_reports
       WHERE tenant_id = $1 AND proposal_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId, proposalId]
    );
    const rr = repRes.rows[0];
    const report = rr
      ? {
          report_id: String(rr.report_id),
          report_title: rr.report_title != null ? String(rr.report_title) : null,
          score: rr.score != null ? Number(rr.score) : null,
          confidence: rr.confidence != null ? String(rr.confidence) : null,
          executive_summary: rr.executive_summary != null ? String(rr.executive_summary) : null,
          decision: rr.decision != null ? String(rr.decision) : null,
          pdf_storage_url: rr.pdf_storage_url != null ? String(rr.pdf_storage_url) : null,
          created_at: iso(rr.created_at),
        }
      : null;

    const hasDocs = documents.length > 0;
    const hasMandateTemplates = Boolean(mandate?.mandate_id);
    const hasInputs = hasDocs && hasMandateTemplates;

    let overallScore: number | null = evaluation?.fit_score ?? null;
    if (overallScore === null && validation?.validation_score != null) {
      overallScore = validation.validation_score;
    }
    if (overallScore === null && report?.score != null) {
      overallScore = report.score;
    }

    const recommendation = recommendationFromFit(evaluation?.fit_score ?? null, hasInputs);

    const missing: string[] = [];
    if (!hasDocs) missing.push("Upload proposal documents");
    if (!extraction?.has_extracted && hasDocs) missing.push("Extract text from documents (open proposal and load extract)");
    if (!validation && extraction?.has_extracted) missing.push("Run validation");
    if (!fund) missing.push("Link a fund to the proposal");
    if (!mandate) missing.push("Upload an active mandate for the fund");

    let readiness: EvaluationDashboardPayload["derived"]["evaluationReadiness"] = "ready";
    if (!hasDocs) readiness = "needs_documents";
    else if (!extraction?.has_extracted) readiness = "needs_extraction";
    else if (!validation) readiness = "needs_validation";
    else if (!mandate) readiness = "needs_mandate";

    const mandateFitSummary =
      evaluation?.mandate_summary?.trim() ||
      (evaluation
        ? `Sector ${evaluation.sector_fit ?? "—"} · Geo ${evaluation.geography_fit ?? "—"} · Stage ${evaluation.stage_fit ?? "—"} · Ticket ${evaluation.ticket_size_fit ?? "—"} · Risk adj ${evaluation.risk_adjustment ?? "—"}`
        : null);

    return {
      proposal,
      fund,
      mandate,
      documents,
      extraction,
      validation,
      evaluation,
      report,
      derived: {
        overallScore,
        recommendation,
        confidenceLabel: evaluation?.confidence ?? validation?.confidence ?? report?.confidence ?? "—",
        evaluationReadiness: readiness,
        missingPrerequisites: missing,
        mandateFitSummary,
      },
    };
  } catch (err) {
    console.error("[loadEvaluationDashboard]", err);
    return null;
  } finally {
    client.release();
  }
}
