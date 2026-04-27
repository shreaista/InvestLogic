-- PostgreSQL: proposals linked to funds (run once against the InvestLogic app database)

CREATE TABLE IF NOT EXISTS proposals (
  proposal_id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  fund_id VARCHAR(36) NOT NULL,
  proposal_name VARCHAR(512) NOT NULL,
  applicant_name VARCHAR(512) NOT NULL,
  requested_amount NUMERIC(18, 2),
  sector VARCHAR(255),
  stage VARCHAR(255),
  geography VARCHAR(255),
  business_model VARCHAR(512),
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  review_priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_fund_tenant ON proposals (fund_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_tenant ON proposals (tenant_id);
