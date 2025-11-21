# Local Development Setup Guide

## Overview
This guide will help you transition from developing on a GCP VM to local development on your Windows laptop. We'll replace GCP services with local Docker containers.

---

## Prerequisites ✓

- [x] VSCode installed
- [x] Codebase cloned from GitHub
- [ ] Docker Desktop installed
- [ ] Git configured
- [ ] Node.js installed (v18+)

---

## Stage 1: Docker Setup for PostgreSQL and Redis

### 1.1 Install Docker Desktop

1. **Download Docker Desktop for Windows**
   - Visit: https://www.docker.com/products/docker-desktop
   - Download and run the installer
   - Follow the installation wizard

2. **Configure Docker Desktop**
   - Launch Docker Desktop
   - Go to Settings → General
   - Enable "Use WSL 2 based engine" (recommended)
   - Go to Settings → Resources
   - Allocate resources:
     - **CPUs**: 4+ cores
     - **Memory**: 8GB+ RAM
     - **Disk**: 50GB+
   - Apply & Restart

3. **Verify Installation**
   ```powershell
   docker --version
   docker-compose --version
   ```

### 1.2 Understanding Your Docker Setup

Your project has two Docker Compose files:

#### `docker-compose.yml` - Infrastructure Services
Contains:
- **PostgreSQL 15** (port 5432)
- **Redis 7** (port 6379)
- **Redis Commander** (port 8081) - Redis GUI
- **pgAdmin** (port 8080) - PostgreSQL GUI

#### `docker-compose.dev.yml` - Application Services
Contains:
- **Backend** (port 3000)
- **Frontend** (port 5173)

### 1.3 Create Database Initialization Scripts (Optional)

Create a directory for database initialization:

```powershell
New-Item -ItemType Directory -Force -Path "c:\dev\vc-3\database\init"
```

Create an initialization SQL script:

**File: `database/init/01-init-schema.sql`**
```sql
-- Initial database setup
-- Add your schema initialization here

-- Example: Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Add your tables, indexes, etc.
```

### 1.4 Start Infrastructure Services

#### Option A: Start PostgreSQL and Redis only
```powershell
cd c:\dev\vc-3
docker-compose up -d postgres redis
```

#### Option B: Start with management GUIs
```powershell
cd c:\dev\vc-3
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- pgAdmin on `http://localhost:8080`
- Redis Commander on `http://localhost:8081`

#### Verify Services are Running
```powershell
docker-compose ps
```

Expected output:
```
NAME                   STATUS    PORTS
eventstorm-postgres    Up        0.0.0.0:5432->5432/tcp
eventstorm-redis       Up        0.0.0.0:6379->6379/tcp
pgadmin                Up        0.0.0.0:8080->80/tcp
redis-commander        Up        0.0.0.0:8081->8081/tcp
```

### 1.5 Configure Environment Variables

Your project already has `.env.local` configured. Update it if needed:

```bash
# Database Configuration - Local Docker
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=eventstorm_db
DATABASE_USER=eventstorm_user
DATABASE_PASSWORD=local_dev_password

# Redis Configuration - Local Docker
REDIS_HOST=localhost
REDIS_PORT=6379

# Keep your cloud API keys
PINECONE_API_KEY=your_actual_pinecone_api_key
PINECONE_ENVIRONMENT=your_actual_pinecone_environment
OPENAI_API_KEY=your_actual_openai_api_key
ANTHROPIC_API_KEY=your_actual_anthropic_api_key
```

### 1.6 Test Database Connection

#### Using PowerShell and Docker
```powershell
# Test PostgreSQL connection
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db -c "\dt"

# Test Redis connection
docker exec -it eventstorm-redis redis-cli ping
```

#### Using Management GUIs

