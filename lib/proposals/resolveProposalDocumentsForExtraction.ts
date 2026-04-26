import "server-only";

import type { BlobInfo } from "@/lib/evaluation/textExtraction";
import { listProposalDocuments } from "@/lib/storage/proposalDocuments";
import { listProposalDocumentsFromDb } from "@/lib/proposals/listProposalDocumentsDb";

/**
 * Prefer PostgreSQL `proposal_documents` (local uploads + metadata); if none, fall back to Azure blob listing.
 */
export async function resolveProposalDocumentsForExtraction(
  tenantId: string,
  proposalId: string
): Promise<{ sources: BlobInfo[]; fromDb: boolean; dbCount: number; blobFallbackCount: number }> {
  const rows = await listProposalDocumentsFromDb(tenantId, proposalId);
  if (rows.length > 0) {
    const sources: BlobInfo[] = rows.map((row) => ({
      blobPath: row.storage_url,
      contentType: row.file_type,
      filename: row.file_name,
      uploadedAt:
        row.uploaded_at instanceof Date ? row.uploaded_at.toISOString() : String(row.uploaded_at),
    }));
    return { sources, fromDb: true, dbCount: rows.length, blobFallbackCount: 0 };
  }

  const docsResult = await listProposalDocuments(tenantId, proposalId);
  const flat = docsResult.flat.filter((d) => !d.blobPath.includes("/evaluations/"));
  const sources: BlobInfo[] = flat.map((d) => ({
    blobPath: d.blobPath,
    contentType: d.contentType,
    filename: d.filename,
    uploadedAt: d.uploadedAt,
  }));
  return { sources, fromDb: false, dbCount: 0, blobFallbackCount: sources.length };
}
