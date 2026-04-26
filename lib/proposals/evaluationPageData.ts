import "server-only";

import { getProposalDetailPg, type ProposalDetailRow } from "@/lib/proposals/proposalDetail";
import {
  listEvaluations,
  downloadEvaluation,
  type EvaluationReport,
} from "@/lib/evaluation/proposalEvaluator";
import { listProposalDocuments } from "@/lib/storage/proposalDocuments";

export type EvaluationPagePayload = {
  proposal: ProposalDetailRow;
  latestReport: EvaluationReport | null;
  latestBlobPath: string | null;
  documentCount: number;
};

export async function getEvaluationPagePayload(
  tenantId: string,
  proposalId: string
): Promise<EvaluationPagePayload | null> {
  const proposal = await getProposalDetailPg(tenantId, proposalId);
  if (!proposal) return null;

  const docs = await listProposalDocuments(tenantId, proposalId);
  const flat = docs.flat.filter((d) => !d.blobPath.includes("/evaluations/"));
  const documentCount = flat.length;

  const evaluations = await listEvaluations(tenantId, proposalId, true);
  const latest = evaluations[0];

  let latestReport: EvaluationReport | null = null;
  if (latest?.blobPath) {
    latestReport = await downloadEvaluation(tenantId, proposalId, latest.blobPath);
  }

  return {
    proposal,
    latestReport,
    latestBlobPath: latest?.blobPath ?? null,
    documentCount,
  };
}