**pgAdmin** (http://localhost:8080):
1. Login: `admin@eventstorm.local` / `admin123`
2. Right-click "Servers" → "Register" → "Server"
3. General tab: Name: "Local PostgreSQL"
4. Connection tab:
   - Host: `postgres` (if connecting from within Docker network)
   - Host: `host.docker.internal` (if connecting from host machine)
   - Port: `5432`
   - Username: `eventstorm_user`
   - Password: `local_dev_password`
   - Database: `eventstorm_db`

**Redis Commander** (http://localhost:8081):
- Already configured, just open in browser

### 1.7 Migrate Your Database Schema

If you have existing database schema from GCP:

#### Option A: Export from GCP and Import

1. **Export from GCP Cloud SQL:**
   ```bash
   # On GCP VM or using gcloud locally
   gcloud sql export sql eventstorm-pg-instance gs://your-bucket/schema-export.sql \
     --database=eventstorm_db
   
   # Download the file
   gsutil cp gs://your-bucket/schema-export.sql ./schema-export.sql
   ```

2. **Import to Local Docker:**
   ```powershell
   # Copy file to container
   docker cp schema-export.sql eventstorm-postgres:/tmp/schema-export.sql
   
   # Import
   docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db -f /tmp/schema-export.sql
   ```

#### Option B: Use Migration Tools

If you use migration tools like Knex, Sequelize, TypeORM, or Prisma:

```powershell
cd backend
npm run migrate  # or your migration command
```

### 1.8 Common Docker Commands

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Restart a service
docker-compose restart postgres

# Stop services and remove volumes (WARNING: deletes data)
docker-compose down -v

# View service status
docker-compose ps

# Execute commands in containers
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db
docker exec -it eventstorm-redis redis-cli

# View resource usage
docker stats
```

---

## Stage 2: Running Your Application Locally

### 2.1 Install Node.js Dependencies

```powershell
# Install root dependencies (if any)
cd c:\dev\vc-3
npm install

# Install backend dependencies
cd c:\dev\vc-3\backend
npm install

# Install frontend dependencies
cd c:\dev\vc-3\client
npm install
```

### 2.2 Option A: Run Services Directly (Without Docker)

This is the recommended approach for active development as it allows faster iteration:

#### Terminal 1 - Backend
```powershell
cd c:\dev\vc-3\backend
$env:NODE_ENV="development"
npm run dev
```

#### Terminal 2 - Frontend
```powershell
cd c:\dev\vc-3\client
npm run dev
```

**Benefits:**
- Hot reload works perfectly
- Easy debugging with VSCode
- Direct access to logs
- Faster restart times

### 2.3 Option B: Run Everything with Docker Compose

```powershell
cd c:\dev\vc-3
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Note:** Running backend/frontend in Docker may be slower for development due to:
- File sync delays in Windows
- Node modules volume mounting
- Container restart overhead

### 2.4 Recommended Hybrid Approach

**Docker for:** PostgreSQL, Redis (infrastructure)
**Direct execution for:** Backend, Frontend (application code)

```powershell
# Terminal 1: Start infrastructure
docker-compose up -d postgres redis

# Terminal 2: Start backend
cd backend
npm run dev

# Terminal 3: Start frontend
cd client
npm run dev
```

---

## Stage 3: Configuration Changes for Local Development

### 3.1 Update Backend Configuration

Check files that reference GCP services:

1. **Database Connection** - Look for:
   - `backend/app.js` or database config files
   - Replace Cloud SQL connection strings with local connection
   - Remove `CLOUD_SQL_CONNECTION_NAME` usage
   - Remove `/cloudsql/` socket connections

2. **Redis Connection** - Look for:
   - `backend/redisPlugin.js` or Redis config
   - Replace Memorystore connection with local Redis
   - Remove VPC connector references

3. **Authentication** - Look for:
   - Google OAuth configuration
   - Update redirect URIs to `http://localhost:3000`

4. **Secret Management** - Look for:
   - GCP Secret Manager calls
   - Replace with environment variables from `.env.local`

5. **Pub/Sub** - Look for:
   - GCP Pub/Sub usage
   - Consider using local alternatives or mocking

### 3.2 Example Configuration Updates

#### Before (GCP):
```javascript
// Database connection
const pool = new Pool({
  host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});
```

#### After (Local):
```javascript
// Database connection
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  user: process.env.DATABASE_USER || process.env.PG_USER,
  password: process.env.DATABASE_PASSWORD || process.env.PG_PASSWORD,
  database: process.env.DATABASE_NAME || process.env.PG_DATABASE,
});
```

---

## Stage 4: Troubleshooting

### 4.1 Docker Issues

**Problem:** Docker containers won't start
```powershell
# Check Docker Desktop is running
docker info

# Check logs
docker-compose logs

# Remove and recreate
docker-compose down -v
docker-compose up -d
```

**Problem:** Port already in use
```powershell
# Find process using port 5432 (PostgreSQL)
netstat -ano | findstr :5432

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### 4.2 Database Connection Issues

**Problem:** Can't connect to PostgreSQL

```powershell
# Check if container is running
docker ps | findstr postgres

# Check container logs
docker logs eventstorm-postgres

# Test connection from container
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db

# Check environment variables
Get-Content .env.local | Select-String "DATABASE"
```

### 4.3 Redis Connection Issues

```powershell
# Test Redis connection
docker exec -it eventstorm-redis redis-cli ping

# Check Redis logs
docker logs eventstorm-redis

# Test from host
redis-cli -h localhost -p 6379 ping
```

### 4.4 Node.js Application Issues

**Problem:** Module not found errors
```powershell
# Clear and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

**Problem:** Environment variables not loading
```powershell
# Verify .env.local exists
Test-Path .env.local

# Check if backend is reading it
cd backend
Get-Content app.js | Select-String "dotenv"
```

---

## Stage 5: Development Workflow

### 5.1 Daily Startup Sequence

```powershell
# 1. Start Docker Desktop (if not auto-starting)

# 2. Start infrastructure services
cd c:\dev\vc-3
docker-compose up -d postgres redis

# 3. Wait for services to be healthy (check logs)
docker-compose ps

# 4. Start backend
cd backend
npm run dev

# 5. Start frontend (new terminal)
cd client
npm run dev
```

### 5.2 Stopping Services

```powershell
# Stop backend/frontend: Ctrl+C in their terminals

# Stop Docker services
cd c:\dev\vc-3
docker-compose down

# Optional: Stop Docker Desktop
```

### 5.3 Data Persistence

**PostgreSQL data** persists in Docker volume: `postgres_data`
**Redis data** persists in Docker volume: `redis_data`

To clear all data:
```powershell
docker-compose down -v  # WARNING: Deletes all data
```

### 5.4 VSCode Integration

Install recommended extensions:
- **Docker** (ms-azuretools.vscode-docker)
- **Database Client** (cweijan.vscode-database-client2)
- **Thunder Client** or **REST Client** for API testing

---

## Stage 6: Next Steps

### 6.1 Replace Other GCP Services

Services still pointing to cloud:
- ✅ PostgreSQL → Local Docker
- ✅ Redis → Local Docker
- ⚠️ Pinecone → Cloud API (keep as-is, API-based)
- ⚠️ OpenAI/Anthropic → Cloud API (keep as-is, API-based)
- ⚠️ IAM/Secrets → Replace with `.env.local`
- ⚠️ Pub/Sub → Consider local alternatives:
  - Bull/BullMQ (Redis-based queue)
  - EventEmitter (in-process)
  - RabbitMQ (Docker)

### 6.2 Set Up Local Testing

```powershell
# Run backend tests
cd backend
npm test

# Run integration tests (if any)
npm run test:integration
```

### 6.3 Create Backup/Restore Scripts

**Backup local database:**
```powershell
docker exec eventstorm-postgres pg_dump -U eventstorm_user eventstorm_db > backup.sql
```

**Restore local database:**
```powershell
Get-Content backup.sql | docker exec -i eventstorm-postgres psql -U eventstorm_user -d eventstorm_db
```

---

## Quick Reference

### Connection Details

| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| PostgreSQL | localhost | 5432 | eventstorm_user / local_dev_password |
| Redis | localhost | 6379 | (no auth) |
| pgAdmin | localhost | 8080 | admin@eventstorm.local / admin123 |
| Redis Commander | localhost | 8081 | (no auth) |
| Backend API | localhost | 3000 | - |
| Frontend | localhost | 5173 | - |

### Important Files

| File | Purpose |
|------|---------|
| `.env.local` | Local environment variables |
| `docker-compose.yml` | Infrastructure services |
| `docker-compose.dev.yml` | Application services |
| `database/init/*.sql` | Database initialization scripts |

### Useful Commands Cheat Sheet

```powershell
# Docker
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose ps                 # List services
docker-compose logs -f [service]  # View logs
docker exec -it [container] sh    # Shell into container

# PostgreSQL
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db

# Redis
docker exec -it eventstorm-redis redis-cli

# Application
npm run dev                       # Start development server
npm test                          # Run tests
npm run build                     # Build for production
```

---

## Summary

You now have:
1. ✅ Docker Desktop installed and configured
2. ✅ Local PostgreSQL database (replacing Cloud SQL)
3. ✅ Local Redis cache (replacing Memorystore)
4. ✅ Management GUIs for both services
5. ✅ Environment variables configured for local development
6. ✅ Development workflow established

**Your application now runs entirely on your laptop**, with only API-based services (Pinecone, OpenAI, etc.) calling cloud endpoints.

Ready to continue? Next steps would be:
- Setting up Pub/Sub alternatives
- Configuring OAuth for local development
- Setting up debugging in VSCode
- Creating Docker development best practices
