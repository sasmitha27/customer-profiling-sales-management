# 🚀 Quick Start Guide

## Get Started in 3 Steps

### Step 1: Start the Application
```bash
# Make sure Docker is running on your machine
docker-compose up -d
```

Wait 1-2 minutes for all services to start.

### Step 2: Access the Application
Open your browser and go to: **http://localhost:3000**

### Step 3: Login
```
Username: admin
Password: adminpass
```

## 🎯 What You Can Do

### Dashboard
View real-time analytics including:
- Total sales and revenue
- Outstanding and overdue amounts
- Customer risk distribution
- Top products and high-value customers

### Customer Management
1. Click "Customers" in the sidebar
2. Add new customers with complete profiling
3. Upload documents (NIC, guarantor docs, etc.)
4. Track customer risk flags (Green/Yellow/Red)
5. View customer purchase history

### Create a Sale
1. Go to "Sales" → "New Sale"
2. Select customer
3. Add products
4. Choose payment type:
   - Cash (immediate)
   - Credit (30 days)
   - Installment (custom duration)
5. System automatically generates invoice

### Record Payments
1. Go to "Payments" → "Record Payment"
2. Select invoice
3. Enter payment amount and method
4. System automatically:
   - Updates invoice status
   - Recalculates customer risk flag
   - Updates installment schedule

### Generate Reports
1. Go to "Reports"
2. Select report type:
   - Sales Report
   - Payment Report
   - Customer Report
   - Overdue Report
3. Choose format: PDF or Excel
4. Download instantly

## 🧪 Test Scenarios

### Scenario 1: Create a High-Risk Customer
1. Create a customer
2. Create a sale with installment payment
3. Don't record any payments
4. Wait for due date to pass
5. Customer flag automatically turns RED

### Scenario 2: Process a Full Sale
1. Add a new product (e.g., "Dining Table")
2. Create a customer
3. Create a sale with the product
4. Record full payment
5. Invoice status becomes "PAID"
6. Customer flag stays GREEN

### Scenario 3: Track Overdue Payments
1. Go to Dashboard
2. Check "Late Payments Dashboard"
3. See:
   - Due today
   - Overdue (sorted by amount)
   - Days overdue
4. Click customer to view details

## 🔧 Troubleshooting

### Services Not Starting
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Restart services
docker-compose restart
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d
```

### Can't Access Frontend
- Ensure port 3000 is not in use
- Check if backend is running on port 5000
- Clear browser cache

## 📱 API Testing

### Using cURL
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpass"}'

# Get customers (replace TOKEN with actual token)
curl http://localhost:5000/api/customers \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman
1. Import collection from `/docs/postman-collection.json`
2. Set environment variable: `baseUrl = http://localhost:5000`
3. Login to get token
4. Use token in subsequent requests

## 🎓 Next Steps

1. **Customize** - Modify colors, logos, and branding
2. **Add Features** - Extend with new modules
3. **Deploy** - Deploy to production server
4. **Scale** - Add more services as needed

## 📞 Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review API endpoints and schemas
- Check logs: `docker-compose logs -f`

## ⚡ Performance Tips

- Dashboard data is cached for 5 minutes
- Use filters to narrow down large datasets
- Export reports during off-peak hours
- Regular database maintenance recommended

---

**You're all set!** 🎉 Start managing customers and sales efficiently.
