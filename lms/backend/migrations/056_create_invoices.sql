-- 056_create_invoices.sql
-- Create invoices table for the Genesis Admin Portal -> Fee Management -> Invoices feature.
-- Invoices link to existing students (users), fee schedules, and payments as the source of truth.
-- All monetary figures are computed live from fee_structures + fee_payments at read/generate time,
-- so the invoice is never stale. Only invoice-specific identity/discount data is persisted here.

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES users(id),
  parent_id UUID REFERENCES users(id),
  school_id UUID REFERENCES schools(id),
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id),
  discount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  transaction_id TEXT,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_school_id ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_fee_structure_id ON invoices(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- RLS: allow all for authenticated users (consistent with other admin tables).
DO $$ BEGIN
  ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_all_invoices') THEN
    CREATE POLICY authenticated_all_invoices ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
