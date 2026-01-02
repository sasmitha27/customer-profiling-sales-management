# 🚀 QUICK START GUIDE
## Deploying Production-Ready System

### Prerequisites
- Docker and Docker Compose installed
- System already running (containers up)
- Database accessible

---

## 📋 DEPLOYMENT STEPS

### 1. **Review Changes**
```bash
# Check what was fixed
cat PRODUCTION_READY_REPORT.md
```

### 2. **Apply Database Fixes**
```bash
# Execute schema hardening
docker exec -i furnitrack-db psql -U postgres -d furnitrack < backend/src/database/migrations/001_schema_hardening.sql
```

### 3. **Rebuild Backend** (Includes new validation logic)
```bash
docker-compose build backend
docker-compose up -d backend
```

### 4. **Verify System Health**
```bash
# Check database
docker exec furnitrack-db pg_isready -U postgres

# Check backend logs
docker logs furnitrack-backend --tail 50

# Check frontend
curl http://localhost:3000
```

### 5. **Run Maintenance Tasks**
```bash
# Mark overdue invoices
docker exec furnitrack-db psql -U postgres -d furnitrack -c "SELECT mark_overdue_invoices();"

# Refresh dashboard
docker exec furnitrack-db psql -U postgres -d furnitrack -c "REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;"
```

---

## 🧪 TEST CRITICAL FLOWS

### Test 1: Create Customer
```bash
curl -X POST http://localhost:5000/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "nic": "123456789V",
    "dob": "1990-01-15",
    "gender": "male",
    "mobile_primary": "0771234567",
    "permanent_address": "Test Address"
  }'
```

**Expected**: HTTP 201 with customer object

### Test 2: Create Sale
```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "payment_type": "installment",
    "installment_duration": 12,
    "items": [
      { "product_id": 1, "quantity": 1 }
    ]
  }'
```

**Expected**: HTTP 201 with sale and invoice

### Test 3: Record Payment
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": 1,
    "amount": 5000,
    "payment_method": "cash",
    "payment_date": "2026-01-02"
  }'
```

**Expected**: HTTP 201, invoice updated, risk flag recalculated

---

## 📊 VERIFY DATA INTEGRITY

### Check for Issues
```bash
# Inconsistent invoices
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT COUNT(*) as inconsistent_count
FROM invoices 
WHERE ABS(total_amount - (paid_amount + remaining_balance)) > 0.01;
"

# Expected: 0

# Negative stock
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT COUNT(*) as negative_stock_count
FROM products 
WHERE stock_quantity < 0;
"

# Expected: 0

# Orphaned records
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT COUNT(*) as orphaned_count
FROM sales_items si 
LEFT JOIN sales s ON si.sale_id = s.id 
WHERE s.id IS NULL;
"

# Expected: 0
```

---

## 🔍 MONITORING COMMANDS

### Database Performance
```bash
# Check index usage
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC LIMIT 20;
"

# Check slow queries (if pg_stat_statements enabled)
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;
"
```

### System Health
```bash
# Container status
docker ps

# Resource usage
docker stats --no-stream

# Database size
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT pg_size_pretty(pg_database_size('furnitrack'));
"
```

### Audit Logs
```bash
# Recent actions
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT user_id, action, entity_type, created_at
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
"

# Failed access attempts
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT user_id, action, ip_address, created_at
FROM audit_logs
WHERE action = 'UNAUTHORIZED_ACCESS_ATTEMPT'
ORDER BY created_at DESC
LIMIT 10;
"
```

---

## 🛠️ TROUBLESHOOTING

### Issue: Backend not starting
```bash
# Check logs
docker logs furnitrack-backend

# Common fixes:
# 1. Check DATABASE_URL environment variable
# 2. Verify database is accepting connections
# 3. Rebuild: docker-compose build backend
```

### Issue: Database connection errors
```bash
# Test connection
docker exec furnitrack-db pg_isready -U postgres

# Restart database
docker-compose restart furnitrack-db

# Check database logs
docker logs furnitrack-db --tail 100
```

### Issue: Frontend not loading
```bash
# Check nginx logs
docker logs furnitrack-frontend --tail 50

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Issue: Slow queries
```bash
# Check active queries
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
SELECT pid, usename, query, state, query_start
FROM pg_stat_activity
WHERE state = 'active';
"

# Analyze specific table
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
ANALYZE customers;
"
```

---

## 📅 SCHEDULED MAINTENANCE

### Daily (Set up cron job)
```bash
# Add to crontab: 
# 0 0 * * * /path/to/daily-maintenance.sh

# daily-maintenance.sh content:
#!/bin/bash
docker exec furnitrack-db psql -U postgres -d furnitrack -c "SELECT mark_overdue_invoices();"
docker exec furnitrack-db psql -U postgres -d furnitrack -c "REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;"
```

### Weekly
```bash
# Sunday 2 AM: 0 2 * * 0 /path/to/weekly-maintenance.sh

# Backup database
docker exec furnitrack-db pg_dump -U postgres furnitrack > backup_$(date +%Y%m%d).sql

# Vacuum database
docker exec furnitrack-db psql -U postgres -d furnitrack -c "VACUUM ANALYZE;"
```

### Monthly
```bash
# First of month: 0 3 1 * * /path/to/monthly-maintenance.sh

# Archive old backups (keep last 3 months)
find ./backups -name "backup_*.sql" -mtime +90 -delete

# Generate performance report
docker exec furnitrack-db psql -U postgres -d furnitrack -c "
COPY (
  SELECT * FROM pg_stat_user_tables
) TO STDOUT WITH CSV HEADER;
" > performance_report_$(date +%Y%m).csv
```

---

## 🔐 SECURITY CHECKLIST

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Enable SSL/TLS for production
- [ ] Configure firewall rules
- [ ] Set up backup encryption
- [ ] Enable database SSL connections
- [ ] Review user permissions
- [ ] Set up log rotation
- [ ] Enable intrusion detection
- [ ] Configure backup retention policy

---

## 📞 SUPPORT CONTACTS

### System Issues
- Backend errors: Check `docker logs furnitrack-backend`
- Database issues: Check `docker logs furnitrack-db`
- Frontend errors: Check browser console + `docker logs furnitrack-frontend`

### Escalation
1. **Level 1**: Restart affected container
2. **Level 2**: Restore from backup
3. **Level 3**: Contact system administrator
4. **Level 4**: Contact development team

---

## ✅ GO-LIVE CHECKLIST

Before going live:
- [ ] All tests passing
- [ ] Database backup created
- [ ] Schema migrations applied
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] User training conducted
- [ ] Documentation reviewed
- [ ] Monitoring set up
- [ ] Support team briefed
- [ ] Rollback plan prepared

---

## 🎯 SUCCESS METRICS

Monitor these after deployment:

### Performance
- API response time < 200ms (p95)
- Database query time < 50ms (avg)
- Page load time < 2s
- Zero downtime

### Data Quality
- 0 inconsistent invoices
- 0 negative stock
- 0 orphaned records
- 100% audit log coverage

### Security
- 0 unauthorized access successes
- All audit logs immutable
- All documents encrypted
- All sensitive actions logged

---

**Need Help?** Check PRODUCTION_READY_REPORT.md for detailed information.
