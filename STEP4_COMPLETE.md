# ✅ Step 4 Complete: Add Customers

## 🎉 Success! Customers Created

You now have **3 customer profiles** in your system:

### Customer 1: Sarah Johnson 🟢
- **ID**: 1
- **NIC**: 198512345670
- **Risk Flag**: Green (Low Risk)
- **Occupation**: Senior Developer at Tech Solutions Ltd
- **Income**: Rs. 200,000/month
- **Status**: Stable, high-income professional

### Customer 2: Robert Kumar 🟢
- **ID**: 2
- **NIC**: 199512345672
- **Risk Flag**: Green (Low Risk)
- **Occupation**: Sales Assistant at Local Furniture Shop
- **Income**: Rs. 45,000/month
- **Status**: Young professional, moderate income

### Customer 3: Priya Fernando 🟢
- **ID**: 3
- **NIC**: 198712345674
- **Risk Flag**: Green (Low Risk)
- **Occupation**: Business Owner (Fernando Enterprises)
- **Income**: Rs. 300,000/month
- **Status**: Established business owner, high income

---

## 🌐 View Your Customers

### Option 1: Web Interface (Recommended)
1. Go to http://localhost:3000
2. Login with: `admin` / `adminpass`
3. Click **"Customers"** in the sidebar
4. You'll see all 3 customers listed with their risk flags

### Option 2: API
```bash
TOKEN=$(curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpass"}' \
  | jq -r '.data.token')

curl -s http://localhost:5001/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

---

## 📋 What You Can Do Now

### 1. View Customer Details
- Click on any customer name
- See full profile information
- View employment details
- Check guarantor information
- See document uploads (if any)
- View risk flag calculation

### 2. Create a Sale for a Customer
- Navigate to **Sales** page
- Click **"Create New Sale"**
- Select a customer (Sarah, Robert, or Priya)
- Add products
- Choose payment type:
  - 💵 Cash (immediate payment)
  - 💳 Credit (pay later)
  - 📅 Installment (monthly payments)
- Generate invoice

### 3. Add More Customers
Use the automated script or add manually:
```bash
./create-test-customers.sh
```
Or visit: http://localhost:3000/customers → "Add New Customer"

### 4. Track Payments
- Go to **Payments** page
- Record payments for installment sales
- Watch risk flags update automatically
- Monitor overdue payments

### 5. View Analytics
- Go to **Dashboard**
- See customer distribution by risk flag
- View high-value customers
- Check sales trends

---

## 🎯 Try These Scenarios

### Scenario 1: Create a Cash Sale
1. Go to Sales → Create New Sale
2. Select **Sarah Johnson** (high income)
3. Add product: Sofa Set (Rs. 150,000)
4. Payment type: **Cash**
5. Click Create → Invoice generated
6. Payment recorded immediately
7. Risk flag remains **Green** ✅

### Scenario 2: Create Installment Sale
1. Go to Sales → Create New Sale
2. Select **Robert Kumar** (medium income)
3. Add product: Dining Table (Rs. 80,000)
4. Payment type: **Installment**
5. Down payment: Rs. 20,000
6. Monthly installment: Rs. 10,000 x 6 months
7. Click Create → Invoice + Schedule generated
8. Risk flag: **Green** (no missed payments yet)

### Scenario 3: Simulate Overdue Payment
1. Create installment sale
2. Wait or manually update due date in database
3. Miss a payment deadline
4. Risk flag automatically changes to **Yellow** ⚠️
5. Customer appears in "Overdue" list

---

## 📊 Customer Summary

| Customer | Risk Flag | Income | Status |
|----------|-----------|--------|--------|
| Sarah Johnson | 🟢 Green | High | Excellent |
| Robert Kumar | 🟢 Green | Medium | Good |
| Priya Fernando | 🟢 Green | Very High | Excellent |

**All customers currently have Green flags** because:
- ✅ No overdue payments (no sales yet)
- ✅ No payment history
- ✅ New profiles

Risk flags will update automatically when:
- ⚠️ Payments become overdue
- 🔴 Multiple missed payments
- ⚠️ High outstanding balances

---

## 🔄 Next Steps

### Completed ✅
- [x] System setup
- [x] Docker containers running
- [x] All tests passing (17/17)
- [x] **Customers created (3 profiles)**

### Ready for ✨
- [ ] **5. Create sales** - Process orders for customers
- [ ] **6. Record payments** - Track payment history
- [ ] **7. Generate reports** - Export customer reports
- [ ] **8. Monitor analytics** - View dashboard insights

---

## 💡 Tips

### Adding More Customers
- Each customer needs a unique NIC
- All customers start with Green flag
- Flags update automatically based on payment behavior
- Employment and guarantor details are optional but recommended

### Customer Management Best Practices
- Update contact information regularly
- Upload supporting documents (NIC, proof of address)
- Record accurate employment details
- Keep guarantor information current
- Monitor risk flags for collection priorities

---

## 📖 Need Help?

- **Full Guide**: [CUSTOMER_GUIDE.md](CUSTOMER_GUIDE.md)
- **API Reference**: [README.md](README.md)
- **User Manual**: [GETTING_STARTED.md](GETTING_STARTED.md)

---

## 🎊 Congratulations!

You've successfully completed **Step 4: Add Customers**!

Your system now has:
- ✅ 3 diverse customer profiles
- ✅ Green risk flags (all current)
- ✅ Employment details recorded
- ✅ Guarantor information stored
- ✅ Ready for sales processing

**Next**: Create your first sale! 🚀

Visit: http://localhost:3000/sales → **"Create New Sale"**
