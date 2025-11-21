# Stop Local Development Environment
# This script stops all running Docker containers

Write-Host "🛑 Stopping Local Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
Set-Location $PSScriptRoot

# Stop all services
Write-Host "📦 Stopping Docker containers..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "✅ All services stopped!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Data is preserved in Docker volumes" -ForegroundColor Cyan
Write-Host "   To delete all data: docker-compose down -v" -ForegroundColor Yellow
