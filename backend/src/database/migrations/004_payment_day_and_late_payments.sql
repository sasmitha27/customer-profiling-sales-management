-- Migration: Add payment day of month preference and late payments tracking
-- Created: 2026-01-03

-- Add payment_day_of_month to sales table
ALTER TABLE sales
  ADD COLUMN payment_day_of_month INTEGER DEFAULT 1 CHECK (payment_day_of_month >= 1 AND payment_day_of_month <= 28);

COMMENT ON COLUMN sales.payment_day_of_month IS 
  'Day of month customer prefers to make installment payments (1-28)';

-- Create late_payments table to track overdue installments
CREATE TABLE IF NOT EXISTS late_payments (
    id SERIAL PRIMARY KEY,
    installment_id INTEGER REFERENCES installment_schedule(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id),
    invoice_number VARCHAR(50) NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    days_overdue INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'escalated')),
    notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_late_payments_customer ON late_payments(customer_id);
CREATE INDEX idx_late_payments_invoice ON late_payments(invoice_id);
CREATE INDEX idx_late_payments_status ON late_payments(status);
CREATE INDEX idx_late_payments_due_date ON late_payments(due_date);

COMMENT ON TABLE late_payments IS 
  'Tracks installments that are overdue with no payment received';
