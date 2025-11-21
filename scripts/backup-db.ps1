# Database Backup Script
# Creates a backup of the local PostgreSQL database

param(
    [string]$OutputFile = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
)

Write-Host "💾 Creating database backup..." -ForegroundColor Cyan
Write-Host ""

# Check if container is running
$containerStatus = docker ps --filter "name=eventstorm-postgres" --format "{{.Status}}" 2>$null

if (-not $containerStatus) {
    Write-Host "❌ PostgreSQL container is not running" -ForegroundColor Red
    Write-Host "   Start it with: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

# Create backup
Write-Host "📦 Backing up database to: $OutputFile" -ForegroundColor Yellow
docker exec eventstorm-postgres pg_dump -U eventstorm_user eventstorm_db > $OutputFile

if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $OutputFile).Length / 1KB
    Write-Host ""
    Write-Host "✅ Backup created successfully!" -ForegroundColor Green
    Write-Host "   File: $OutputFile" -ForegroundColor White
    Write-Host "   Size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Backup failed" -ForegroundColor Red
    exit 1
}
