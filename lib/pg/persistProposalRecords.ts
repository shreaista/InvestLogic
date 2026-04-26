import "server-only";

import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/postgres";
import type { EvaluationReport } from "@/lib/evaluation/types";
import type { InvestmentReport } from "@/lib/evaluation/reportEngine";

export async function persistProposalEvaluation(
  tenantId: string,
  proposalId: string,
  report: EvaluationReport,
  blobPath: string
): Promise<void> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const s = report.structuredScores;
    await client.query(
      `INSERT INTO proposal_evaluations (
        evaluation_id, tenant_id, proposal_id, fit_score, confidence,
        mandate_summary, proposal_summary, strengths_json, risks_json, recommendations_json,
        sector_fit, geography_fit, stage_fit, ticket_size_fit, risk_adjustment,
        model_name, blob_path, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8::jsonb, $9::jsonb, $10::jsonb,
        $11, $12, $13, $14, $15,
        $16, $17, COALESCE($18::timestamptz, NOW())
      )`,
      [
        report.evaluationId,
        tenantId,
        proposalId,
        report.fitScore,
        report.confidence,
        report.mandateSummary,
        report.proposalSummary,
        JSON.stringify(report.strengths ?? []),
        JSON.stringify(report.risks ?? []),
        JSON.stringify(report.recommendations ?? []),
        s?.sectorFit ?? null,
        s?.geographyFit ?? null,
        s?.stageFit ?? null,
        s?.ticketSizeFit ?? null,
        s?.riskAdjustment ?? null,
        report.model ?? null,
        blobPath,
        report.evaluatedAt,
      ]
    );
  } catch (err) {
    console.error("[persistProposalEvaluation]", err);
  } finally {
    client.release();
  }
}

export async function persistProposalValidation(input: {
  tenantId: string;
  proposalId: string;
  validationScore: number;
  confidence?: string | null;
  summary?: string | null;
  revenueStatus?: string | null;
  forecastStatus?: string | null;
  stageStatus?: string | null;
  ipStatus?: string | null;
  competitorStatus?: string | null;
  businessModelStatus?: string | null;
  findings?: unknown[];
}): Promise<void> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const id = randomUUID();
    await client.query(
      `INSERT INTO proposal_validations (
        validation_id, tenant_id, proposal_id, validation_score, confidence, summary,
        revenue_status, forecast_status, stage_status, ip_status, competitor_status, business_model_status,
        findings_json, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb, NOW())`,
      [
        id,
        input.tenantId,
        input.proposalId,
        input.validationScore,
        input.confidence ?? null,
        input.summary ?? null,
        input.revenueStatus ?? null,
        input.forecastStatus ?? null,
        input.stageStatus ?? null,
        input.ipStatus ?? null,
        input.competitorStatus ?? null,
        input.businessModelStatus ?? null,
        JSON.stringify(input.findings ?? []),
      ]
    );
  } catch (err) {
    console.error("[persistProposalValidation]", err);
  } finally {
    client.release();
  }
}

export async function persistProposalReport(
  tenantId: string,
  proposalId: string,
  report: InvestmentReport,
  pdfStorageUrl: string | null
): Promise<void> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO proposal_reports (
        report_id, tenant_id, proposal_id, report_title, score, confidence,
        executive_summary, decision, pdf_storage_url, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::timestamptz)`,
      [
        report.reportId,
        tenantId,
        proposalId,
        report.title,
        report.score,
        report.confidence,
        report.summary,
        report.decision,
        pdfStorageUrl,
        report.generatedAt,
      ]
    );
  } catch (err) {
    console.error("[persistProposalReport]", err);
  } finally {
    client.release();
  }
}

export async function persistProposalExtractionAggregate(input: {
  tenantId: string;
  proposalId: string;
  charCount: number;
  previewText: string | null;
}): Promise<void> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const id = randomUUID();
    await client.query(
      `INSERT INTO proposal_document_extractions (
        extraction_id, tenant_id, proposal_id, char_count, has_extracted, preview_text, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (tenant_id, proposal_id) DO UPDATE SET
        char_count = EXCLUDED.char_count,
        has_extracted = EXCLUDED.has_extracted,
        preview_text = EXCLUDED.preview_text,
        updated_at = NOW()`,
      [
        id,
        input.tenantId,
        input.proposalId,
        input.charCount,
        input.charCount > 0,
        input.previewText?.slice(0, 12000) ?? null,
      ]
    );
  } catch (err) {
    console.error("[persistProposalExtractionAggregate]", err);
  } finally {
    client.release();
  }
}
