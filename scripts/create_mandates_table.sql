-- Create mandates table for storing mandate metadata (PostgreSQL)
-- Run this against your InvestLogic app database before using Upload Mandate.

CREATE TABLE IF NOT EXISTS mandates (
  mandate_id VARCHAR(36) PRIMARY KEY,
  fund_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  status VARCHAR(50) DEFAULT 'uploaded',
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mandates_fund_id ON mandates(fund_id);
