-- Run once against PostgreSQL: store relative path to uploaded PDF (e.g. uploads/mandates/<id>.pdf)
ALTER TABLE fund_mandates ADD COLUMN IF NOT EXISTS storage_url VARCHAR(1024);
