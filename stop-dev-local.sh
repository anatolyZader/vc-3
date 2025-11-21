#!/bin/bash
# Stop Local Development Environment
# WSL2 version - replaces stop-dev.ps1

echo "🛑 Stopping Local Development Environment..."
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Stop all services
echo "📦 Stopping Docker containers..."
docker compose down

echo ""
echo "✅ All services stopped!"
echo ""
echo "💡 Tip: Data is preserved in Docker volumes"
echo "   To delete all data: docker compose down -v"
echo ""
