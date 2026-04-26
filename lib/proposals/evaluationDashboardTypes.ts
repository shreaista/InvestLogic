/** Client-safe types for GET /api/proposals/[id]/evaluation-dashboard (mirrors PG loader). */

import type { ProposalDetailRow } from "@/lib/proposals/proposalDetailTypes";

export type EvaluationDashboardPayload = {
  proposal: ProposalDetailRow;
  fund: {
    fund_id: string;
    fund_name: string | null;
    fund_code: string | null;
    thesis: string | null;
    geography: string | null;
    stage_focus: string | null;
    ticket_size_min: number | null;
    ticket_size_max: number | null;
    status: string | null;
  } | null;
  mandate: {
    mandate_id: string;
    mandate_name: string | null;
    mandate_version: number | null;
    extracted_text: string | null;
    uploaded_at: string | null;
    status: string | null;
  } | null;
  documents: Array<{
    proposal_document_id: string;
    file_name: string;
    file_type: string;
    file_size_bytes: number;
    storage_url: string;
    uploaded_at: string;
  }>;
  extraction: {
    char_count: number;
    has_extracted: boolean;
    preview_text: string | null;
    updated_at: string | null;
  } | null;
  validation: {
    validation_id: string;
    validation_score: number | null;
    confidence: string | null;
    summary: string | null;
    revenue_status: string | null;
    forecast_status: string | null;
    stage_status: string | null;
    ip_status: string | null;
    competitor_status: string | null;
    business_model_status: string | null;
    findings_json: unknown;
    created_at: string | null;
  } | null;
  evaluation: {
    evaluation_id: string;
    fit_score: number | null;
    confidence: string | null;
    mandate_summary: string | null;
    proposal_summary: string | null;
    strengths_json: unknown;
    risks_json: unknown;
    recommendations_json: unknown;
    sector_fit: number | null;
    geography_fit: number | null;
    stage_fit: number | null;
    ticket_size_fit: number | null;
    risk_adjustment: number | null;
    model_name: string | null;
    blob_path: string | null;
    created_at: string | null;
  } | null;
  report: {
    report_id: string;
    report_title: string | null;
    score: number | null;
    confidence: string | null;
    executive_summary: string | null;
    decision: string | null;
    pdf_storage_url: string | null;
    created_at: string | null;
  } | null;
  derived: {
    overallScore: number | null;
    recommendation: "Invest" | "Consider" | "Reject";
    confidenceLabel: string;
    evaluationReadiness: "ready" | "needs_documents" | "needs_extraction" | "needs_validation" | "needs_mandate";
    missingPrerequisites: string[];
    mandateFitSummary: string | null;
  };
};
