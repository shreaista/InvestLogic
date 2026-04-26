-- PostgreSQL: proposal document uploads (run once against IPA DB)

CREATE TABLE IF NOT EXISTS proposal_documents (
  proposal_document_id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  proposal_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(512) NOT NULL,
  file_type VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_url TEXT NOT NULL,
  uploaded_by VARCHAR(64) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_documents_proposal
  ON proposal_documents (proposal_id, tenant_id);
