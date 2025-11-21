# Database Connection Test Script
# Tests connectivity to PostgreSQL and Redis

Write-Host "🔍 Testing Database Connections..." -ForegroundColor Cyan
Write-Host ""

# Test PostgreSQL
Write-Host "📊 Testing PostgreSQL..." -ForegroundColor Yellow
$pgTest = docker exec eventstorm-postgres psql -U eventstorm_user -d eventstorm_db -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL: Connected" -ForegroundColor Green
    $version = ($pgTest | Select-String "PostgreSQL").ToString().Trim()
    Write-Host "   $version" -ForegroundColor White
} else {
    Write-Host "❌ PostgreSQL: Connection failed" -ForegroundColor Red
    Write-Host "   $pgTest" -ForegroundColor Red
}

Write-Host ""

# Test Redis
Write-Host "📊 Testing Redis..." -ForegroundColor Yellow
$redisTest = docker exec eventstorm-redis redis-cli ping 2>&1

if ($redisTest -eq "PONG") {
    Write-Host "✅ Redis: Connected" -ForegroundColor Green
    $redisInfo = docker exec eventstorm-redis redis-cli info server | Select-String "redis_version"
    Write-Host "   $redisInfo" -ForegroundColor White
} else {
    Write-Host "❌ Redis: Connection failed" -ForegroundColor Red
    Write-Host "   $redisTest" -ForegroundColor Red
}

Write-Host ""

# Show container status
Write-Host "📦 Container Status:" -ForegroundColor Cyan
docker-compose ps postgres redis

Write-Host ""
Write-Host "✅ Connection test complete!" -ForegroundColor Green
