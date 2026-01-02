# 🎯 Getting Started Guide

Welcome! This guide will help you get the Customer Profiling & Sales Management System up and running in minutes.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Docker Desktop** installed and running
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Verify: `docker --version` and `docker-compose --version`

- ✅ **At least 4GB RAM** available for Docker
- ✅ **Ports available**: 3000, 5000, 5432, 6379

---

## 🚀 Method 1: Automated Setup (Recommended)

### For macOS/Linux:
```bash
cd customer-profiling-sales-management
./setup.sh
```

### For Windows:
```bash
cd customer-profiling-sales-management
setup.bat
```

**That's it!** The script will:
1. Check if Docker is running
2. Create necessary directories
3. Build and start all containers
4. Verify services are running

**Time**: ~2-3 minutes

---

## 🔧 Method 2: Manual Setup

### Step 1: Start Docker Desktop
Make sure Docker Desktop is running on your computer.

### Step 2: Navigate to Project
```bash
cd customer-profiling-sales-management
```

### Step 3: Create Environment File
```bash
# Copy the example environment file
cp backend/.env.example backend/.env
```

### Step 4: Start All Services
```bash
# Build and start all containers
docker-compose up -d --build
```

### Step 5: Wait for Services
```bash
# Watch the logs to see when everything is ready
docker-compose logs -f

# Or check status
docker-compose ps
```

**Time**: ~3-5 minutes

---

## ✅ Verify Installation

### Check Service Health

1. **Backend API**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"OK"}`

2. **Frontend**
   - Open browser: http://localhost:3000
   - Should see login page

3. **Database**
   ```bash
   docker-compose exec postgres psql -U postgres -d customer_profiling_db -c "SELECT COUNT(*) FROM users;"
   ```
   Should show user count

### Check Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

---

## 🔐 First Login

### Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

### Test Credentials
Use these credentials to login:

**Admin Account** (Full Access)
```
Username: admin
Password: adminpass
```

**Alternative Test Accounts:**
```
Sales Officer:
Username: sales1
Password: sales123

Accountant:
Username: accountant1
Password: sales123

Manager:
Username: manager1
Password: sales123
```

---

## 🎓 First Steps Tutorial

### 1. Explore the Dashboard
- After login, you'll see the main dashboard
- View sales summary, outstanding amounts, customer distribution
- Interactive charts show trends

### 2. Create Your First Customer

**Click: Customers → Add Customer**

Fill in:
- Name: John Doe
- NIC: 199012345678
- Date of Birth: 1990-01-15
- Gender: Male
- Mobile: 0771234567
- Permanent Address: 123 Main St, Colombo
- Current Address: Same as permanent

Employment Details:
- Employment Type: Permanent
- Company: ABC Corp
- Monthly Salary: 75000
- Payment Type: Bank Transfer

**Click: Save**

### 3. Add a Product

**Click: Products → Add Product**

Fill in:
- Name: Dining Table Set
- SKU: DT-001
- Category: Dining
- Cost Price: 25000
- Selling Price: 35000
- Stock Quantity: 10

**Click: Save**

### 4. Create a Sale

**Click: Sales → New Sale**

1. Select Customer: John Doe
2. Add Products:
   - Product: Dining Table Set
   - Quantity: 1
   - Total: LKR 35,000
3. Payment Type: Installment
4. Duration: 6 months
5. Monthly Amount: LKR 5,833.33

**Click: Create Sale**

System automatically:
- ✅ Generates invoice
- ✅ Creates installment schedule
- ✅ Updates inventory
- ✅ Sets due dates

### 5. Record a Payment

**Click: Payments → Record Payment**

1. Select Invoice: INV-xxxxx (from the sale above)
2. Amount: 5833.33
3. Payment Method: Cash
4. Payment Date: Today
5. Notes: First installment

**Click: Record Payment**

System automatically:
- ✅ Updates invoice status
- ✅ Marks installment as paid
- ✅ Recalculates customer risk flag
- ✅ Updates outstanding balance

### 6. View Analytics

**Click: Dashboard**

Now you'll see:
- Total sales: 1
- Revenue: LKR 35,000
- Outstanding: LKR 29,166.67
- Customer flag: Green (good payment history)

### 7. Generate a Report

**Click: Reports**

1. Select: Sales Report
2. Date Range: Last 30 days
3. Format: PDF or Excel
4. Click: Generate

Report downloads instantly with all sales data.

---

## 🎯 Common Use Cases

### Scenario 1: Cash Sale
1. Create customer (or select existing)
2. Create sale with "Cash" payment type
3. Record full payment immediately
4. Invoice marked as "Paid"

### Scenario 2: Credit Sale
1. Create customer
2. Create sale with "Credit" payment type
3. Due date set to 30 days from now
4. Customer can pay in installments or full
5. System tracks overdue if payment missed

### Scenario 3: Installment Sale
1. Create customer
2. Create sale with "Installment" payment type
3. Set duration (e.g., 12 months)
4. System creates monthly schedule
5. Record payments as customer pays
6. Track which installments are paid/overdue

### Scenario 4: Handling Late Payments
1. Dashboard shows overdue invoices
2. Click overdue customer
3. View payment history
4. See risk flag (Yellow or Red)
5. Contact customer for payment
6. Record payment when received
7. Flag automatically updates to Green

### Scenario 5: Monthly Report
1. Go to Reports
2. Select "Sales Report"
3. Set date range: Last 30 days
4. Format: Excel
5. Download
6. Share with management

---

## 🔄 Daily Operations Workflow

### For Sales Officers:
**Morning:**
- Check dashboard for today's targets
- Review pending customer inquiries

**During Day:**
- Add new customers
- Create sales orders
- Upload customer documents
- Record cash payments

**Evening:**
- Review day's sales
- Update product inventory
- Follow up on pending payments

### For Accountants:
**Daily:**
- Check overdue payments
- Review payment dashboard
- Generate payment reports
- Flag high-risk customers

**Weekly:**
- Aging analysis (30/60/90 days)
- Collection prioritization
- Financial reports for management

**Monthly:**
- Comprehensive sales report
- Outstanding accounts review
- Customer risk assessment
- Performance metrics

### For Managers:
**Daily:**
- Review dashboard metrics
- Check team performance
- Monitor key indicators

**Weekly:**
- Sales trend analysis
- Product performance review
- Team meetings with data

**Monthly:**
- Executive reports
- Strategy planning
- Target setting

---

## 🛠️ Management Commands

### Start/Stop Services
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# Stop and remove all data (CAUTION!)
docker-compose down -v
```

