import "server-only";

// Deal Comparison / Similar Deals
//
// Compares the current proposal's latest evaluation against other proposals
// in the same tenant to find similar previously evaluated deals.
//
// Uses stored evaluation JSON files as input.
// Similarity based on: mandateSummary, proposalSummary, strengths, risks,
// structuredScores, fitScore.

import { listBlobs, downloadBlob, getDefaultContainer } from "@/lib/storage/azureBlob";
import type { EvaluationReport } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SimilarDeal {
  proposalId: string;
  fitScore: number | null;
  similarityScore: number;
  summary: string;
}

export interface FindSimilarDealsParams {
  tenantId: string;
  currentProposalId: string;
  currentEvaluation: EvaluationReport;
  topK?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

function extractProposalIdFromPath(blobPath: string, tenantId: string): string | null {
  const prefix = `tenants/${tenantId}/proposals/`;
  if (!blobPath.startsWith(prefix)) return null;
  const after = blobPath.slice(prefix.length);
  const match = after.match(/^([^/]+)\//);
  return match ? match[1] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Similarity Helpers
// ─────────────────────────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return new Set(words);
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function extractSectorKeywords(text: string): Set<string> {
  const sectorTerms = [
    "tech", "technology", "software", "saas", "healthcare", "health", "fintech",
    "finance", "biotech", "consumer", "enterprise", "b2b", "b2c", "ai", "ml",
    "climate", "energy", "edtech", "insurtech", "proptech", "marketplace",
  ];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const term of sectorTerms) {
    if (lower.includes(term)) found.add(term);
  }
  return found;
}

function extractGeographyKeywords(text: string): Set<string> {
  const geoTerms = [
    "us", "usa", "united states", "europe", "eu", "uk", "apac", "asia",
    "latin america", "latam", "emea", "north america", "global", "domestic",
  ];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const term of geoTerms) {
    if (lower.includes(term)) found.add(term);
  }
  return found;
}

function extractStageKeywords(text: string): Set<string> {
  const stageTerms = [
    "seed", "series a", "series b", "series c", "growth", "early", "late",
    "pre-seed", "venture", "expansion", "mezzanine",
  ];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const term of stageTerms) {
    if (lower.includes(term)) found.add(term);
  }
  return found;
}

function extractTicketKeywords(text: string): Set<string> {
  const ticketTerms = [
    "million", "m", "k", "ticket", "check", "round", "raise", "funding",
    "investment", "capital", "amount",
  ];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const term of ticketTerms) {
    if (lower.includes(term)) found.add(term);
  }
  return found;
}

function computeSimilarity(current: EvaluationReport, candidate: EvaluationReport): number {
  const weights = {
    sector: 0.2,
    geography: 0.15,
    stage: 0.15,
    ticket: 0.1,
    text: 0.2,
    structured: 0.1,
    fitScore: 0.1,
  };

  const currText = [
    current.mandateSummary,
    current.proposalSummary,
    (current.strengths || []).join(" "),
    (current.risks || []).join(" "),
  ].join(" ");
  const candText = [
    candidate.mandateSummary,
    candidate.proposalSummary,
    (candidate.strengths || []).join(" "),
    (candidate.risks || []).join(" "),
  ].join(" ");

  // Sector keyword overlap
  const currSector = extractSectorKeywords(currText);
  const candSector = extractSectorKeywords(candText);
  const sectorSim = jaccardSimilarity(currSector, candSector);

  // Geography keyword overlap
  const currGeo = extractGeographyKeywords(currText);
  const candGeo = extractGeographyKeywords(candText);
  const geoSim = jaccardSimilarity(currGeo, candGeo);

  // Stage keyword overlap
  const currStage = extractStageKeywords(currText);
  const candStage = extractStageKeywords(candText);
  const stageSim = jaccardSimilarity(currStage, candStage);

  // Ticket size keyword overlap
  const currTicket = extractTicketKeywords(currText);
  const candTicket = extractTicketKeywords(candText);
  const ticketSim = jaccardSimilarity(currTicket, candTicket);

  // General text overlap
  const currTokens = tokenize(currText);
  const candTokens = tokenize(candText);
  const textSim = jaccardSimilarity(currTokens, candTokens);

  // Structured scores (when both have them)
  let structuredSim = 0.5; // neutral when missing
  if (current.structuredScores && candidate.structuredScores) {
    const s1 = current.structuredScores;
    const s2 = candidate.structuredScores;
    const sectorFitSim = 1 - Math.abs(s1.sectorFit - s2.sectorFit) / 25;
    const geoFitSim = 1 - Math.abs(s1.geographyFit - s2.geographyFit) / 20;
    const stageFitSim = 1 - Math.abs(s1.stageFit - s2.stageFit) / 15;
    const ticketFitSim = 1 - Math.abs(s1.ticketSizeFit - s2.ticketSizeFit) / 15;
    structuredSim = (sectorFitSim + geoFitSim + stageFitSim + ticketFitSim) / 4;
  }

  // Fit score closeness
  let fitSim = 0.5;
  if (
    current.fitScore !== null &&
    candidate.fitScore !== null &&
    typeof current.fitScore === "number" &&
    typeof candidate.fitScore === "number"
  ) {
    fitSim = 1 - Math.abs(current.fitScore - candidate.fitScore) / 100;
    fitSim = Math.max(0, Math.min(1, fitSim));
  }

  const score =
    weights.sector * sectorSim +
    weights.geography * geoSim +
    weights.stage * stageSim +
    weights.ticket * ticketSim +
    weights.text * textSim +
    weights.structured * structuredSim +
    weights.fitScore * fitSim;

  return Math.round(score * 100) / 100;
}

