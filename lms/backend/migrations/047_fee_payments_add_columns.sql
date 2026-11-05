-- 047_fee_payments_add_columns.sql
-- Add columns referenced by recordPayment service but missing from initial schema

ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
