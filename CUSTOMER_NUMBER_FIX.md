# Customer Number Fix - Permanent Solution

## Problem
When creating a customer, the application threw an error:
```
Error creating customer: column "customer_number" does not exist
```

## Root Cause
The customer controller code expected a `customer_number` column that:
1. Was defined in migration file `002_customer_guarantor_enhancements.sql`
2. Was NOT included in the base `schema.sql` file
3. Was NOT being automatically applied on fresh database initialization

## Solution Implemented

### 1. **Updated Base Schema** (`schema.sql`)
Added `customer_number` column directly to the customers table definition:
```sql
customer_number VARCHAR(50) UNIQUE,
is_guarantor BOOLEAN DEFAULT FALSE,
```

### 2. **Added Auto-Generation Functions**
Added trigger functions to automatically generate unique customer numbers:
```sql
-- Format: CUST-YYYYMMDD-XXXXX (e.g., CUST-20260103-00001)
CREATE OR REPLACE FUNCTION generate_customer_number()
CREATE OR REPLACE FUNCTION set_customer_number()
CREATE TRIGGER auto_customer_number
```

### 3. **Enhanced Migration Runner** (`run-migrations.ts`)
Updated to automatically:
- Run base schema
- Create migration tracking table
- Execute all SQL migration files in order (001, 002, 003, etc.)
- Skip already-applied migrations
- Log each migration step

## What's Permanent Now

✅ **Fresh Database Starts**: When starting from scratch, the base `schema.sql` includes `customer_number` column

✅ **Existing Databases**: Migration `002` adds the column if it doesn't exist

✅ **Auto-Generation**: Trigger automatically generates unique customer numbers on INSERT

✅ **Migration Tracking**: System tracks which migrations have been applied

✅ **Docker Startup**: The `docker-entrypoint.sh` runs migrations automatically on every container start

## Verification

The fix is permanent because:

1. **Base schema** now includes the column
2. **Docker entrypoint** runs migrations on every startup
3. **Migration tracking** prevents duplicate applications
4. **Trigger** ensures customer numbers are always generated

## Testing

To test with a fresh database:
```bash
# Stop and remove everything
docker-compose down -v

# Start fresh
docker-compose up -d

# Verify customer_number exists
docker-compose exec postgres psql -U postgres -d customer_profiling_db -c "\d customers" | grep customer_number
```

## Files Modified

1. `/backend/src/database/schema.sql` - Added customer_number column and triggers
2. `/backend/src/database/migrations/run-migrations.ts` - Enhanced to run all migrations
3. Migration `002_customer_guarantor_enhancements.sql` - Already existed (now applied)

## Result

✅ Customer creation now works correctly
✅ Each customer gets a unique number: `CUST-20260103-00001`
✅ Fix persists across container restarts
✅ Works on fresh database initialization
✅ No manual intervention needed

---
**Date Fixed**: January 3, 2026
**Status**: ✅ Permanent Solution Implemented
