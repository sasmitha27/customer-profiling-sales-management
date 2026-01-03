-- Migration 002: Customer Guarantor Enhancements
-- Implements unique customer IDs, duplicate prevention, and guarantor relationships

-- Step 1: Add unique customer_number to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_number VARCHAR(50) UNIQUE;

-- Generate unique customer numbers for existing customers (format: CUST-YYYYMMDD-XXXXX)
DO $$
DECLARE
    rec RECORD;
    new_customer_number VARCHAR(50);
    counter INTEGER := 1;
BEGIN
    FOR rec IN SELECT id FROM customers WHERE customer_number IS NULL ORDER BY id
    LOOP
        new_customer_number := 'CUST-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 5, '0');
        UPDATE customers SET customer_number = new_customer_number WHERE id = rec.id;
        counter := counter + 1;
    END LOOP;
END $$;

-- Make customer_number NOT NULL after populating existing records
ALTER TABLE customers ALTER COLUMN customer_number SET NOT NULL;

-- Step 2: Add unique constraints for duplicate prevention
-- Create unique index on mobile_primary (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_mobile_primary_unique 
ON customers (LOWER(mobile_primary));

-- The NIC unique constraint already exists, but ensure it's case-insensitive
DROP INDEX IF EXISTS idx_customers_nic;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_nic_unique 
ON customers (UPPER(nic));

-- Step 3: Create customer_relationships table for guarantor associations
-- This replaces the separate guarantors table approach
CREATE TABLE IF NOT EXISTS customer_relationships (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    guarantor_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'guarantor' CHECK (relationship_type IN ('guarantor', 'witness', 'co-borrower')),
    relationship_description VARCHAR(100),
    workplace VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Prevent self-referencing relationships
    CHECK (customer_id != guarantor_id),
    -- Prevent duplicate relationships
    UNIQUE (customer_id, guarantor_id, relationship_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_relationships_customer 
ON customer_relationships(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_relationships_guarantor 
ON customer_relationships(guarantor_id);

-- Step 4: Add is_guarantor flag to customers for quick identification
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_guarantor BOOLEAN DEFAULT FALSE;

-- Step 5: Create function to prevent circular guarantor relationships
CREATE OR REPLACE FUNCTION check_circular_guarantor()
RETURNS TRIGGER AS $$
DECLARE
    circular_path INTEGER[];
BEGIN
    -- Check if adding this relationship would create a circular dependency
    -- Using recursive CTE to detect cycles
    WITH RECURSIVE guarantor_chain AS (
        -- Start with the new relationship
        SELECT 
            NEW.guarantor_id as customer_id,
            NEW.customer_id as guarantor_id,
            ARRAY[NEW.customer_id, NEW.guarantor_id] as path,
            1 as depth
        
        UNION ALL
        
        -- Follow the chain of guarantor relationships
        SELECT 
            cr.guarantor_id,
            gc.guarantor_id,
            gc.path || cr.guarantor_id,
            gc.depth + 1
        FROM customer_relationships cr
        INNER JOIN guarantor_chain gc ON cr.customer_id = gc.customer_id
        WHERE NOT (cr.guarantor_id = ANY(gc.path))  -- Stop if we find a cycle
          AND gc.depth < 10  -- Prevent infinite recursion
    )
    SELECT path INTO circular_path
    FROM guarantor_chain
    WHERE customer_id = NEW.customer_id
    LIMIT 1;
    
    IF circular_path IS NOT NULL THEN
        RAISE EXCEPTION 'Circular guarantor relationship detected. Customer % is already in the guarantor chain.', NEW.customer_id
            USING ERRCODE = '23514';  -- integrity_constraint_violation
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular relationships
DROP TRIGGER IF EXISTS prevent_circular_guarantor ON customer_relationships;
CREATE TRIGGER prevent_circular_guarantor
    BEFORE INSERT OR UPDATE ON customer_relationships
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_guarantor();

-- Step 6: Create function to automatically update is_guarantor flag
CREATE OR REPLACE FUNCTION update_guarantor_flag()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark the guarantor as a guarantor
    UPDATE customers SET is_guarantor = TRUE WHERE id = NEW.guarantor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_guarantor_flag ON customer_relationships;
CREATE TRIGGER set_guarantor_flag
    AFTER INSERT ON customer_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_guarantor_flag();

-- Step 7: Create function to generate unique customer numbers
CREATE OR REPLACE FUNCTION generate_customer_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR(50);
    counter INTEGER;
    date_prefix VARCHAR(20);
BEGIN
    date_prefix := 'CUST-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-';
    
    -- Get the highest counter for today
    SELECT COALESCE(MAX(SUBSTRING(customer_number FROM '[0-9]+$')::INTEGER), 0) + 1
    INTO counter
    FROM customers
    WHERE customer_number LIKE date_prefix || '%';
    
    new_number := date_prefix || LPAD(counter::TEXT, 5, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to auto-generate customer number on insert
CREATE OR REPLACE FUNCTION set_customer_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_number IS NULL THEN
        NEW.customer_number := generate_customer_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_customer_number ON customers;
CREATE TRIGGER auto_customer_number
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_customer_number();

-- Step 9: Add updated_at trigger for customer_relationships
DROP TRIGGER IF EXISTS update_customer_relationships_updated_at ON customer_relationships;
CREATE TRIGGER update_customer_relationships_updated_at 
    BEFORE UPDATE ON customer_relationships 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Migrate existing guarantors to customer_relationships
-- This preserves existing guarantor data while moving to the new structure
DO $$
DECLARE
    guarantor_rec RECORD;
    existing_customer_id INTEGER;
    new_customer_id INTEGER;
BEGIN
    FOR guarantor_rec IN SELECT * FROM guarantors
    LOOP
        -- Check if guarantor already exists as a customer by NIC
        SELECT id INTO existing_customer_id
        FROM customers
        WHERE UPPER(nic) = UPPER(guarantor_rec.nic)
        LIMIT 1;
        
        IF existing_customer_id IS NOT NULL THEN
            -- Reuse existing customer
            new_customer_id := existing_customer_id;
        ELSE
            -- Check if guarantor exists by mobile
            SELECT id INTO existing_customer_id
            FROM customers
            WHERE LOWER(mobile_primary) = LOWER(guarantor_rec.mobile)
            LIMIT 1;
            
            IF existing_customer_id IS NOT NULL THEN
                new_customer_id := existing_customer_id;
            ELSE
                -- Create new customer record for this guarantor
                INSERT INTO customers (
                    name, 
                    nic, 
                    dob, 
                    gender, 
                    mobile_primary, 
                    permanent_address,
                    is_guarantor,
                    notes
                )
                VALUES (
                    guarantor_rec.name,
                    guarantor_rec.nic,
                    COALESCE(guarantor_rec.dob, CURRENT_DATE - INTERVAL '30 years'),  -- Default age if missing
                    'other',  -- Default gender
                    guarantor_rec.mobile,
                    guarantor_rec.address,
                    TRUE,
                    'Migrated from guarantors table'
                )
                ON CONFLICT (nic) DO NOTHING
                RETURNING id INTO new_customer_id;
            END IF;
        END IF;
        
        -- Create the relationship if we have a valid guarantor customer ID
        IF new_customer_id IS NOT NULL AND new_customer_id != guarantor_rec.customer_id THEN
            INSERT INTO customer_relationships (
                customer_id,
                guarantor_id,
                relationship_type,
                relationship_description,
                workplace
            )
            VALUES (
                guarantor_rec.customer_id,
                new_customer_id,
                'guarantor',
                guarantor_rec.relationship,
                guarantor_rec.workplace
            )
            ON CONFLICT (customer_id, guarantor_id, relationship_type) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- Step 11: Add comments for documentation
COMMENT ON TABLE customer_relationships IS 'Stores guarantor and witness relationships between customers. Guarantors are customers themselves.';
COMMENT ON COLUMN customers.customer_number IS 'System-generated unique identifier for the customer (immutable)';
COMMENT ON COLUMN customers.is_guarantor IS 'Flag indicating if this customer acts as a guarantor for any other customer';
COMMENT ON FUNCTION check_circular_guarantor() IS 'Prevents circular guarantor relationships that could create dependency loops';
COMMENT ON FUNCTION generate_customer_number() IS 'Generates unique customer numbers in format CUST-YYYYMMDD-XXXXX';

-- Step 12: Create view for easy guarantor lookup
CREATE OR REPLACE VIEW customer_guarantors AS
SELECT 
    c.id as customer_id,
    c.customer_number as customer_number,
    c.name as customer_name,
    g.id as guarantor_id,
    g.customer_number as guarantor_number,
    g.name as guarantor_name,
    g.nic as guarantor_nic,
    g.mobile_primary as guarantor_mobile,
    g.permanent_address as guarantor_address,
    cr.relationship_type,
    cr.relationship_description,
    cr.workplace as guarantor_workplace,
    cr.created_at as relationship_created_at
FROM customer_relationships cr
INNER JOIN customers c ON cr.customer_id = c.id
INNER JOIN customers g ON cr.guarantor_id = g.id
WHERE cr.relationship_type IN ('guarantor', 'witness');

COMMENT ON VIEW customer_guarantors IS 'Convenient view for querying customer-guarantor relationships with full details';

-- Optional: Add indexes for mobile_secondary if needed
CREATE INDEX IF NOT EXISTS idx_customers_mobile_secondary 
ON customers (LOWER(mobile_secondary)) 
WHERE mobile_secondary IS NOT NULL;

-- Migration complete
