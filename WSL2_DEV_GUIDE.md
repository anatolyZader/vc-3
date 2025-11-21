# WSL2 Development Setup - Quick Reference

## Your Development Environment

You're developing in **WSL2 (Debian)** on a Windows laptop, replacing the previous GCP VM setup.

### Architecture

```
Windows 11 Laptop
    │
    ├─ Docker Desktop (Windows)
    │   ├─ PostgreSQL container (localhost:5432)
    │   └─ Redis container (localhost:6379)
    │
    └─ WSL2 - Debian Distribution
        └─ /home/toto/dev/vc-3 (your project)
            ├─ backend/ (Node.js - Fastify)
            └─ client/ (Vite frontend)
```

## Important Differences from PowerShell Scripts

The repository contains PowerShell scripts (`.ps1` files) that **won't work in WSL2**. Use these alternatives:

| PowerShell Script | WSL2 Alternative |
|-------------------|------------------|
| `.\start-dev.ps1` | `./start-dev-local.sh` |
| `.\stop-dev.ps1` | `./stop-dev-local.sh` |
| `.\scripts\test-connections.ps1` | `cd backend && node test-connections.js` |
| `.\scripts\backup-db.ps1` | `docker exec eventstorm-postgres pg_dump ...` |

## Quick Start

### First Time Setup

1. **Start Docker Desktop** (on Windows)
   - Ensure WSL2 integration enabled for Debian

2. **Verify Docker access from WSL2:**
   ```bash
   docker ps
   ```
   If error, check Docker Desktop → Settings → Resources → WSL Integration

3. **Start infrastructure:**
   ```bash
   cd /home/toto/dev/vc-3
   ./start-dev-local.sh
   ```

4. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../client
   npm install
   ```

5. **Configure environment:**
   ```bash
   cd ../backend
   nano .env  # or: code .env
   # Add your API keys
   ```

### Daily Workflow

```bash
# Terminal 1: Infrastructure
cd /home/toto/dev/vc-3
./start-dev-local.sh

# Terminal 2: Backend (Ctrl+Shift+` for new terminal)
cd /home/toto/dev/vc-3/backend
npm run dev:local

# Terminal 3: Frontend
cd /home/toto/dev/vc-3/client
npm run dev
```

### Stopping

```bash
# Stop backend/frontend: Ctrl+C in their terminals

# Stop Docker services
cd /home/toto/dev/vc-3
./stop-dev-local.sh
```

## Essential Commands

```bash
# Check Docker status
docker ps
docker compose ps

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Test connections
cd backend && node test-connections.js

# Access PostgreSQL
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db

# Access Redis
docker exec -it eventstorm-redis redis-cli

# Backup database
docker exec eventstorm-postgres pg_dump -U eventstorm_user eventstorm_db > backup.sql

# Restore database
cat backup.sql | docker exec -i eventstorm-postgres psql -U eventstorm_user -d eventstorm_db
```

## Troubleshooting

### "Cannot connect to Docker daemon"

```bash
# Solution:
# 1. Open Docker Desktop on Windows
# 2. Docker Desktop → Settings → Resources → WSL Integration
# 3. Enable "Debian" distribution
# 4. Click "Apply & Restart"
# 5. Restart WSL2 if needed:
#    From PowerShell on Windows: wsl --shutdown
#    Then reopen WSL2 terminal
```

### Port conflicts

```bash
# Check what's using a port
sudo lsof -i :5432  # PostgreSQL
sudo lsof -i :6379  # Redis
sudo lsof -i :3000  # Backend

# Kill process if needed
sudo kill -9 <PID>
```

### Container won't start

```bash
# Check logs
docker logs eventstorm-postgres
docker logs eventstorm-redis

# Restart specific service
docker compose restart postgres

# Full reset (WARNING: deletes data)
docker compose down -v
docker compose up -d
```

## File Paths

Since you're in WSL2, use Linux paths:

- ✅ `/home/toto/dev/vc-3` (correct)
- ❌ `c:\dev\vc-3` (Windows path, won't work)
- ❌ `\mnt\c\dev\vc-3` (WSL mount, slower)

## VSCode Setup

1. **Open project in WSL2:**
   ```bash
   cd /home/toto/dev/vc-3
   code .
   ```

2. **Verify WSL mode:**
   - Look for "WSL: Debian" in bottom-left corner of VSCode
   - If not, click and select "Reopen Folder in WSL"

3. **Install extensions in WSL:**
   - Extensions need to be installed separately for WSL2
   - Click "Install in WSL: Debian" when prompted

## Environment Variables

Create `backend/.env` with:

```bash
# Server
PORT=3000
APP_URL=http://localhost:3000
NODE_ENV=development

# Database (local Docker)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=eventstorm_db
DATABASE_USER=eventstorm_user
DATABASE_PASSWORD=local_dev_password

# Redis (local Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# External APIs (your actual keys)
PINECONE_API_KEY=your_key
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
GITHUB_TOKEN=your_token
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | - |
| Backend API | http://localhost:3000 | - |
| PostgreSQL | localhost:5432 | eventstorm_user / local_dev_password |
| Redis | localhost:6379 | (no auth) |
| pgAdmin | http://localhost:8080 | admin@eventstorm.local / admin123 |
| Redis Commander | http://localhost:8081 | (no auth) |

## Documentation

- **WSL2-focused:**
  - `LOCAL_DEVELOPMENT_COMPLETE_PLAN.md` - Comprehensive guide
  - `QUICK_START.md` - Fast reference
  - This file - Quick WSL2 reference

- **General (some PowerShell references):**
  - `LOCAL_DEVELOPMENT_SETUP.md` - Detailed setup
  - `ARCHITECTURE_TRANSITION.md` - Architecture changes
  - `WORKFLOW_GUIDE.md` - Development workflow

## Scripts Created for WSL2

- `./start-dev-local.sh` - Start infrastructure
- `./stop-dev-local.sh` - Stop infrastructure
- `./verify-redis.sh` - Verify Redis setup

## Next Steps

1. ✅ Start Docker Desktop
2. ⏳ Run `./verify-redis.sh` to test Redis
3. ⏳ Configure `backend/.env`
4. ⏳ Test full stack startup
5. ⏳ Update backend code for local development (remove GCP-specific code)

## Key Takeaways

✅ **Use bash scripts** (`.sh`), not PowerShell (`.ps1`)  
✅ **Linux paths** in WSL2 (`/home/toto/...`)  
✅ **Docker Desktop** must be running on Windows  
✅ **WSL2 integration** must be enabled in Docker Desktop  
✅ **VSCode** in WSL mode for best experience  
