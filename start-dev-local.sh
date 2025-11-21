#!/bin/bash
# Start Local Development Environment
# WSL2 version with native PostgreSQL and Redis services

set -e

echo "🚀 Starting Local Development Environment..."
echo ""

# Check if PostgreSQL service is available
if ! command -v psql > /dev/null 2>&1; then
    echo "❌ PostgreSQL client not found"
    echo ""
    echo "Installation steps:"
    echo "1. sudo apt update"
    echo "2. sudo apt install postgresql postgresql-contrib"
    echo ""
    exit 1
fi

# Check if Redis service is available
if ! command -v redis-cli > /dev/null 2>&1; then
    echo "❌ Redis client not found"
    echo ""
    echo "Installation steps:"
    echo "1. sudo apt update"
    echo "2. sudo apt install redis-server"
    echo ""
    exit 1
fi

echo "✅ Native services are available"
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Start PostgreSQL service
echo "📦 Starting PostgreSQL service..."
if sudo service postgresql status | grep -q "online"; then
    echo "   PostgreSQL: ✅ already running"
else
    sudo service postgresql start
    echo "   PostgreSQL: ✅ started"
fi

# Start Redis service
echo "📦 Starting Redis service..."
if sudo service redis-server status | grep -q "running"; then
    echo "   Redis: ✅ already running"
else
    sudo service redis-server start
    echo "   Redis: ✅ started"
fi

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 3

# Check service health
POSTGRES_STATUS=$(sudo service postgresql status | grep -o "online\|offline" || echo "unknown")
REDIS_STATUS=$(sudo service redis-server status | grep -o "running\|stopped" || echo "unknown")

echo ""
echo "📊 Service Status:"
if [ "$POSTGRES_STATUS" = "online" ]; then
    echo "   PostgreSQL: ✅ $POSTGRES_STATUS (port 5433)"
else
    echo "   PostgreSQL: ❌ $POSTGRES_STATUS"
fi

if [ "$REDIS_STATUS" = "running" ]; then
    echo "   Redis: ✅ $REDIS_STATUS (port 6379)"
else
    echo "   Redis: ❌ $REDIS_STATUS"
fi

# Test connections
echo ""
echo "🔍 Testing connections..."

# Test PostgreSQL connection
if pg_isready -h localhost -p 5433 > /dev/null 2>&1; then
    echo "   PostgreSQL: ✅ connection successful"
else
    echo "   PostgreSQL: ⚠️  connection failed (database may need setup)"
fi

# Test Redis connection
if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
    echo "   Redis: ✅ connection successful"
else
    echo "   Redis: ❌ connection failed"
    exit 1
fi

# Display connection information
echo ""
echo "🔗 Connection Details:"
echo "   PostgreSQL: localhost:5433 (native service)"
echo "   Redis: localhost:6379 (native service)"
echo ""
echo "📝 Next steps:"
echo "   1. Start backend: cd backend && npm run dev-stable:local"
echo "   2. Start frontend: cd client && npm run dev"
echo "   3. Open browser: http://localhost:5173"
echo ""