### View Logs
```bash
# All logs
docker-compose logs

# Follow logs (live)
docker-compose logs -f

# Specific service
docker-compose logs backend
docker-compose logs postgres

# Last 100 lines
docker-compose logs --tail=100
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d customer_profiling_db

# Backup database
docker-compose exec postgres pg_dump -U postgres customer_profiling_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres customer_profiling_db < backup.sql

# Run migrations
docker-compose exec backend npm run migrate

# Seed sample data
docker-compose exec backend npm run seed
```

### Check Container Status
```bash
# List running containers
docker-compose ps

# Check resource usage
docker stats

# Inspect specific container
docker-compose logs backend
```

---

## 🔍 Troubleshooting

### Problem: Services won't start
```bash
# Solution 1: Check Docker is running
docker info

# Solution 2: Check ports are available
lsof -i :3000
lsof -i :5000
lsof -i :5432

# Solution 3: Rebuild containers
docker-compose down -v
docker-compose up -d --build
```

### Problem: Cannot login
```bash
# Solution: Reseed database
docker-compose exec backend npm run seed
```

### Problem: Database connection error
```bash
# Solution: Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Problem: Frontend shows blank page
```bash
# Solution 1: Clear browser cache
# Solution 2: Check backend is running
curl http://localhost:5000/health

# Solution 3: Check frontend logs
docker-compose logs frontend
```

### Problem: Slow performance
```bash
# Solution 1: Restart services
docker-compose restart

# Solution 2: Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Solution 3: Check resource usage
docker stats
```

---

## 📚 Additional Resources

### Documentation
- [README.md](README.md) - Full documentation
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Project overview
- [STRUCTURE.md](STRUCTURE.md) - Code structure
- [CHANGELOG.md](CHANGELOG.md) - Version history

### API Documentation
- Health Check: http://localhost:5000/health
- API Base: http://localhost:5000/api
- Endpoints documented in README.md

### Development
```bash
# Backend development
cd backend
npm install
npm run dev

# Frontend development
cd frontend
npm install
npm run dev
```

---

## 🎉 You're Ready!

You now have a fully functional Customer Profiling & Sales Management System!

### What You Can Do:
✅ Manage unlimited customers
✅ Track sales and inventory
✅ Process payments (Cash/Credit/Installment)
✅ Monitor risk flags automatically
✅ Generate comprehensive reports
✅ View real-time analytics
✅ Manage team with roles

### Next Steps:
1. Customize the system (branding, colors)
2. Add more products to catalog
3. Start adding real customers
4. Train your team
5. Deploy to production

---

## 💡 Tips for Success

1. **Regular Backups**: Backup database daily
2. **Monitor Dashboards**: Check daily for overdue payments
3. **Update Risk Flags**: System auto-updates, but verify monthly
4. **Document Training**: Train staff on workflows
5. **Performance**: Clear cache weekly for best performance

---

## 📞 Need Help?

- Review documentation files
- Check troubleshooting section
- View system logs
- Contact development team

---

**Congratulations!** 🎊 You're all set to manage your furniture sales business efficiently!

**Happy Selling!** 🚀
