-- 006_invoice_sequence.sql
-- Create persistent sequence for invoice numbers and backfill existing invoices
BEGIN;

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Set sequence to current max numeric part of existing invoice_number (if any)
DO $$
DECLARE
  maxn bigint;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(invoice_number, '^INV-', ''))::bigint), 0) INTO maxn FROM invoices;
  IF maxn IS NULL THEN
    maxn := 0;
  END IF;
  PERFORM setval('invoice_number_seq', maxn);
END$$;

-- Backfill missing or non-conforming invoice_number values with INV-000001 style entries
UPDATE invoices
SET invoice_number = 'INV-' || to_char(nextval('invoice_number_seq')::bigint, 'FM000000')
WHERE invoice_number IS NULL OR invoice_number !~ '^INV-[0-9]{6}$';

COMMIT;
