-- ====================================================================
-- SCHEMA HARDENING & CONSTRAINT ENFORCEMENT
-- Production-Ready Database Fixes for Customer Profiling & Sales System
-- ====================================================================

-- Fix 1: Add missing NOT NULL constraints on critical fields
ALTER TABLE customer_employment 
  ALTER COLUMN customer_id SET NOT NULL,
  ADD CONSTRAINT customer_employment_unique UNIQUE (customer_id);

ALTER TABLE products 
  ALTER COLUMN cost_price SET NOT NULL,
  ALTER COLUMN selling_price SET NOT NULL,
  ALTER COLUMN stock_quantity SET NOT NULL,
  ADD CONSTRAINT products_price_positive CHECK (selling_price >= 0 AND cost_price >= 0),
  ADD CONSTRAINT products_stock_nonnegative CHECK (stock_quantity >= 0),
  ADD CONSTRAINT products_selling_ge_cost CHECK (selling_price >= cost_price * 0.5);

ALTER TABLE sales
  ALTER COLUMN total_amount SET NOT NULL,
  ALTER COLUMN customer_id SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL,
  ADD CONSTRAINT sales_amount_positive CHECK (total_amount > 0),
  ADD CONSTRAINT sales_installment_check CHECK (
    (payment_type != 'installment') OR 
    (payment_type = 'installment' AND installment_duration > 0 AND monthly_installment > 0)
  );

ALTER TABLE sales_items
  ALTER COLUMN sale_id SET NOT NULL,
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN quantity SET NOT NULL,
  ADD CONSTRAINT sales_items_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT sales_items_price_positive CHECK (unit_price > 0 AND total_price > 0);

ALTER TABLE invoices
  ALTER COLUMN customer_id SET NOT NULL,
  ADD CONSTRAINT invoices_amounts_consistent CHECK (
    total_amount = paid_amount + remaining_balance
  ),
  ADD CONSTRAINT invoices_amounts_nonnegative CHECK (
    total_amount >= 0 AND paid_amount >= 0 AND remaining_balance >= 0
  );

ALTER TABLE installment_schedule
  ALTER COLUMN invoice_id SET NOT NULL,
  ALTER COLUMN due_date SET NOT NULL,
  ALTER COLUMN amount SET NOT NULL,
  ADD CONSTRAINT installment_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT installment_paid_valid CHECK (paid_amount >= 0 AND paid_amount <= amount),
  ADD UNIQUE (invoice_id, installment_number);

ALTER TABLE payments
  ALTER COLUMN invoice_id SET NOT NULL,
  ALTER COLUMN customer_id SET NOT NULL,
  ALTER COLUMN amount SET NOT NULL,
  ALTER COLUMN payment_date SET NOT NULL,
  ALTER COLUMN recorded_by SET NOT NULL,
  ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);

ALTER TABLE documents
  ALTER COLUMN document_type SET NOT NULL,
  ALTER COLUMN uploaded_by SET NOT NULL;

