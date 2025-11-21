# Start Local Development Environment
# This script starts all infrastructure services needed for local development

Write-Host "🚀 Starting Local Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    Write-Host "   Waiting for Docker Desktop to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    exit 1
}

Write-Host "✅ Docker is running" -ForegroundColor Green

# Navigate to project root
Set-Location $PSScriptRoot

# Start infrastructure services
Write-Host ""
Write-Host "📦 Starting PostgreSQL and Redis..." -ForegroundColor Cyan
docker-compose up -d postgres redis

# Wait for services to be healthy
Write-Host ""
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check service health
$postgresHealth = docker inspect --format='{{.State.Health.Status}}' eventstorm-postgres 2>$null
$redisHealth = docker inspect --format='{{.State.Health.Status}}' eventstorm-redis 2>$null

Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
Write-Host "   PostgreSQL: $postgresHealth" -ForegroundColor $(if ($postgresHealth -eq 'healthy') { 'Green' } else { 'Yellow' })
Write-Host "   Redis: $redisHealth" -ForegroundColor $(if ($redisHealth -eq 'healthy') { 'Green' } else { 'Yellow' })

if ($postgresHealth -ne 'healthy' -or $redisHealth -ne 'healthy') {
    Write-Host ""
    Write-Host "⚠️  Services are starting up. Check status with: docker-compose ps" -ForegroundColor Yellow
}

# Display connection information
Write-Host ""
Write-Host "🔗 Connection Details:" -ForegroundColor Cyan
Write-Host "   PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "   Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "🛠️  Management Tools:" -ForegroundColor Cyan
Write-Host "   pgAdmin: http://localhost:8080 (admin@eventstorm.local / admin123)" -ForegroundColor White
Write-Host "   Redis Commander: http://localhost:8081" -ForegroundColor White

Write-Host ""
Write-Host "✅ Infrastructure is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open a new terminal and run: cd backend; npm run dev" -ForegroundColor White
Write-Host "   2. Open another terminal and run: cd client; npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "To stop services: docker-compose down" -ForegroundColor Yellow
