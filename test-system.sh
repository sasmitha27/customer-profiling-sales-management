#!/bin/bash
# System Health Check Script
# Tests all major endpoints and verifies system functionality

echo "🔍 Customer Profiling & Sales Management System - Health Check"
echo "=============================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:5001/api"
FRONTEND_URL="http://localhost:3000"

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=$4
    local token=$5
    local expected_code=${6:-200}
    
    echo -n "Testing $name... "
    
    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
                -H "Authorization: Bearer $token")
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$url")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code, Expected $expected_code)"
        echo "  Response: $(echo $body | jq -r '.error.message // .message // .' 2>/dev/null || echo $body)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check service
check_service() {
    local name=$1
    local url=$2
    
    echo -n "Checking $name... "
    
    if curl -s "$url" > /dev/null; then
        echo -e "${GREEN}✓ Running${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ Not responding${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "1️⃣  Docker Services"
echo "-------------------"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null
echo ""

echo "2️⃣  Service Health"
echo "------------------"
check_service "Frontend" "$FRONTEND_URL"
check_service "Backend" "$BASE_URL"
echo ""

echo "3️⃣  Authentication Tests"
echo "------------------------"

# Test login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"adminpass"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "Admin Login... ${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "Admin Login... ${RED}✗ FAILED${NC}"
    echo "  Response: $(echo $LOGIN_RESPONSE | jq -r '.error.message // .')"
    FAILED=$((FAILED + 1))
    echo ""
    echo -e "${RED}Cannot continue without authentication token${NC}"
    exit 1
fi
echo ""

echo "4️⃣  Customer Management Tests"
echo "-----------------------------"
test_endpoint "Get Customers" "$BASE_URL/customers" "GET" "" "$TOKEN" 200
test_endpoint "Get Customer Stats" "$BASE_URL/customers/stats" "GET" "" "$TOKEN" 200
echo ""

echo "5️⃣  Product Management Tests"
echo "----------------------------"
test_endpoint "Get Products" "$BASE_URL/products" "GET" "" "$TOKEN" 200
echo ""

echo "6️⃣  Sales Management Tests"
echo "--------------------------"
test_endpoint "Get Sales" "$BASE_URL/sales" "GET" "" "$TOKEN" 200
test_endpoint "Get Sales Stats" "$BASE_URL/sales/stats" "GET" "" "$TOKEN" 200
echo ""

echo "7️⃣  Payment Management Tests"
echo "----------------------------"
test_endpoint "Get Payments" "$BASE_URL/payments" "GET" "" "$TOKEN" 200
test_endpoint "Get Payment Stats" "$BASE_URL/payments/stats" "GET" "" "$TOKEN" 200
echo ""

echo "8️⃣  Dashboard Tests"
echo "-------------------"
test_endpoint "Sales Summary" "$BASE_URL/dashboard/sales-summary" "GET" "" "$TOKEN" 200
test_endpoint "Payment Summary" "$BASE_URL/dashboard/payment-summary" "GET" "" "$TOKEN" 200
test_endpoint "Customer Summary" "$BASE_URL/dashboard/customer-summary" "GET" "" "$TOKEN" 200
test_endpoint "Product Performance" "$BASE_URL/dashboard/product-performance" "GET" "" "$TOKEN" 200
test_endpoint "High Value Customers" "$BASE_URL/dashboard/high-value-customers" "GET" "" "$TOKEN" 200
echo ""

echo "9️⃣  User Management Tests"
echo "-------------------------"
test_endpoint "Get Users" "$BASE_URL/users" "GET" "" "$TOKEN" 200
test_endpoint "Get Current User" "$BASE_URL/users/me" "GET" "" "$TOKEN" 200
echo ""

echo "=============================================================="
echo "📊 Test Summary"
echo "=============================================================="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is fully operational.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
