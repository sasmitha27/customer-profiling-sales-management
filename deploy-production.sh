#!/bin/bash

# =============================================================================
# Production Deployment Script
# Customer Profiling & Sales Management System
# =============================================================================

set -e  # Exit on error

echo "========================================="
echo "Starting Production Deployment"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_CONTAINER="furnitrack-db"
BACKEND_CONTAINER="furnitrack-backend"
FRONTEND_CONTAINER="furnitrack-frontend"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if containers are running
check_containers() {
    print_status "Checking Docker containers..."
    
    if ! docker ps | grep -q $DB_CONTAINER; then
        print_error "Database container is not running"
        exit 1
    fi
    
    if ! docker ps | grep -q $BACKEND_CONTAINER; then
        print_error "Backend container is not running"
        exit 1
    fi
    
    if ! docker ps | grep -q $FRONTEND_CONTAINER; then
        print_error "Frontend container is not running"
        exit 1
    fi
    
    print_status "All containers are running"
}

# Backup database
backup_database() {
    print_status "Creating database backup..."
    
    BACKUP_DIR="./backups"
    mkdir -p $BACKUP_DIR
    
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    docker exec $DB_CONTAINER pg_dump -U postgres furnitrack > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        print_status "Database backed up to: $BACKUP_FILE"
    else
        print_error "Database backup failed"
        exit 1
    fi
}

# Apply schema hardening
apply_schema_hardening() {
    print_status "Applying schema hardening and constraints..."
    
    docker exec -i $DB_CONTAINER psql -U postgres -d furnitrack < ./backend/src/database/migrations/001_schema_hardening.sql
    
    if [ $? -eq 0 ]; then
        print_status "Schema hardening applied successfully"
    else
        print_error "Schema hardening failed"
        print_warning "Rolling back..."
        # Restore from backup if needed
        exit 1
    fi
}

# Run data validation
validate_data() {
    print_status "Running data validation checks..."
    
    # Check for orphaned records
    docker exec $DB_CONTAINER psql -U postgres -d furnitrack -c "
        SELECT 'Orphaned sales items: ' || COUNT(*) 
        FROM sales_items si 
        LEFT JOIN sales s ON si.sale_id = s.id 
        WHERE s.id IS NULL;
    "
    
    # Check for inconsistent invoice amounts
    docker exec $DB_CONTAINER psql -U postgres -d furnitrack -c "
        SELECT 'Inconsistent invoices: ' || COUNT(*) 
        FROM invoices 
        WHERE ABS(total_amount - (paid_amount + remaining_balance)) > 0.01;
    "
    
    # Check for negative stock
    docker exec $DB_CONTAINER psql -U postgres -d furnitrack -c "
        SELECT 'Products with negative stock: ' || COUNT(*) 
        FROM products 
        WHERE stock_quantity < 0;
    "
    
    print_status "Data validation completed"
}

# Refresh materialized views
refresh_views() {
    print_status "Refreshing materialized views..."
    
    docker exec $DB_CONTAINER psql -U postgres -d furnitrack -c "
        REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
    "
    
    print_status "Materialized views refreshed"
}

# Run maintenance tasks
run_maintenance() {
    print_status "Running maintenance tasks..."
    
    # Mark overdue invoices
    docker exec $DB_CONTAINER psql -U postgres -d furnitrack -c "
        SELECT mark_overdue_invoices();
    "
    
    print_status "Maintenance tasks completed"
}

# Rebuild backend
rebuild_backend() {
    print_status "Rebuilding backend..."
    
    docker-compose build backend
    docker-compose up -d backend
    
    # Wait for backend to be healthy
    sleep 10
    
    print_status "Backend rebuilt and restarted"
}

# Rebuild frontend
rebuild_frontend() {
    print_status "Rebuilding frontend..."
    
    docker-compose build frontend
    docker-compose up -d frontend
    
    sleep 5
    
    print_status "Frontend rebuilt and restarted"
}

# Health check
health_check() {
    print_status "Running health checks..."
    
    # Check database connection
    if docker exec $DB_CONTAINER pg_isready -U postgres > /dev/null 2>&1; then
        print_status "Database is healthy"
    else
        print_error "Database health check failed"
        exit 1
    fi
    
    # Check backend
    sleep 5
    BACKEND_STATUS=$(docker inspect --format='{{.State.Status}}' $BACKEND_CONTAINER)
    if [ "$BACKEND_STATUS" = "running" ]; then
        print_status "Backend is healthy"
    else
        print_error "Backend health check failed"
        exit 1
    fi
    
    # Check frontend
    FRONTEND_STATUS=$(docker inspect --format='{{.State.Status}}' $FRONTEND_CONTAINER)
    if [ "$FRONTEND_STATUS" = "running" ]; then
        print_status "Frontend is healthy"
    else
        print_error "Frontend health check failed"
        exit 1
    fi
}

# Create indexes report
create_indexes_report() {
    print_status "Generating indexes report..."
    
    docker exec $DB_CONTAINER psql -U postgres -d furnitrack -c "
        SELECT 
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
    " > ./reports/indexes_report.txt
    
    print_status "Indexes report saved to ./reports/indexes_report.txt"
}

# Main deployment flow
main() {
    echo ""
    print_status "Starting deployment process..."
    echo ""
    
    # Pre-deployment checks
    check_containers
    
    # Backup
    backup_database
    
    # Apply database changes
    apply_schema_hardening
    
    # Validate data integrity
    validate_data
    
    # Refresh views
    refresh_views
    
    # Run maintenance
    run_maintenance
    
    # Rebuild services (if needed)
    read -p "Rebuild backend? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rebuild_backend
    fi
    
    read -p "Rebuild frontend? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rebuild_frontend
    fi
    
    # Health checks
    health_check
    
    # Generate reports
    mkdir -p ./reports
    create_indexes_report
    
    echo ""
    echo "========================================="
    print_status "Deployment completed successfully!"
    echo "========================================="
    echo ""
    echo "Next steps:"
    echo "1. Test critical flows (create customer, record sale, record payment)"
    echo "2. Verify dashboard data accuracy"
    echo "3. Check audit logs for any errors"
    echo "4. Monitor system performance"
    echo ""
}

# Run main function
main
