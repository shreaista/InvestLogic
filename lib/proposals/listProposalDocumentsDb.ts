import "server-only";

import { getPostgresPool } from "@/lib/postgres";

export interface ProposalDocumentDbRow {
  proposal_document_id: string;
  tenant_id: string;
  proposal_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_url: string;
  uploaded_at: Date;
}

/**
 * Lists proposal documents from PostgreSQL (same source as POST /api/proposals/[id]/documents).
 */
export async function listProposalDocumentsFromDb(
  tenantId: string,
  proposalId: string
): Promise<ProposalDocumentDbRow[]> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const q = await client.query(
      `SELECT
        proposal_document_id,
        tenant_id,
        proposal_id,
        file_name,
        file_type,
        file_size_bytes,
        storage_url,
        uploaded_at
       FROM proposal_documents
       WHERE proposal_id = $1 AND tenant_id = $2
       ORDER BY uploaded_at DESC`,
      [proposalId, tenantId]
    );
    return q.rows as ProposalDocumentDbRow[];
  } finally {
    client.release();
  }
}
