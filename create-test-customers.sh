#!/bin/bash
# Automated script to create 5 diverse test customers

echo "🚀 Creating Test Customers..."
echo "=============================="
echo ""

# Get authentication token
echo "🔐 Authenticating..."
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpass"}' \
  | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Authentication failed. Is the backend running?"
    exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Customer 1: Sarah Johnson (High income, stable)
echo "Creating Customer 1: Sarah Johnson (Tech Professional)..."
RESULT=$(curl -s -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Sarah Johnson",
    "nic": "198512345670",
    "dob": "1985-06-15",
    "gender": "female",
    "mobile_primary": "+94771234560",
    "email": "sarah.j@example.com",
    "permanent_address": "789 Oak Avenue, Kandy",
    "employment": {
      "employment_type": "permanent",
      "company_name": "Tech Solutions Ltd",
      "job_title": "Senior Developer",
      "work_address": "Tech Park, Colombo 03",
      "monthly_salary": 200000,
      "payment_type": "bank_transfer",
      "start_date": "2016-01-15"
    },
    "guarantor": {
      "name": "Michael Johnson",
      "nic": "198012345671",
      "mobile": "+94771234561",
      "relationship": "Husband",
      "address": "789 Oak Avenue, Kandy",
      "workplace": "ABC Corporation"
    }
  }')

if [ "$(echo $RESULT | jq -r '.success')" = "true" ]; then
    CUSTOMER_ID=$(echo $RESULT | jq -r '.data.id')
    echo "   ✅ Sarah Johnson created (ID: $CUSTOMER_ID) - Expected Risk: 🟢 Green"
else
    echo "   ❌ Failed: $(echo $RESULT | jq -r '.error.message')"
fi
echo ""

# Customer 2: Robert Kumar (Medium income)
echo "Creating Customer 2: Robert Kumar (Sales Assistant)..."
RESULT=$(curl -s -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Robert Kumar",
    "nic": "199512345672",
    "dob": "1995-03-22",
    "gender": "male",
    "mobile_primary": "+94771234562",
    "email": "robert.k@example.com",
    "permanent_address": "321 Beach Road, Galle",
    "employment": {
      "employment_type": "permanent",
      "company_name": "Local Furniture Shop",
      "job_title": "Sales Assistant",
      "work_address": "Main Street, Galle",
      "monthly_salary": 45000,
      "payment_type": "cash",
      "start_date": "2022-06-01"
    },
    "guarantor": {
      "name": "Anita Kumar",
      "nic": "199012345673",
      "mobile": "+94771234563",
      "relationship": "Sister",
      "address": "322 Beach Road, Galle",
      "workplace": "Self Employed"
    }
  }')

if [ "$(echo $RESULT | jq -r '.success')" = "true" ]; then
    CUSTOMER_ID=$(echo $RESULT | jq -r '.data.id')
    echo "   ✅ Robert Kumar created (ID: $CUSTOMER_ID) - Expected Risk: 🟢 Green"
else
    echo "   ❌ Failed: $(echo $RESULT | jq -r '.error.message')"
fi
echo ""

# Customer 3: Priya Fernando (Business owner)
echo "Creating Customer 3: Priya Fernando (Business Owner)..."
RESULT=$(curl -s -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Priya Fernando",
    "nic": "198712345674",
    "dob": "1987-11-08",
    "gender": "female",
    "mobile_primary": "+94771234564",
    "email": "priya.f@example.com",
    "permanent_address": "555 Business Park, Colombo 02",
    "employment": {
      "employment_type": "self_employed",
      "company_name": "Fernando Enterprises",
      "job_title": "Owner",
      "work_address": "555 Business Park, Colombo 02",
      "monthly_salary": 300000,
      "payment_type": "bank_transfer",
      "start_date": "2014-03-01"
    },
    "guarantor": {
      "name": "Ravi Fernando",
      "nic": "198512345675",
      "mobile": "+94771234565",
      "relationship": "Spouse",
      "address": "555 Business Park, Colombo 02",
      "workplace": "Government Service"
    }
  }')

