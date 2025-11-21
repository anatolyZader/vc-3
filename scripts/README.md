# Development Scripts

This directory contains PowerShell scripts to help with local development.

## Scripts

### `backup-db.ps1`
Creates a backup of your local PostgreSQL database.

**Usage:**
```powershell
.\scripts\backup-db.ps1
# Creates: backup_YYYYMMDD_HHMMSS.sql

# With custom filename:
.\scripts\backup-db.ps1 -OutputFile my-backup.sql
```

### `restore-db.ps1`
Restores a PostgreSQL database from a backup file.

**Usage:**
```powershell
.\scripts\restore-db.ps1 -InputFile backup_20240101_120000.sql
```

**Warning:** This will overwrite your current database!

### `test-connections.ps1`
Tests connectivity to PostgreSQL and Redis containers.

**Usage:**
```powershell
.\scripts\test-connections.ps1
```

Shows:
- PostgreSQL connection status and version
- Redis connection status and version
- Container health status

## Root Scripts

### `start-dev.ps1`
Starts the local development infrastructure (PostgreSQL and Redis).

**Usage:**
```powershell
.\start-dev.ps1
```

### `stop-dev.ps1`
Stops all Docker containers.

**Usage:**
```powershell
.\stop-dev.ps1
```

## Examples

### Daily workflow
```powershell
# Morning: Start everything
.\start-dev.ps1
cd backend
npm run dev

# Evening: Stop everything
.\stop-dev.ps1
```

### Backup before major changes
```powershell
.\scripts\backup-db.ps1 -OutputFile before-migration.sql
# Make your changes
# If something goes wrong:
.\scripts\restore-db.ps1 -InputFile before-migration.sql
```

### Debugging connection issues
```powershell
.\scripts\test-connections.ps1
docker-compose ps
docker-compose logs postgres
```