function generateOneLineSummary(
  current: EvaluationReport,
  candidate: EvaluationReport,
  similarityScore: number
): string {
  const parts: string[] = [];
  if (candidate.fitScore !== null) {
    parts.push(`Fit ${candidate.fitScore}/100`);
  }
  parts.push(`${Math.round(similarityScore * 100)}% similar`);
  if (candidate.proposalSummary) {
    const truncated = candidate.proposalSummary.slice(0, 80).trim();
    if (truncated.length >= 80) {
      parts.push(`${truncated}...`);
    } else {
      parts.push(truncated);
    }
  }
  return parts.join(" — ") || "Similar deal";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main API
// ─────────────────────────────────────────────────────────────────────────────

export async function findSimilarDeals(
  params: FindSimilarDealsParams
): Promise<SimilarDeal[]> {
  const { tenantId, currentProposalId, currentEvaluation, topK = 5 } = params;

  console.log("[dealComparison] current proposal loaded:", currentProposalId);

  const container = getDefaultContainer();
  const prefix = `tenants/${tenantId}/proposals/`;

  const blobs = await listBlobs({ container, prefix });

  const evaluationBlobs = blobs.filter((b) => b.path.endsWith("/evaluation.json"));

  const byProposal = new Map<string, { path: string; lastModified: string }[]>();
  for (const blob of evaluationBlobs) {
    const proposalId = extractProposalIdFromPath(blob.path, tenantId);
    if (!proposalId || proposalId === currentProposalId) continue;

    const list = byProposal.get(proposalId) ?? [];
    list.push({ path: blob.path, lastModified: blob.lastModified });
    byProposal.set(proposalId, list);
  }

  for (const [, list] of byProposal) {
    list.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  }

  const candidatePaths = Array.from(byProposal.entries()).map(([pid, list]) => ({
    proposalId: pid,
    blobPath: list[0]!.path,
  }));

  console.log("[dealComparison] comparison candidate count:", candidatePaths.length);

  const scored: Array<{ proposalId: string; report: EvaluationReport; score: number }> = [];

  for (const { proposalId, blobPath } of candidatePaths) {
    try {
      const result = await downloadBlob(container, blobPath);
      if (!result) continue;

      const report = JSON.parse(result.buffer.toString("utf-8")) as EvaluationReport;
      if (!report || typeof report !== "object") continue;

      const score = computeSimilarity(currentEvaluation, report);
      scored.push({ proposalId, report, score });
    } catch {
      // Skip malformed evaluations
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);

  console.log("[dealComparison] top similar proposals selected:", top.length);

  return top.map(({ proposalId, report, score }) => ({
    proposalId,
    fitScore: report.fitScore ?? null,
    similarityScore: score,
    summary: generateOneLineSummary(currentEvaluation, report, score),
  }));
}
