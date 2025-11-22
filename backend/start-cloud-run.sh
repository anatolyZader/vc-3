#!/bin/bash
set -e

# Function to handle graceful shutdown
cleanup() {
    echo "Shutting down services..."
    kill $REDIS_PID $NODE_PID 2>/dev/null || true
    wait
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

echo "🚀 Starting Cloud Run services..."

# Start Redis server in background
echo "📦 Starting Redis server..."
redis-server --daemonize no --port 6379 --bind 127.0.0.1 --protected-mode no &
REDIS_PID=$!

# Wait a moment for Redis to start
sleep 2

# Check if Redis started successfully
if ! redis-cli ping >/dev/null 2>&1; then
    echo "❌ Redis failed to start"
    exit 1
fi

echo "✅ Redis started successfully"

# Start the Node.js application
echo "🌐 Starting Node.js application..."
export REDIS_HOST=localhost
export REDIS_PORT=6379
npm start &
NODE_PID=$!

echo "🎉 All services started. Redis PID: $REDIS_PID, Node PID: $NODE_PID"

# Wait for either process to exit
wait $NODE_PID