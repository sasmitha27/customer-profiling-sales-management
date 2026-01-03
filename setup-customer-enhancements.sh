#!/bin/bash

# Customer Management Enhancement - Quick Start Script
# This script guides you through applying the enhancements

set -e

echo "=========================================="
echo "Customer Management System Enhancement"
echo "Quick Start and Testing Guide"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL client (psql) not found${NC}"
    echo "Please install PostgreSQL: https://www.postgresql.org/download/"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"
echo ""

# Step 2: Database Migration
echo -e "${YELLOW}Step 2: Database Migration${NC}"
echo "This will apply the customer enhancement schema changes."
echo ""
read -p "Enter database name [customer_management]: " DB_NAME
DB_NAME=${DB_NAME:-customer_management}

read -p "Enter database user [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

echo ""
echo "Running migration..."
echo ""

if psql -U "$DB_USER" -d "$DB_NAME" -f backend/src/database/migrations/002_customer_guarantor_enhancements.sql; then
    echo -e "${GREEN}✓ Migration completed successfully${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    echo "Please check the error message above and fix any issues."
    exit 1
fi

echo ""

# Step 3: Verify Schema Changes
echo -e "${YELLOW}Step 3: Verifying schema changes...${NC}"

echo "Checking for customer_number column..."
if psql -U "$DB_USER" -d "$DB_NAME" -c "\d customers" | grep -q "customer_number"; then
    echo -e "${GREEN}✓ customer_number column exists${NC}"
else
    echo -e "${RED}✗ customer_number column not found${NC}"
fi

echo "Checking for customer_relationships table..."
if psql -U "$DB_USER" -d "$DB_NAME" -c "\dt" | grep -q "customer_relationships"; then
    echo -e "${GREEN}✓ customer_relationships table exists${NC}"
else
    echo -e "${RED}✗ customer_relationships table not found${NC}"
fi

echo "Checking for is_guarantor column..."
if psql -U "$DB_USER" -d "$DB_NAME" -c "\d customers" | grep -q "is_guarantor"; then
    echo -e "${GREEN}✓ is_guarantor column exists${NC}"
else
    echo -e "${RED}✗ is_guarantor column not found${NC}"
fi

echo ""

# Step 4: Test Data Generation
echo -e "${YELLOW}Step 4: Test Data Generation${NC}"
echo "Would you like to create test data for verification?"
read -p "Create test data? (y/n): " CREATE_TEST

if [[ $CREATE_TEST == "y" || $CREATE_TEST == "Y" ]]; then
    echo ""
    echo "Creating test customers..."
    
    psql -U "$DB_USER" -d "$DB_NAME" <<EOF
    -- Test Customer 1
    INSERT INTO customers (name, nic, dob, gender, mobile_primary, permanent_address, created_by)
    VALUES ('Test Customer 1', '123456789V', '1990-01-01', 'male', '+94712345678', '123 Test St', 1)
    ON CONFLICT (nic) DO NOTHING;
    
    -- Test Customer 2 (as guarantor)
    INSERT INTO customers (name, nic, dob, gender, mobile_primary, permanent_address, is_guarantor, created_by)
    VALUES ('Test Guarantor 1', '987654321V', '1985-05-15', 'female', '+94723456789', '456 Guarantor Ave', TRUE, 1)
    ON CONFLICT (nic) DO NOTHING;
    
    -- Create relationship
    INSERT INTO customer_relationships (customer_id, guarantor_id, relationship_type, created_by)
    SELECT c1.id, c2.id, 'guarantor', 1
    FROM customers c1, customers c2
    WHERE c1.nic = '123456789V' AND c2.nic = '987654321V'
    ON CONFLICT DO NOTHING;
    
    SELECT 'Test data created successfully' as status;
EOF
    
    echo -e "${GREEN}✓ Test data created${NC}"
fi

echo ""

# Step 5: Backend Setup
echo -e "${YELLOW}Step 5: Backend Setup${NC}"
echo "Installing/updating backend dependencies..."
cd backend

if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ package.json not found in backend directory${NC}"
fi

cd ..
echo ""

# Step 6: Verification Queries
echo -e "${YELLOW}Step 6: Running verification queries...${NC}"
echo ""

echo "Checking customer numbers..."
psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT customer_number, name, nic, is_guarantor FROM customers LIMIT 5;"

echo ""
echo "Checking customer relationships..."
psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM customer_guarantors LIMIT 5;"

echo ""

# Step 7: Testing Checklist
echo -e "${YELLOW}Step 7: Testing Checklist${NC}"
echo ""
echo "Please verify the following manually:"
echo ""
echo "□ Customer numbers are in format CUST-YYYYMMDD-XXXXX"
echo "□ NIC values are unique and case-insensitive"
echo "□ Mobile numbers are unique and case-insensitive"
echo "□ Guarantor relationships are visible"
echo "□ is_guarantor flag is set correctly"
echo ""

# Step 8: Start Backend
echo -e "${YELLOW}Step 8: Starting Backend${NC}"
read -p "Start the backend server now? (y/n): " START_SERVER

if [[ $START_SERVER == "y" || $START_SERVER == "Y" ]]; then
    cd backend
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    echo ""
    echo "Backend running at: http://localhost:5000"
    echo "To stop: kill $BACKEND_PID"
    cd ..
fi

echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}Enhancement Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "📚 Documentation Files:"
echo "  - CUSTOMER_ENHANCEMENT_GUIDE.md       (API Documentation)"
echo "  - CUSTOMER_LOGIC_PSEUDOCODE.md        (Implementation Details)"
echo "  - CUSTOMER_ENHANCEMENT_SUMMARY.md     (Overview)"
echo ""
echo "🔧 Key Files Modified:"
echo "  - backend/src/controllers/customer.controller.ts"
echo "  - backend/src/utils/customerValidation.ts"
echo "  - backend/src/routes/customer.routes.ts"
echo "  - backend/src/database/migrations/002_customer_guarantor_enhancements.sql"
echo ""
echo "🧪 Test the API:"
echo "  1. Create customer: POST /api/customers"
echo "  2. Add guarantor: POST /api/customers/:id/guarantors"
echo "  3. Get guarantors: GET /api/customers/:id/guarantors"
echo "  4. Validate uniqueness: POST /api/customers/validate/uniqueness"
echo ""
echo "📖 Read CUSTOMER_ENHANCEMENT_GUIDE.md for detailed API examples!"
echo ""
echo -e "${GREEN}Ready for production! 🚀${NC}"
