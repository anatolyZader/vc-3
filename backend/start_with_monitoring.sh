#!/bin/bash

# Enhanced server startup with memory monitoring
# This script will run the server with increased memory limits and monitoring

echo "=== Starting Eventstorm Server with Enhanced Memory Management ==="
echo "Timestamp: $(date)"

# Create logs directory if it doesn't exist
mkdir -p logs

# Start resource monitoring in background
echo "Starting resource monitor..."
node --max-old-space-size=4096 --expose-gc monitor_resources.js > logs/resource_monitor_$(date +%Y%m%d_%H%M%S).log 2>&1 &
MONITOR_PID=$!

# Give monitor time to start
sleep 2

echo "Resource monitor started with PID: $MONITOR_PID"

# Start the server with enhanced memory settings
echo "Starting server with enhanced memory settings..."
echo "  - Max old space size: 4096MB"
echo "  - Garbage collection exposed: yes"
echo "  - Memory monitoring: enabled"

# Run the cloud SQL proxy and server concurrently
NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" \
concurrently \
  --kill-others-on-fail \
  --names "PROXY,SERVER" \
  --prefix-colors "blue,green" \
  "./cloud-sql-proxy eventstorm-1:me-west1:eventstorm-pg-instance-1 --port 5432" \
  "NODE_DEBUG=fastify,node-fastify fastify start server.js --watch --port 3000 -l trace | pino-pretty --translateTime 'SYS:standard' --colorize"

# Clean up monitor process when server stops
echo "Stopping resource monitor..."
kill $MONITOR_PID 2>/dev/null || true

echo "Server stopped at $(date)"
