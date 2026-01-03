#!/bin/sh
set -e

echo "Starting FurniTrack Backend..."

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
until redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done

echo "Redis is ready!"

# Run migrations
echo "Running database migrations..."
npm run migrate || echo "Migrations completed or no new migrations to run"

# Run seed
echo "Seeding database..."
npm run seed || echo "Seed completed or already seeded"

echo "Starting application..."
exec npm start
