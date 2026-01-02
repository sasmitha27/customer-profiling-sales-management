# 👥 Complete Guide: Adding Customers

This guide shows you how to create customer profiles in your system.

---

## 🎯 Method 1: Using the Web Interface (Recommended)

### Step 1: Login
1. Open http://localhost:3000
2. Login with: `admin` / `adminpass`

### Step 2: Navigate to Customers
1. Click **"Customers"** in the left sidebar
2. Click **"Add New Customer"** button (top right)

### Step 3: Fill Customer Information

#### Basic Information (Required)
- **Full Name**: John Doe
- **NIC**: 199012345678
- **Phone**: +94771234567
- **Email**: john.doe@example.com
- **Address**: 123 Main Street, Colombo 07

#### Employment Details
- **Employer Name**: ABC Company Ltd
- **Designation**: Manager
- **Monthly Income**: 150000
- **Employment Duration**: 5 years

#### Guarantor/Witness
- **Name**: Jane Smith
- **NIC**: 198512345679
- **Phone**: +94771234568
- **Relationship**: Sister
- **Address**: 456 Side Street, Colombo 03

#### Documents (Optional)
- Upload NIC copy
- Upload proof of address
- Upload employment letter

### Step 4: Save
Click **"Create Customer"** button

✅ **Success!** Customer profile created with auto-calculated risk flag (Green)

---

## 🎯 Method 2: Using the API

### Example: Create Customer via API

```bash
# 1. Login first to get token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpass"}' \
  | jq -r '.data.token')

# 2. Create customer
curl -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "John Doe",
    "nic": "199012345678",
    "phone": "+94771234567",
    "email": "john.doe@example.com",
    "address": "123 Main Street, Colombo 07",
    "employment": {
      "employer_name": "ABC Company Ltd",
      "designation": "Manager",
      "monthly_income": 150000,
      "employment_duration_years": 5
    },
    "guarantor": {
      "name": "Jane Smith",
      "nic": "198512345679",
      "phone": "+94771234568",
      "relationship": "Sister",
      "address": "456 Side Street, Colombo 03"
    }
  }'
```

---

## 📋 Sample Customer Profiles

### Profile 1: Low Risk Customer (Green Flag)
```json
{
  "name": "Sarah Johnson",
  "nic": "198512345670",
  "phone": "+94771234560",
  "email": "sarah.j@example.com",
  "address": "789 Oak Avenue, Kandy",
  "employment": {
    "employer_name": "Tech Solutions Ltd",
    "designation": "Senior Developer",
    "monthly_income": 200000,
    "employment_duration_years": 8
  },
  "guarantor": {
    "name": "Michael Johnson",
    "nic": "198012345671",
    "phone": "+94771234561",
    "relationship": "Husband",
    "address": "789 Oak Avenue, Kandy"
  }
}
```

### Profile 2: Medium Risk Scenario (Yellow Flag)
```json
{
  "name": "Robert Kumar",
  "nic": "199512345672",
  "phone": "+94771234562",
  "email": "robert.k@example.com",
  "address": "321 Beach Road, Galle",
  "employment": {
    "employer_name": "Local Shop",
    "designation": "Sales Assistant",
    "monthly_income": 45000,
    "employment_duration_years": 2
  },
  "guarantor": {
    "name": "Anita Kumar",
    "nic": "199012345673",
    "phone": "+94771234563",
    "relationship": "Sister",
    "address": "322 Beach Road, Galle"
  }
}
```

### Profile 3: Business Owner
```json
{
  "name": "Priya Fernando",
  "nic": "198712345674",
  "phone": "+94771234564",
  "email": "priya.f@example.com",
  "address": "555 Business Park, Colombo 02",
  "employment": {
    "employer_name": "Fernando Enterprises (Self)",
    "designation": "Owner",
    "monthly_income": 300000,
    "employment_duration_years": 10
  },
  "guarantor": {
    "name": "Ravi Fernando",
    "nic": "198512345675",
    "phone": "+94771234565",
    "relationship": "Spouse",
    "address": "555 Business Park, Colombo 02"
  }
}
```

---

## 🤖 Automated: Create Multiple Test Customers

Save this script as `create-test-customers.sh`:

```bash
#!/bin/bash

# Get authentication token
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpass"}' \
  | jq -r '.data.token')

echo "Creating test customers..."

# Customer 1: Sarah Johnson (High income, stable)
curl -s -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Sarah Johnson",
    "nic": "198512345670",
    "phone": "+94771234560",
    "email": "sarah.j@example.com",
    "address": "789 Oak Avenue, Kandy",
    "employment": {
      "employer_name": "Tech Solutions Ltd",
      "designation": "Senior Developer",
      "monthly_income": 200000,
      "employment_duration_years": 8
    },
    "guarantor": {
      "name": "Michael Johnson",
      "nic": "198012345671",
      "phone": "+94771234561",
      "relationship": "Husband",
      "address": "789 Oak Avenue, Kandy"
    }
  }' | jq -r '.success'
echo "✓ Created Sarah Johnson"

# Customer 2: Robert Kumar (Medium income)
curl -s -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Robert Kumar",
    "nic": "199512345672",
    "phone": "+94771234562",
    "email": "robert.k@example.com",
    "address": "321 Beach Road, Galle",
    "employment": {
      "employer_name": "Local Shop",
      "designation": "Sales Assistant",
      "monthly_income": 45000,
      "employment_duration_years": 2
    },
    "guarantor": {
      "name": "Anita Kumar",
      "nic": "199012345673",
      "phone": "+94771234563",
      "relationship": "Sister",
      "address": "322 Beach Road, Galle"
    }
  }' | jq -r '.success'
echo "✓ Created Robert Kumar"

# Customer 3: Priya Fernando (Business owner)
curl -s -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Priya Fernando",
    "nic": "198712345674",
    "phone": "+94771234564",
    "email": "priya.f@example.com",
    "address": "555 Business Park, Colombo 02",
    "employment": {
      "employer_name": "Fernando Enterprises (Self)",
      "designation": "Owner",
      "monthly_income": 300000,
      "employment_duration_years": 10
    },
    "guarantor": {
      "name": "Ravi Fernando",
      "nic": "198512345675",
      "phone": "+94771234565",
      "relationship": "Spouse",
      "address": "555 Business Park, Colombo 02"
    }
  }' | jq -r '.success'
echo "✓ Created Priya Fernando"

# Customer 4: David Silva (Government employee)
curl -s -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "David Silva",
    "nic": "199212345676",
    "phone": "+94771234566",
    "email": "david.s@example.com",
    "address": "88 Temple Road, Negombo",
    "employment": {
      "employer_name": "Ministry of Education",
      "designation": "Teacher",
      "monthly_income": 75000,
      "employment_duration_years": 12
    },
    "guarantor": {
      "name": "Maria Silva",
      "nic": "199112345677",
      "phone": "+94771234567",
      "relationship": "Wife",
      "address": "88 Temple Road, Negombo"
    }
  }' | jq -r '.success'
echo "✓ Created David Silva"

# Customer 5: Amara Perera (Young professional)
curl -s -X POST http://localhost:5001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Amara Perera",
    "nic": "199812345678",
    "phone": "+94771234568",
    "email": "amara.p@example.com",
    "address": "12 Garden Lane, Colombo 05",
    "employment": {
      "employer_name": "Digital Marketing Agency",
      "designation": "Marketing Executive",
      "monthly_income": 65000,
      "employment_duration_years": 3
    },
    "guarantor": {
      "name": "Nimal Perera",
      "nic": "196512345679",
      "phone": "+94771234569",
      "relationship": "Father",
      "address": "13 Garden Lane, Colombo 05"
    }
  }' | jq -r '.success'
echo "✓ Created Amara Perera"

echo ""
echo "🎉 Successfully created 5 test customers!"
echo "View them at: http://localhost:3000/customers"
```

Make it executable and run:
```bash
chmod +x create-test-customers.sh
./create-test-customers.sh
```

---

## 📊 Verify Customers Created

### View in UI
1. Go to http://localhost:3000/customers
2. You should see all customers listed
3. Each will have a risk flag (Green/Yellow/Red)

### View via API
```bash
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpass"}' \
  | jq -r '.data.token')

curl -s http://localhost:5001/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.customers[] | {name: .name, nic: .nic, risk_flag: .risk_flag}'
```

---

## ✅ Customer Profile Checklist

When creating a customer, ensure:

- [x] Full name provided
- [x] Valid NIC format (12 digits)
- [x] Contact phone number
- [x] Valid email address
- [x] Complete residential address
- [x] Employment details filled
- [x] Monthly income specified
- [x] Guarantor information provided
- [x] Guarantor contact details
- [x] Documents uploaded (if available)

---

## 🎯 Next Steps After Adding Customers

1. **View Customer Details**
   - Click on any customer to see full profile
   - View employment history
   - Check guarantor details
   - See risk flag calculation

2. **Create a Sale**
   - Go to Sales page
   - Select customer
   - Add products
   - Choose payment method
   - Generate invoice

3. **Track Payments**
   - Record payments against invoices
   - Watch risk flags update automatically
   - Monitor overdue payments

4. **Generate Reports**
   - Customer list report
   - Risk analysis report
   - Export to PDF/Excel

---

## 💡 Tips

- **Risk Flags**: New customers start with Green flag
- **Updates**: Risk flags update automatically after each payment
- **Search**: Use search bar to find customers by name, NIC, or phone
- **Filter**: Filter by risk flag (Green/Yellow/Red)
- **Sort**: Sort by name, NIC, or creation date

---

## 🐛 Troubleshooting

### "NIC already exists"
- Each NIC must be unique
- Change the NIC number for test customers

### "Validation failed"
- Check all required fields are filled
- Ensure NIC is 12 digits
- Verify email format
- Check phone number format

### "Unauthorized"
- Login again to refresh token
- Ensure you have correct permissions

---

## 🎉 Success!

Once customers are created, you can:
- ✅ View customer list
- ✅ Search and filter customers
- ✅ See risk flags
- ✅ Create sales for customers
- ✅ Track payment history
- ✅ Generate reports

**Your system is ready to manage customers!** 🚀
