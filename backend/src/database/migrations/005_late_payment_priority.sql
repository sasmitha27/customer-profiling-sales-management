-- Migration: Add priority and last_payment_date to late_payments table
-- This migration adds priority levels for late payments (35 days = late, 60 days = high_priority)

-- Add priority column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'late_payments' AND column_name = 'priority') THEN
        ALTER TABLE late_payments 
        ADD COLUMN priority VARCHAR(20) DEFAULT 'normal' 
        CHECK (priority IN ('normal', 'late', 'high_priority'));
    END IF;
END $$;

-- Add last_payment_date column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'late_payments' AND column_name = 'last_payment_date') THEN
        ALTER TABLE late_payments 
        ADD COLUMN last_payment_date DATE;
    END IF;
END $$;

-- Update existing records with appropriate priority based on days overdue
UPDATE late_payments
SET priority = CASE 
    WHEN days_overdue >= 60 THEN 'high_priority'
    WHEN days_overdue >= 35 THEN 'late'
    ELSE 'normal'
END
WHERE status != 'resolved';

-- Create index on priority for better query performance
CREATE INDEX IF NOT EXISTS idx_late_payments_priority ON late_payments(priority);

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 005: Added priority and last_payment_date columns to late_payments table';
END $$;
