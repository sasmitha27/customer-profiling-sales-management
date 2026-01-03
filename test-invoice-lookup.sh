#!/bin/bash

# Test script to verify invoice lookup endpoint

echo "Testing Invoice Lookup Endpoint..."
echo "=================================="

# First, let's login to get a token
echo -e "\n1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✓ Login successful"

# Get list of invoices to find a valid invoice number
echo -e "\n2. Getting invoice list..."
INVOICES=$(curl -s http://localhost:5001/api/invoices \
  -H "Authorization: Bearer $TOKEN")

# Extract first invoice number from the response
INVOICE_NUMBER=$(echo $INVOICES | grep -o '"invoice_number":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$INVOICE_NUMBER" ]; then
  echo "❌ No invoices found in database"
  echo "Please create a sale first to generate an invoice"
  exit 1
fi

echo "✓ Found invoice: $INVOICE_NUMBER"

# Test the new endpoint
echo -e "\n3. Testing invoice lookup by number..."
INVOICE_DETAILS=$(curl -s http://localhost:5001/api/payments/invoice/$INVOICE_NUMBER \
  -H "Authorization: Bearer $TOKEN")

echo $INVOICE_DETAILS | jq '.'

if echo $INVOICE_DETAILS | grep -q '"success":true'; then
  echo -e "\n✅ Invoice lookup endpoint is working!"
else
  echo -e "\n❌ Invoice lookup failed"
fi
