-- IPA analytics & workflow persistence (PostgreSQL)
-- Run after proposals / proposal_documents / funds / fund_mandates exist.

-- Optional: narrative on funds (if missing)
ALTER TABLE funds ADD COLUMN IF NOT EXISTS thesis TEXT;

-- Audit trail (replaces in-memory only when writers are enabled)
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  action VARCHAR(256) NOT NULL,
  actor_user_id VARCHAR(64) NOT NULL,
  actor_email VARCHAR(512),
  resource_type VARCHAR(128) NOT NULL,
  resource_id VARCHAR(512) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created ON audit_log (tenant_id, created_at DESC);

-- Assignments (one active row per proposal per tenant)
CREATE TABLE IF NOT EXISTS proposal_assignments (
  proposal_id VARCHAR(36) NOT NULL,
  tenant_id VARCHAR(64) NOT NULL,
  assigned_to_user_id VARCHAR(64),
  queue_id VARCHAR(64),
  assigned_by_user_id VARCHAR(64),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (proposal_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_pa_assigned_user ON proposal_assignments (tenant_id, assigned_to_user_id);

-- Aggregated extraction state per proposal (updated when extract API runs)
CREATE TABLE IF NOT EXISTS proposal_document_extractions (
  extraction_id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  proposal_id VARCHAR(36) NOT NULL,
  char_count INTEGER NOT NULL DEFAULT 0,
  has_extracted BOOLEAN NOT NULL DEFAULT FALSE,
  preview_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, proposal_id)
);
CREATE INDEX IF NOT EXISTS idx_pde_tenant_proposal ON proposal_document_extractions (tenant_id, proposal_id);

CREATE TABLE IF NOT EXISTS proposal_validations (
  validation_id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  proposal_id VARCHAR(36) NOT NULL,
  validation_score NUMERIC(8, 2),
  confidence VARCHAR(16),
  summary TEXT,
  revenue_status VARCHAR(64),
  forecast_status VARCHAR(64),
  stage_status VARCHAR(64),
  ip_status VARCHAR(64),
  competitor_status VARCHAR(64),
  business_model_status VARCHAR(64),
  findings_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pv_tenant_proposal_created ON proposal_validations (tenant_id, proposal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS proposal_evaluations (
  evaluation_id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  proposal_id VARCHAR(36) NOT NULL,
  fit_score NUMERIC(8, 2),
  confidence VARCHAR(16),
  mandate_summary TEXT,
  proposal_summary TEXT,
  strengths_json JSONB,
  risks_json JSONB,
  recommendations_json JSONB,
  sector_fit NUMERIC(8, 2),
  geography_fit NUMERIC(8, 2),
  stage_fit NUMERIC(8, 2),
  ticket_size_fit NUMERIC(8, 2),
  risk_adjustment NUMERIC(8, 2),
  model_name VARCHAR(512),
  blob_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pe_tenant_proposal_created ON proposal_evaluations (tenant_id, proposal_id, created_at DESC);

CREATE TABLE IF NOT EXISTS proposal_reports (
  report_id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  proposal_id VARCHAR(36) NOT NULL,
  report_title VARCHAR(512),
  score NUMERIC(8, 2),
  confidence VARCHAR(16),
  executive_summary TEXT,
  decision VARCHAR(64),
  pdf_storage_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prepo_tenant_proposal_created ON proposal_reports (tenant_id, proposal_id, created_at DESC);
