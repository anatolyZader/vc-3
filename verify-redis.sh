#!/bin/bash
# Quick Redis verification script

echo "🔍 Redis Verification Script"
echo "================================"
echo ""

# Check if Docker is running
echo "1️⃣ Checking Docker status..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "   Please start Docker Desktop on Windows"
    exit 1
fi
echo "✅ Docker is running"
echo ""

# Check if Redis container exists
echo "2️⃣ Checking Redis container..."
if docker ps -a | grep -q eventstorm-redis; then
    if docker ps | grep -q eventstorm-redis; then
        echo "✅ Redis container is running"
    else
        echo "⚠️  Redis container exists but is not running"
        echo "   Starting Redis container..."
        docker start eventstorm-redis
        sleep 2
    fi
else
    echo "⚠️  Redis container does not exist"
    echo "   Creating and starting Redis container..."
    cd "$(dirname "$0")"
    docker compose up -d redis
    sleep 3
fi
echo ""

# Test Redis with redis-cli
echo "3️⃣ Testing Redis with redis-cli..."
if docker exec eventstorm-redis redis-cli ping > /dev/null 2>&1; then
    PONG=$(docker exec eventstorm-redis redis-cli ping)
    echo "✅ Redis responds: $PONG"
else
    echo "❌ Redis is not responding"
    exit 1
fi
echo ""

# Test Redis write/read
echo "4️⃣ Testing Redis write/read operations..."
docker exec eventstorm-redis redis-cli set test_key "hello_from_script" > /dev/null 2>&1
VALUE=$(docker exec eventstorm-redis redis-cli get test_key)
docker exec eventstorm-redis redis-cli del test_key > /dev/null 2>&1

if [ "$VALUE" = "hello_from_script" ]; then
    echo "✅ Redis read/write works: '$VALUE'"
else
    echo "❌ Redis read/write failed"
    exit 1
fi
echo ""

# Check Redis info
echo "5️⃣ Redis server information..."
docker exec eventstorm-redis redis-cli info server | grep -E "redis_version|redis_mode|os|tcp_port" | head -4
echo ""

# Check port binding
echo "6️⃣ Checking port binding..."
PORT_INFO=$(docker port eventstorm-redis 2>/dev/null | grep 6379)
if [ -n "$PORT_INFO" ]; then
    echo "✅ Port binding: $PORT_INFO"
else
    echo "⚠️  Port 6379 binding not found"
fi
echo ""

# Test from Node.js
echo "7️⃣ Testing Redis from Node.js..."
cd "$(dirname "$0")/backend"
if [ -f "test-connections.js" ]; then
    echo "   Running backend/test-connections.js..."
    node test-connections.js
else
    echo "   ⚠️  test-connections.js not found, skipping Node.js test"
fi
echo ""

echo "================================"
echo "✅ Redis verification complete!"
echo ""
echo "Redis is accessible at: localhost:6379"
echo "Redis Commander UI: http://localhost:8081 (if started)"
