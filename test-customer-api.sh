#!/bin/bash

echo "==================================="
echo "Testing Customer API Endpoints"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test database first
echo "1. Testing Database Connection..."
docker exec furnitrack-db psql -U postgres -d customer_profiling_db -c "SELECT COUNT(*) as customer_count FROM customers;" 2>&1 | grep -E "customer_count|rows" && echo -e "${GREEN}✓ Database accessible${NC}" || echo -e "${RED}✗ Database error${NC}"
echo ""

# Get a login token
echo "2. Getting Authentication Token..."
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpass"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get auth token. Trying to get more info...${NC}"
  echo "Response:"
  curl -s -X POST http://localhost:5001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"adminpass"}'
  echo ""
else
  echo -e "${GREEN}✓ Successfully obtained auth token${NC}"
  echo "Token: ${TOKEN:0:20}..."
fi
echo ""

# Test GET /api/customers
echo "3. Testing GET /api/customers (List all customers)..."
RESPONSE=$(curl -s -X GET "http://localhost:5001/api/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Successfully fetched customers list${NC}"
  echo "Response preview:"
  echo "$RESPONSE" | head -c 300
  echo "..."
else
  echo -e "${RED}✗ Failed to fetch customers${NC}"
  echo "Response:"
  echo "$RESPONSE"
fi
echo ""

# Get first customer ID
echo "4. Extracting first customer ID..."
CUSTOMER_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$CUSTOMER_ID" ]; then
  echo -e "${YELLOW}⚠ No customer ID found, using ID 1${NC}"
  CUSTOMER_ID=1
else
  echo -e "${GREEN}✓ Found customer ID: $CUSTOMER_ID${NC}"
fi
echo ""

# Test GET /api/customers/:id
echo "5. Testing GET /api/customers/$CUSTOMER_ID (Get single customer)..."
CUSTOMER_RESPONSE=$(curl -s -X GET "http://localhost:5001/api/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$CUSTOMER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Successfully fetched customer details${NC}"
  echo "Customer name:" $(echo "$CUSTOMER_RESPONSE" | grep -o '"name":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗ Failed to fetch customer${NC}"
  echo "Response:"
  echo "$CUSTOMER_RESPONSE"
fi
echo ""

# Test GET /api/customers/:id/details
echo "6. Testing GET /api/customers/$CUSTOMER_ID/details (Get customer with full details)..."
DETAILS_RESPONSE=$(curl -s -X GET "http://localhost:5001/api/customers/$CUSTOMER_ID/details" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$DETAILS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Successfully fetched customer full details${NC}"
  echo "Customer name:" $(echo "$DETAILS_RESPONSE" | grep -o '"name":"[^"]*' | cut -d'"' -f4)
  echo "Has employment data:" $(echo "$DETAILS_RESPONSE" | grep -q '"employment"' && echo "Yes" || echo "No")
  echo "Has sales data:" $(echo "$DETAILS_RESPONSE" | grep -q '"sales"' && echo "Yes" || echo "No")
  echo "Has invoices data:" $(echo "$DETAILS_RESPONSE" | grep -q '"invoices"' && echo "Yes" || echo "No")
else
  echo -e "${RED}✗ Failed to fetch customer details${NC}"
  echo "Response:"
  echo "$DETAILS_RESPONSE"
fi
echo ""

echo "==================================="
echo "Test Summary"
echo "==================================="
echo ""
echo "All critical endpoints have been tested."
echo "If all tests passed, the customer page should work correctly!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000"
echo "2. Login with username: admin, password: adminpass"
echo "3. Navigate to Customers page"
echo "4. Click on a customer name to view their profile"
echo ""
