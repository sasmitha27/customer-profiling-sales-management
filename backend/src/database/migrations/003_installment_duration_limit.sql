-- Migration: Add constraint for installment duration (1-6 months)
-- Created: 2026-01-03

-- Drop existing constraint if it exists
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_installment_check;

-- Add new constraint with duration limit
ALTER TABLE sales
  ADD CONSTRAINT sales_installment_check CHECK (
    (payment_type != 'installment') OR 
    (payment_type = 'installment' AND installment_duration >= 1 AND installment_duration <= 6 AND monthly_installment > 0)
  );

-- Add comment for documentation
COMMENT ON CONSTRAINT sales_installment_check ON sales IS 
  'Ensures installment sales have duration between 1-6 months and positive monthly payment';
