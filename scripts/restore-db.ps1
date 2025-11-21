# Database Restore Script
# Restores a PostgreSQL database from a backup file

param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile
)

Write-Host "♻️  Restoring database from backup..." -ForegroundColor Cyan
Write-Host ""

# Check if file exists
if (-not (Test-Path $InputFile)) {
    Write-Host "❌ Backup file not found: $InputFile" -ForegroundColor Red
    exit 1
}

# Check if container is running
$containerStatus = docker ps --filter "name=eventstorm-postgres" --format "{{.Status}}" 2>$null

if (-not $containerStatus) {
    Write-Host "❌ PostgreSQL container is not running" -ForegroundColor Red
    Write-Host "   Start it with: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

# Confirm restore
Write-Host "⚠️  WARNING: This will overwrite the current database!" -ForegroundColor Yellow
Write-Host "   File: $InputFile" -ForegroundColor White
Write-Host ""
$confirmation = Read-Host "Continue? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "❌ Restore cancelled" -ForegroundColor Yellow
    exit 0
}

# Restore backup
Write-Host ""
Write-Host "📦 Restoring database from: $InputFile" -ForegroundColor Yellow
Get-Content $InputFile | docker exec -i eventstorm-postgres psql -U eventstorm_user -d eventstorm_db

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Database restored successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Restore failed" -ForegroundColor Red
    exit 1
}
