#!/bin/bash

echo "========================================"
echo "Testing Fresh Database Setup"
echo "========================================"

# Stop containers
echo "Stopping containers..."
docker-compose down

# Remove database volume to simulate fresh start
echo "Removing database volume..."
docker volume rm customer-profiling-sales-management_postgres_data 2>/dev/null || echo "Volume doesn't exist or already removed"

# Start containers
echo "Starting containers with fresh database..."
docker-compose up -d

# Wait for containers to be ready
echo "Waiting for services to be ready..."
sleep 15

# Check if migration tracking table exists
echo ""
echo "Checking migration tracking..."
docker-compose exec -T postgres psql -U postgres -d customer_profiling_db -c "SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at;" 2>/dev/null || echo "Migration tracking table may not exist yet"

# Check if customer_number column exists
echo ""
echo "Verifying customer_number column exists..."
docker-compose exec -T postgres psql -U postgres -d customer_profiling_db -c "\d customers" | grep customer_number

# Check backend logs
echo ""
echo "Backend startup logs:"
docker-compose logs backend | tail -40

echo ""
echo "========================================"
echo "Test complete!"
echo "========================================"