-- Fix 2: Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_employment_customer ON customer_employment(customer_id);
CREATE INDEX IF NOT EXISTS idx_guarantors_customer ON guarantors(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_sale ON sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product ON sales_items(product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sale ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_installment_status ON installment_schedule(status);
CREATE INDEX IF NOT EXISTS idx_installment_composite ON installment_schedule(invoice_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_payments_date_customer ON payments(customer_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_fast_moving ON products(is_fast_moving) WHERE is_fast_moving = TRUE;

-- Fix 3: Add unique constraints for business logic
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_nic_upper ON customers(UPPER(nic));

-- Fix 4: Add triggers for automatic status updates
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update invoice status based on payment amounts
  IF NEW.remaining_balance = 0 THEN
    NEW.status = 'paid';
  ELSIF NEW.paid_amount > 0 AND NEW.remaining_balance > 0 THEN
    IF NEW.due_date < CURRENT_DATE THEN
      NEW.status = 'overdue';
    ELSE
      NEW.status = 'partial';
    END IF;
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.remaining_balance > 0 THEN
    NEW.status = 'overdue';
  ELSE
    NEW.status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_status
BEFORE INSERT OR UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- Fix 5: Add trigger for installment status
CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount >= NEW.amount THEN
    NEW.status = 'paid';
  ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount < NEW.amount THEN
    NEW.status = 'overdue';
  ELSE
    NEW.status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_installment_status
BEFORE INSERT OR UPDATE ON installment_schedule
FOR EACH ROW EXECUTE FUNCTION update_installment_status();

-- Fix 6: Add function to prevent negative stock
CREATE OR REPLACE FUNCTION check_stock_availability()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO current_stock 
  FROM products 
  WHERE id = NEW.product_id;
  
  IF current_stock < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for product ID %. Available: %, Requested: %', 
      NEW.product_id, current_stock, NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_stock_before_sale
BEFORE INSERT ON sales_items
FOR EACH ROW EXECUTE FUNCTION check_stock_availability();

-- Fix 7: Add audit log immutability
ALTER TABLE audit_logs ADD COLUMN hash VARCHAR(64);
ALTER TABLE audit_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN action SET NOT NULL;

CREATE OR REPLACE FUNCTION generate_audit_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.hash = encode(
    digest(
      COALESCE(NEW.user_id::text, '') || 
      COALESCE(NEW.action, '') || 
      COALESCE(NEW.entity_type, '') || 
      COALESCE(NEW.entity_id::text, '') || 
      COALESCE(NEW.created_at::text, ''),
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_audit_hash
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION generate_audit_hash();

-- Fix 8: Prevent audit log modification/deletion
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- Fix 9: Add reference number validation
ALTER TABLE payments ADD CONSTRAINT payment_number_format CHECK (payment_number ~ '^PAY-[0-9]+$');
ALTER TABLE invoices ADD CONSTRAINT invoice_number_format CHECK (invoice_number ~ '^INV-[0-9]+$');
ALTER TABLE sales ADD CONSTRAINT sale_number_format CHECK (sale_number ~ '^SALE-[0-9]+$');

-- Fix 10: Add customer data validation
ALTER TABLE customers 
  ADD CONSTRAINT customer_nic_format CHECK (nic ~ '^[0-9]{9}[VvXx]$|^[0-9]{12}$'),
  ADD CONSTRAINT customer_mobile_format CHECK (
    mobile_primary ~ '^[0-9]{10}$' AND 
    (mobile_secondary IS NULL OR mobile_secondary ~ '^[0-9]{10}$')
  ),
  ADD CONSTRAINT customer_dob_valid CHECK (
    dob < CURRENT_DATE AND 
    dob > CURRENT_DATE - INTERVAL '150 years'
  );

-- Fix 11: Add employment validation
ALTER TABLE customer_employment
  ADD CONSTRAINT employment_salary_positive CHECK (monthly_salary > 0),
  ADD CONSTRAINT employment_date_valid CHECK (
    start_date <= CURRENT_DATE AND 
    start_date > CURRENT_DATE - INTERVAL '80 years'
  );

-- Fix 12: Create view for customer outstanding balance
CREATE OR REPLACE VIEW customer_balances AS
SELECT 
  c.id as customer_id,
  c.name,
  c.nic,
  c.risk_flag,
  COALESCE(SUM(i.remaining_balance), 0) as outstanding_balance,
  COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_count,
  MAX(CASE WHEN i.status = 'overdue' THEN i.due_date END) as oldest_overdue_date,
  COUNT(i.id) as total_invoices,
  COALESCE(SUM(i.total_amount), 0) as total_credit_given,
  COALESCE(SUM(i.paid_amount), 0) as total_paid
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
GROUP BY c.id, c.name, c.nic, c.risk_flag;

-- Fix 13: Create view for overdue tracking
CREATE OR REPLACE VIEW overdue_tracking AS
SELECT 
  i.id as invoice_id,
  i.invoice_number,
  i.customer_id,
  c.name as customer_name,
  c.nic,
  c.mobile_primary,
  c.risk_flag,
  i.total_amount,
  i.paid_amount,
  i.remaining_balance,
  i.due_date,
  EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::integer as days_overdue,
  CASE 
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::integer <= 30 THEN '0-30'
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::integer <= 60 THEN '31-60'
    WHEN EXTRACT(DAY FROM (CURRENT_DATE - i.due_date))::integer <= 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.status IN ('overdue', 'partial', 'pending')
  AND i.due_date < CURRENT_DATE
  AND i.remaining_balance > 0
ORDER BY i.due_date ASC;

-- Fix 14: Add function for automated overdue detection (to be run daily)
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE
    AND remaining_balance > 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Fix 15: Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status_date ON invoices(customer_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_date ON sales(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_invoice ON payments(customer_id, invoice_id);

-- Fix 16: Add materialized view for dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM customers WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_customers_month,
  (SELECT COUNT(*) FROM customers) as total_customers,
  (SELECT COUNT(*) FROM customers WHERE risk_flag = 'red') as red_flag_customers,
  (SELECT COUNT(*) FROM customers WHERE risk_flag = 'yellow') as yellow_flag_customers,
  (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as revenue_month,
  (SELECT COALESCE(SUM(remaining_balance), 0) FROM invoices WHERE status IN ('pending', 'partial', 'overdue')) as total_outstanding,
  (SELECT COALESCE(SUM(remaining_balance), 0) FROM invoices WHERE status = 'overdue') as overdue_amount,
  (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_count,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days') as collections_month,
  CURRENT_TIMESTAMP as last_updated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_unique ON dashboard_stats((1));

-- Create function to refresh dashboard stats
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Fix 17: Add reference number uniqueness per day (for better tracking)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_number_unique ON payments(payment_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number_unique ON invoices(invoice_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sale_number_unique ON sales(sale_number);

-- Fix 18: Add soft delete support (for compliance)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_customers_not_deleted ON customers(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_not_deleted ON products(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_not_deleted ON sales(id) WHERE deleted_at IS NULL;

-- Fix 19: Add document encryption tracking
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS encryption_key_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS checksum VARCHAR(64);

-- Fix 20: Performance optimization - partitioning for audit logs (for high volume)
-- Note: This creates a parent table for future partitioning
-- Uncomment when audit logs exceed 1M records
-- CREATE TABLE IF NOT EXISTS audit_logs_partitioned (LIKE audit_logs INCLUDING ALL) PARTITION BY RANGE (created_at);

COMMENT ON TABLE customers IS 'Customer master data with risk profiling';
COMMENT ON TABLE invoices IS 'Sales invoices with payment tracking';
COMMENT ON TABLE installment_schedule IS 'Installment payment schedule for credit sales';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for all system changes';
COMMENT ON VIEW customer_balances IS 'Real-time customer outstanding balances';
COMMENT ON VIEW overdue_tracking IS 'Overdue invoice monitoring with aging buckets';