if [ "$(echo $RESULT | jq -r '.success')" = "true" ]; then
    CUSTOMER_ID=$(echo $RESULT | jq -r '.data.id')
    echo "   ✅ Priya Fernando created (ID: $CUSTOMER_ID) - Expected Risk: 🟢 Green"
else
    echo "   ❌ Failed: $(echo $RESULT | jq -r '.error.message')"
fi
echo ""

# Customer 4: David Silva (Government employee)
echo "Creating Customer 4: David Silva (Teacher)..."
RESULdob": "1992-09-14",
    "gender": "male",
    "mobile_primary": "+94771234566",
    "email": "david.s@example.com",
    "permanent_address": "88 Temple Road, Negombo",
    "employment": {
      "employment_type": "permanent",
      "company_name": "Ministry of Education",
      "job_title": "Teacher",
      "work_address": "St. Mary's School, Negombo",
      "monthly_salary": 75000,
      "payment_type": "bank_transfer",
      "start_date": "2012-01-10"
    },
    "guarantor": {
      "name": "Maria Silva",
      "nic": "199112345677",
      "mobile": "+94771234567",
      "relationship": "Wife",
      "address": "88 Temple Road, Negombo",
      "workplace": "Private School"
    }
  }')

if [ "$(echo $RESULT | jq -r '.success')" = "true" ]; then
    CUSTOMER_ID=$(echo $RESULT | jq -r '.data.id')
    echo "   ✅ David Silva created (ID: $CUSTOMER_ID) - Expected Risk: 🟢 Green"
else
    echo "   ❌ Failed: $(echo $RESULT | jq -r '.error.message')"
fi
echo ""

# Customer 5: Amara Perera (Young professional)
echo "Creating Customer 5: Amara Perera (Marketing Executive)..."
RESULdob": "1998-12-05",
    "gender": "female",
    "mobile_primary": "+94771234568",
    "email": "amara.p@example.com",
    "permanent_address": "12 Garden Lane, Colombo 05",
    "employment": {
      "employment_type": "permanent",
      "company_name": "Digital Marketing Agency",
      "job_title": "Marketing Executive",
      "work_address": "Union Place, Colombo 02",
      "monthly_salary": 65000,
      "payment_type": "bank_transfer",
      "start_date": "2021-07-15"
    },
    "guarantor": {
      "name": "Nimal Perera",
      "nic": "196512345679",
      "mobile": "+94771234569",
      "relationship": "Father",
      "address": "13 Garden Lane, Colombo 05",
      "workplace": "Retired
    "guarantor": {
      "name": "Nimal Perera",
      "nic": "196512345679",
      "phone": "+94771234569",
      "relationship": "Father",
      "address": "13 Garden Lane, Colombo 05"
    }
  }')

if [ "$(echo $RESULT | jq -r '.success')" = "true" ]; then
    CUSTOMER_ID=$(echo $RESULT | jq -r '.data.id')
    echo "   ✅ Amara Perera created (ID: $CUSTOMER_ID) - Expected Risk: 🟢 Green"
else
    echo "   ❌ Failed: $(echo $RESULT | jq -r '.error.message')"
fi
echo ""

echo "=============================="
echo "🎉 Customer Creation Complete!"
echo "=============================="
echo ""
echo "📊 Summary:"
echo "   • 5 diverse customer profiles created"
echo "   • All with employment details"
echo "   • All with guarantor information"
echo "   • All starting with 🟢 Green risk flag"
echo ""
echo "🌐 View in UI:"
echo "   http://localhost:3000/customers"
echo ""
echo "📋 Customer Profiles:"
echo "   1. Sarah Johnson - Tech Professional (High Income)"
echo "   2. Robert Kumar - Sales Assistant (Medium Income)"
echo "   3. Priya Fernando - Business Owner (Very High Income)"
echo "   4. David Silva - Teacher (Stable Income)"
echo "   5. Amara Perera - Marketing Executive (Young Professional)"
echo ""
echo "✨ Next Steps:"
echo "   1. Login to http://localhost:3000"
echo "   2. Navigate to Customers page"
echo "   3. Click on any customer to view full profile"
echo "   4. Create a sale for a customer"
echo "   5. Track payments and watch risk flags update"
echo ""
