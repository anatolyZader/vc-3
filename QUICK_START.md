# 🚀 Quick Start Guide - Local Development (WSL2)

## First Time Setup (Do Once)

### 1. Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop
- Install on Windows and start Docker Desktop
- **Enable WSL2 Integration:** Settings → Resources → WSL Integration → Enable "Debian"
- Verify from WSL2: `docker --version`

### 2. Configure Environment Variables
```bash
# In WSL2 terminal
cd /home/toto/dev/vc-3/backend

# Create .env file (copy from template if exists)
cp .env.example .env  # if template exists
# Or create new .env file
nano .env  # or use: code .env

# Add your actual API keys (Pinecone, OpenAI, etc.)
```

### 3. Start Infrastructure
```bash
cd /home/toto/dev/vc-3
docker compose up -d postgres redis
```

This starts PostgreSQL and Redis in Docker containers.

**Or use the convenience script:**
```bash
./start-dev-local.sh  # If you created it
```

### 4. Install Dependencies
```bash
# Backend
cd /home/toto/dev/vc-3/backend
npm install

# Frontend (open new terminal: Ctrl+Shift+`)
cd /home/toto/dev/vc-3/client
npm install
```

### 5. Initialize Database (if needed)
```bash
cd /home/toto/dev/vc-3/backend
npm run migrate  # or your migration command
```

---

## Daily Development Workflow

### Start Everything
```bash
# Terminal 1: Start infrastructure (PostgreSQL + Redis)
cd /home/toto/dev/vc-3
docker compose up -d postgres redis

# Terminal 2: Start backend (Ctrl+Shift+` for new terminal)
cd /home/toto/dev/vc-3/backend
npm run dev:local

# Terminal 3: Start frontend (Ctrl+Shift+` for new terminal)
cd /home/toto/dev/vc-3/client
npm run dev
```

### Access Your App
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **pgAdmin**: http://localhost:8080 (admin@eventstorm.local / admin123)
- **Redis Commander**: http://localhost:8081

### Stop Everything
```bash
# Stop backend/frontend: Press Ctrl+C in their terminals

# Stop infrastructure
cd /home/toto/dev/vc-3
docker compose down

# Or use convenience script (if created)
./stop-dev-local.sh
```

---

## Helpful Commands

```bash
# Start infrastructure
cd /home/toto/dev/vc-3
docker compose up -d postgres redis

# Stop infrastructure
docker compose down

# Test database connections
cd /home/toto/dev/vc-3/backend
node test-connections.js

# Backup database
docker exec eventstorm-postgres pg_dump -U eventstorm_user eventstorm_db > backup.sql

# Restore database
cat backup.sql | docker exec -i eventstorm-postgres psql -U eventstorm_user -d eventstorm_db

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Check container status
docker compose ps

# Access PostgreSQL CLI
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db

# Access Redis CLI
docker exec -it eventstorm-redis redis-cli
```

---

## Troubleshooting

### Docker containers won't start
```bash
# Check Docker Desktop is running (on Windows)
docker info

# If error "cannot connect to docker daemon":
# 1. Start Docker Desktop on Windows
# 2. Docker Desktop → Settings → Resources → WSL Integration
# 3. Enable "Debian" and click "Apply & Restart"

# View logs
docker compose logs

# Restart containers
docker compose restart

# Full reset (WARNING: deletes data)
docker compose down -v
docker compose up -d
```

### Port conflicts
```bash
# Check what's using port 5432 (PostgreSQL)
sudo lsof -i :5432
# Or
sudo netstat -tulpn | grep :5432

# Check what's using port 6379 (Redis)
sudo lsof -i :6379
```

### Database connection errors
```bash
# Test connections
cd /home/toto/dev/vc-3/backend
node test-connections.js

# Check container health
docker ps

# Restart PostgreSQL
docker compose restart postgres

# Check PostgreSQL logs
docker logs eventstorm-postgres
```

### Node modules issues
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## Environment Variables

Key variables in `backend/.env`:

```bash
# Database (Local Docker)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=eventstorm_db
DATABASE_USER=eventstorm_user
DATABASE_PASSWORD=local_dev_password

# Redis (Local Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloud APIs (Keep your actual keys)
PINECONE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
```

---

## What Changed from GCP VM?

| Service | Before (GCP VM) | After (WSL2 Local) |
|---------|----------------|--------------------|
| Development Location | GCP Debian VM | WSL2 Debian on Windows |
| Connection Method | VSCode Remote SSH | VSCode Remote WSL |
| PostgreSQL | Cloud SQL | Docker container |
| Redis | Memorystore | Docker container |
| File System | VM disk `/home/user` | WSL2 `/home/toto/dev/vc-3` |
| Shell | bash (remote) | bash (local WSL2) |
| Pinecone | Cloud API | Cloud API (same) |
| OpenAI/Anthropic | Cloud API | Cloud API (same) |

---

## Need Help?

1. Check `LOCAL_DEVELOPMENT_SETUP.md` for detailed documentation
2. View container logs: `docker-compose logs -f [service]`
3. Test connections: `.\scripts\test-connections.ps1`
4. Check Docker status: `docker ps`

---

## Resources

- **Docker Commands**: `docker-compose --help`
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/docs/
- **Project Documentation**: See `README.md`
