# Complete Local Development Setup Plan
**From GCP VM to Local Windows Laptop with WSL2 Debian**

Generated: November 16, 2025  
Status: PostgreSQL ✓ | Redis ⏳ | Other Services ⏳

---

## Executive Summary

You're transitioning from developing on a GCP Debian VM (via VSCode Remote SSH) to **local development in WSL2 Debian** on your Windows laptop. Your app uses:

**GCP Services (to replace locally):**
- Cloud SQL PostgreSQL → Docker PostgreSQL ✓ 
- Memorystore Redis → Docker Redis (needs verification)
- Cloud Pub/Sub → Local message queue (Redis Streams or Bull)
- Secret Manager → .env files
- IAM/Auth → Simplified local auth

**Cloud APIs (keep as-is via API):**
- Pinecone (vector database)
- OpenAI, Anthropic, Google AI (LLM APIs)
- GitHub API
- YouTube API

---

## Current State Assessment

### ✅ Already Complete
- Windows laptop with WSL2 (Debian distribution) installed
- VSCode with Remote-WSL extension
- Codebase cloned from GitHub to WSL2: `/home/toto/dev/vc-3`
- PostgreSQL Docker container configured and working
- Docker Compose files exist (`docker-compose.yml`, `docker-compose.dev.yml`)

### ⏳ In Progress
- Redis Docker container (needs verification)
- Docker Desktop status (appears not running)

### ❌ Not Started
- Pub/Sub replacement
- Environment variables migration
- Backend configuration for local development
- Testing all connections

---

## Stage 0: Prerequisites Check

### 0.1 Windows Prerequisites

**Already Installed:**
- ✅ VSCode
- ✅ Git (for GitHub access)
- ✅ WSL2 (Debian)

**Need to Install/Configure:**

1. **Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop
   - Install on Windows (if not already installed)
   - **CRITICAL:** Enable WSL 2 integration:
     - Settings → Resources → WSL Integration
     - Enable integration with your Debian distro
   - Resources: 4+ CPUs, 8GB+ RAM, 50GB+ disk
   - **Start Docker Desktop** (currently not running)
   
   After starting, verify from WSL2:
   ```bash
   docker --version
   docker ps
   ```

2. **Node.js in WSL2** (verify version)
   ```bash
   # Check current version
   node --version  # Should be v18+
   npm --version
   
   # If not installed or wrong version:
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Essential WSL2 tools**
   ```bash
   # Install if missing
   sudo apt-get update
   sudo apt-get install -y git curl wget build-essential
   ```

---

## Stage 1: Docker Infrastructure Setup

### 1.1 Start Docker Desktop

**Action Required (on Windows host):**
1. Open Docker Desktop application on Windows
2. Wait for it to fully start (whale icon in system tray should be stable)
3. **Verify WSL2 integration is enabled:**
   - Docker Desktop → Settings → Resources → WSL Integration
   - Enable "Debian" distribution
4. Verify from WSL2 terminal:
   ```bash
   docker ps
   # Should show running containers or empty list (not an error)
   # If error: "cannot connect to docker daemon" - WSL integration not enabled
   ```

### 1.2 Verify Docker Compose Files

You already have:
- `docker-compose.yml` - Infrastructure (PostgreSQL, Redis, pgAdmin, Redis Commander)
- `docker-compose.dev.yml` - Application containers

### 1.3 Start Infrastructure Services

```bash
cd /home/toto/dev/vc-3

# Start PostgreSQL and Redis only (minimal)
docker compose up -d postgres redis

# OR start with management tools
docker compose up -d postgres redis pgadmin redis-commander

# Check status
docker compose ps

# View logs
docker compose logs -f postgres redis
```

**Expected Output:**
```
✓ Container eventstorm-postgres  Started
✓ Container eventstorm-redis     Started
```

### 1.4 Verify Services Running

```bash
# Check PostgreSQL
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db -c "SELECT version();"

# Check Redis
docker exec -it eventstorm-redis redis-cli ping
# Expected: PONG
```

---

## Stage 2: Redis Verification & Testing

### 2.1 Direct Redis Testing

```bash
cd /home/toto/dev/vc-3/backend

# Ensure dependencies installed
npm install

# Test Redis connection
node test-connections.js
```

**Expected Output:**
```
=== Testing Database Connections ===
Testing PostgreSQL connection...
✅ PostgreSQL connected!
   Time: 2025-11-16T...
   Version: PostgreSQL 15.x

Testing Redis connection...
✅ Redis connected!
   Test write/read: SUCCESS

=== Results ===
🎉 All connections successful!
```

### 2.2 If Redis Test Fails

**Troubleshooting Steps:**

1. **Check Redis container is running:**
   ```bash
   docker ps | grep redis
   ```

2. **Check Redis logs:**
   ```bash
   docker logs eventstorm-redis
   ```

3. **Verify port binding:**
   ```bash
   docker port eventstorm-redis
   # Should show: 6379/tcp -> 0.0.0.0:6379
   ```

4. **Test with redis-cli:**
   ```bash
   # From host
   docker exec -it eventstorm-redis redis-cli ping
   
   # Test set/get
   docker exec -it eventstorm-redis redis-cli set test_key "hello"
   docker exec -it eventstorm-redis redis-cli get test_key
   ```

5. **Check environment variables:**
   ```bash
   # Should be localhost:6379 for local dev
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

### 2.3 Redis GUI (Optional)

Access Redis Commander: http://localhost:8081

---

## Stage 3: Environment Variables Migration

### 3.1 Understanding Current Setup

Your app loads environment from:
- `.env` file (via dotenv)
- Schema validation: `backend/env_schemas/dotenv.json`

### 3.2 Create Local .env File

Create `/home/toto/dev/vc-3/backend/.env`:

```bash
# ============================================
# LOCAL DEVELOPMENT ENVIRONMENT
# ============================================

# Server Configuration
PORT=3000
APP_URL=http://localhost:3000
NODE_ENV=development

# ============================================
# DATABASE - Local Docker PostgreSQL
# ============================================
PG_CONNECTION_STRING=postgresql://eventstorm_user:local_dev_password@localhost:5432/eventstorm_db
PG_USER=eventstorm_user
PG_PASSWORD=local_dev_password
PG_DATABASE=eventstorm_db

# Not needed for local (only for GCP Cloud SQL)
# CLOUD_SQL_CONNECTION_NAME=

# ============================================
# REDIS - Local Docker Redis
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_SECRET=local_dev_redis_secret

# ============================================
# AUTHENTICATION & SECURITY
# ============================================
JWT_SECRET=local_dev_jwt_secret_change_in_production
JWT_EXPIRE_IN=1h
COOKIE_SECRET=local_dev_cookie_secret_at_least_32_chars
SESSION_SECRET=local_dev_session_secret_at_least_32_chars

# ============================================
# OAUTH2 (if needed for local development)
# ============================================
# GCP_OAUTH2_CLIENT_ID=your_client_id
# GCP_OAUTH2_CLIENT_SECRET=your_client_secret

# ============================================
# EXTERNAL APIS - Keep your actual API keys
# ============================================

# GitHub
GITHUB_TOKEN=ghp_your_actual_github_token

# Pinecone Vector Database
PINECONE_API_KEY=your_actual_pinecone_api_key
PINECONE_INDEX_NAME=your_pinecone_index_name

# OpenAI
OPENAI_API_KEY=sk-your_actual_openai_key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your_actual_anthropic_key

# Google AI
GOOGLE_API_KEY=your_actual_google_api_key

# YouTube API
YOUTUBE_API_KEY=your_actual_youtube_api_key

# ============================================
# EMBEDDINGS
# ============================================
EMBEDDINGS_PROVIDER=openai

# ============================================
# OLLAMA (Local LLM - Optional)
# ============================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# ============================================
# PUB/SUB - Local Development (Stage 4)
# ============================================
# Will be configured in Stage 4
# PUBSUB_MAIN_SUBSCRIPTION=local-main-subscription

# ============================================
# GCP - Not needed for local development
# ============================================
# GOOGLE_APPLICATION_CREDENTIALS=
# USER_OAUTH2_CREDENTIALS=
```

### 3.3 Secure Your .env File

```bash
# Add to .gitignore if not already there
echo "backend/.env" >> .gitignore
echo ".env" >> .gitignore

# Verify it's ignored
git status
```

### 3.4 Copy API Keys from GCP

**Option A: From GCP VM** (if you have access)
```bash
# On GCP VM
cat /path/to/.env | grep "API_KEY\|TOKEN"

# Copy the output and paste into your local .env
```

**Option B: From GCP Secret Manager** (if keys stored there)
```bash
# List secrets
gcloud secrets list --project=your-project-id

# Get secret value
gcloud secrets versions access latest --secret="SECRET_NAME"
```

---

## Stage 4: Pub/Sub Replacement Strategy

Your app uses GCP Pub/Sub for async message processing. For local development, you have **three options**:

### Option A: Redis Streams (Recommended - Simplest)

**Pros:** Already have Redis, native streams support, simple setup  
**Cons:** Different API than Pub/Sub

**Implementation:**

1. **Install Redis streams library:**
   ```bash
   cd /home/toto/dev/vc-3/backend
   npm install bull bullmq
   ```

2. **Create local Pub/Sub adapter:**

   Create `backend/pubsubLocalAdapter.js`:
   ```javascript
   // Simple Redis-based pub/sub for local development
   const { Queue, Worker } = require('bullmq');
   
   class LocalPubSub {
     constructor(redis) {
       this.redis = redis;
       this.queues = new Map();
       this.workers = new Map();
     }
   
     topic(topicName) {
       if (!this.queues.has(topicName)) {
         const queue = new Queue(topicName, {
           connection: this.redis
         });
         this.queues.set(topicName, queue);
       }
       return {
         publishMessage: async (data) => {
           const queue = this.queues.get(topicName);
           await queue.add('message', data);
         }
       };
     }
   
     subscription(subscriptionName) {
       return {
         on: (event, handler) => {
           if (event === 'message') {
             const worker = new Worker(subscriptionName, async (job) => {
               await handler({
                 data: Buffer.from(JSON.stringify(job.data)),
                 ack: async () => {},
                 nack: async () => {}
               });
             }, { connection: this.redis });
             this.workers.set(subscriptionName, worker);
           }
         }
       };
     }
   }
   
   module.exports = LocalPubSub;
   ```

3. **Modify pubsubPlugin.js for local development:**
   ```javascript
   // Update backend/pubsubPlugin.js
   const fp = require('fastify-plugin');
   const { PubSub } = require('@google-cloud/pubsub');
   const LocalPubSub = require('./pubsubLocalAdapter');
   
   module.exports = fp(async function pubsubPlugin(fastify, opts) {
     let pubsubClient;
     
     if (process.env.NODE_ENV === 'development' || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
       // Use local Redis-based pub/sub
       fastify.log.info('Using LOCAL Redis-based Pub/Sub');
       pubsubClient = new LocalPubSub(fastify.redis);
     } else {
       // Use GCP Pub/Sub in production
       fastify.log.info('Using GCP Pub/Sub');
       pubsubClient = new PubSub();
     }
     
     fastify.decorate('pubsubClient', pubsubClient);
     fastify.log.info('✅ PubSub client registered');
     
     fastify.addHook('onClose', async (instance, done) => {
       fastify.log.info('🧹 pubsubClient plugin scope closing');
       done();
     });
   });
   ```

### Option B: Mock Pub/Sub (Simplest for Testing)

**For quick local development without real async processing:**

```javascript
// backend/pubsubMockAdapter.js
class MockPubSub {
  topic(topicName) {
    return {
      publishMessage: async (data) => {
        console.log(`[MOCK] Published to ${topicName}:`, data);
        return { messageId: 'mock-' + Date.now() };
      }
    };
  }
  
  subscription(subscriptionName) {
    return {
      on: (event, handler) => {
        console.log(`[MOCK] Subscription ${subscriptionName} registered for ${event}`);
        // Messages won't actually be processed
      }
    };
  }
}

module.exports = MockPubSub;
```

### Option C: GCP Pub/Sub Emulator (Most Realistic)

**If you need exact Pub/Sub behavior:**

```bash
# Install emulator
gcloud components install pubsub-emulator

# Start emulator
gcloud beta emulators pubsub start --port=8085

# Set environment
export PUBSUB_EMULATOR_HOST=localhost:8085

# Your existing code will work unchanged
```

**Recommendation:** Start with **Option B (Mock)** for immediate development, then implement **Option A (Redis Streams)** for full functionality.

---

## Stage 5: Backend Configuration Updates

### 5.1 Update NPM Scripts for Local Development

Edit `backend/package.json`:

```json
{
  "scripts": {
    "dev": "fastify start server.js --watch --port 3000 -l debug | pino-pretty",
    "dev:local": "NODE_ENV=development fastify start server.js --watch --watch-ignore logs/ --port 3000 -l debug | pino-pretty --translateTime 'SYS:standard' --colorize",
    "dev:gcp": "concurrently --kill-others-on-fail \"./cloud-sql-proxy eventstorm-1:me-west1:eventstorm-pg-instance-1 --port 5432\" \"NODE_DEBUG=fastify fastify start server.js --watch --port 3000 -l trace | pino-pretty\"",
    "test": "jest",
    "test:integration": "jest -c jest.integration.config.js"
  }
}
```

### 5.2 Verify Backend Dependencies

```bash
cd /home/toto/dev/vc-3/backend
npm install
```

### 5.3 Test Backend Startup

```bash
# Make sure Docker containers are running
docker compose ps

# Start backend
npm run dev:local
```

**Watch for:**
- ✅ PostgreSQL connection successful
- ✅ Redis connection successful
- ✅ Server listening on port 3000
- ⚠️ Pub/Sub warnings (expected if not configured yet)

---

## Stage 6: Frontend Setup

### 6.1 Install Frontend Dependencies

```bash
cd /home/toto/dev/vc-3/client
npm install
```

### 6.2 Configure Frontend Environment

Create `client/.env`:

```bash
VITE_API_URL=http://localhost:3000
```

### 6.3 Start Frontend

```bash
cd /home/toto/dev/vc-3/client
npm run dev
```

Access at: http://localhost:5173

---

## Stage 7: Complete Testing & Verification

### 7.1 Test All Connections

```bash
cd /home/toto/dev/vc-3/backend
node test-connections.js
```

### 7.2 Test Backend API

```bash
# Health check
curl http://localhost:3000/health

# API endpoints
curl http://localhost:3000/api/...
```

### 7.3 Test Frontend → Backend Communication

Open browser to http://localhost:5173 and verify:
- Page loads correctly
- API calls succeed
- Authentication works (if applicable)

---

## Stage 8: Development Workflow

### 8.1 Starting Your Dev Environment

Create a convenience script `start-dev-local.sh`:

```bash
#!/bin/bash
# /home/toto/dev/vc-3/start-dev-local.sh

echo "🚀 Starting Local Development Environment..."

# Check Docker is accessible
if ! docker ps > /dev/null 2>&1; then
  echo "❌ Cannot connect to Docker."
  echo "   Please start Docker Desktop on Windows and enable WSL2 integration."
  exit 1
fi

# Start Docker infrastructure
echo "📦 Starting Docker services..."
docker compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Test connections
echo "🔍 Testing connections..."
cd backend && node test-connections.js

if [ $? -eq 0 ]; then
  echo "✅ All services ready!"
  echo ""
  echo "To start backend: cd backend && npm run dev:local"
  echo "To start frontend: cd client && npm run dev"
else
  echo "❌ Service check failed. Check Docker containers."
fi
```

```bash
chmod +x start-dev-local.sh
```

### 8.2 Stopping Your Dev Environment

Create `stop-dev-local.sh`:

```bash
#!/bin/bash
# /home/toto/dev/vc-3/stop-dev-local.sh

echo "🛑 Stopping Local Development Environment..."

# Stop Docker services
docker compose down

echo "✅ All services stopped!"
echo "💡 Data is preserved in Docker volumes"
echo "   To delete all data: docker compose down -v"
```

```bash
chmod +x stop-dev-local.sh
```

Or run directly:
```bash
# Stop and remove containers (data persists)
docker compose down

# Just stop (containers can be restarted faster)
docker compose stop
```

### 8.3 Daily Development Commands

**In WSL2 terminal (use VSCode integrated terminal):**

```bash
# Terminal 1: Infrastructure
cd /home/toto/dev/vc-3
./start-dev-local.sh

# Terminal 2: Backend
cd /home/toto/dev/vc-3/backend
npm run dev:local

# Terminal 3: Frontend  
cd /home/toto/dev/vc-3/client
npm run dev

# Terminal 4: Tests/Commands
cd /home/toto/dev/vc-3/backend
npm test
```

**VSCode Tips:**
- Use `Ctrl+Shift+` ` to open new terminal
- Terminals automatically use WSL2 bash
- Can split terminals with split icon

---

## Stage 9: Advanced Setup (Optional)

### 9.1 Database Migration

If you have existing data on GCP:

```bash
# Option A: Export from GCP Cloud SQL (if you have gcloud CLI in WSL2)
gcloud sql export sql eventstorm-pg-instance-1 \
  gs://your-bucket/export.sql \
  --database=eventstorm_db

gsutil cp gs://your-bucket/export.sql ./backup.sql

# Option B: If you have a backup file already
# Download to WSL2 from anywhere and place in project dir

# Import to local Docker PostgreSQL
cd /home/toto/dev/vc-3
docker exec -i eventstorm-postgres psql -U eventstorm_user -d eventstorm_db < backup.sql
```

### 9.2 Redis Data Export (if needed)

```bash
# On GCP
redis-cli --rdb dump.rdb

# Import to local
docker cp dump.rdb eventstorm-redis:/data/dump.rdb
docker restart eventstorm-redis
```

### 9.3 VSCode Extensions

**Essential for WSL2 development:**
- **Remote - WSL** (ms-vscode-remote.remote-wsl) ✅ Required!
- Docker (ms-azuretools.vscode-docker)
- PostgreSQL (ckolkman.vscode-postgres)
- Redis (redis.redis-for-vscode)
- REST Client (humao.rest-client)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)

**How to use:**
1. Install extensions in WSL2: Open VSCode in WSL2 (`code .` from WSL2 terminal)
2. Extensions installed in "WSL: Debian" appear in extensions panel
3. Some extensions need separate installation for WSL2

### 9.4 VSCode Tasks

**Note:** Existing `tasks.json` has PowerShell tasks that won't work in WSL2.

You can either:
1. Use the bash scripts directly (`./start-dev-local.sh`)
2. Create new WSL2-compatible tasks (I can help with this)
3. Run docker compose commands directly

**Quick task workaround:**
- Use VSCode integrated terminal (automatically uses WSL2 bash)
- Run: `docker compose up -d postgres redis`

---

## Stage 10: Troubleshooting Guide

### Docker Issues

**Problem: Docker daemon not running**
```bash
# Windows: Start Docker Desktop application
# Wait for whale icon to be stable in system tray

# Verify in WSL
docker ps
```

**Problem: Cannot connect to Docker from WSL2**
```bash
# Error: "cannot connect to the docker daemon at unix:///var/run/docker.sock"

# Solution:
# 1. Check Docker Desktop is running on Windows
# 2. In Docker Desktop: Settings → Resources → WSL Integration
# 3. Enable "Debian" distribution
# 4. Click "Apply & Restart"
# 5. In WSL2 terminal, verify: docker ps

# If still not working, restart WSL2:
# From PowerShell on Windows:
wsl --shutdown
# Then reopen WSL2 terminal
```

**Problem: Containers won't start**
```bash
# Check logs
docker compose logs postgres redis

# Remove containers and restart
docker compose down -v
docker compose up -d
```

### Connection Issues

**Problem: Cannot connect to PostgreSQL**
```bash
# Check container is running
docker ps | grep postgres

# Check logs
docker logs eventstorm-postgres

# Test connection
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db

# Check port
docker port eventstorm-postgres
# Should show: 5432/tcp -> 0.0.0.0:5432
```

**Problem: Cannot connect to Redis**
```bash
# Check container
docker ps | grep redis

# Test
docker exec -it eventstorm-redis redis-cli ping

# Check if port is bound
netstat -an | grep 6379
```

**Problem: Backend won't start**
```bash
# Check environment variables
cd backend
cat .env

# Check dependencies
npm install

# Check logs
npm run dev:local 2>&1 | tee backend.log
```

### Port Conflicts

**Problem: Port already in use**
```bash
# Find what's using the port (e.g., 3000)
sudo lsof -i :3000
# OR
sudo netstat -tulpn | grep :3000

# Kill the process
sudo kill -9 <PID>

# Or change your app's port in .env
PORT=3001
```

---

## Quick Reference

### Essential Commands

```bash
# Start infrastructure
docker compose up -d postgres redis

# Stop infrastructure
docker compose down

# Check status
docker compose ps

# View logs
docker compose logs -f

# Test connections
cd backend && node test-connections.js

# Start backend
cd backend && npm run dev:local

# Start frontend
cd client && npm run dev

# Run tests
cd backend && npm test
```

### Important Ports

- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Backend API**: localhost:3000
- **Frontend**: localhost:5173
- **pgAdmin**: localhost:8080 (if started)
- **Redis Commander**: localhost:8081 (if started)

### Key Files

- `docker-compose.yml` - Infrastructure services
- `backend/.env` - Environment variables
- `backend/test-connections.js` - Connection testing
- `backend/package.json` - NPM scripts
- `backend/env_schemas/dotenv.json` - Environment schema

---

## Next Steps After Setup

1. **✅ Verify Redis is working** (Current stage)
2. Configure Pub/Sub replacement (Stage 4)
3. Update backend for local development (Stage 5)
4. Test full stack locally (Stage 7)
5. Migrate any GCP-specific code to local equivalents
6. Set up deployment pipeline for GCP from local dev

---

## Success Criteria

Your local development environment is ready when:

- [ ] Docker Desktop running
- [ ] PostgreSQL container running and accessible
- [ ] Redis container running and accessible
- [ ] Backend starts without errors
- [ ] Frontend starts and loads
- [ ] Backend ↔ Frontend communication works
- [ ] All API keys configured
- [ ] Tests pass locally
- [ ] Can develop without GCP VM

---

## Migration Checklist

### Infrastructure
- [ ] Docker Desktop installed and running
- [ ] PostgreSQL container working ✓
- [ ] Redis container working (verify next)
- [ ] pgAdmin accessible (optional)
- [ ] Redis Commander accessible (optional)

### Configuration
- [ ] `.env` file created with all required variables
- [ ] API keys migrated from GCP
- [ ] Pub/Sub replacement implemented
- [ ] Local vs GCP configuration conditionals added

### Code Updates
- [ ] Remove cloud-sql-proxy from dev script
- [ ] Update database connection logic
- [ ] Update Pub/Sub client for local development
- [ ] Update any GCP-specific imports

### Testing
- [ ] Connection tests pass
- [ ] Backend unit tests pass
- [ ] Integration tests pass
- [ ] Frontend builds successfully
- [ ] E2E workflow tested

### Development Workflow
- [ ] Startup scripts created
- [ ] VSCode tasks configured
- [ ] Git workflow established
- [ ] Documentation updated

---

## Contact & Support

If you encounter issues:
1. Check the Troubleshooting section
2. Review Docker and service logs
3. Verify environment variables
4. Check GitHub issues for similar problems

---

**Document Status:** Ready for Stage 2 (Redis Verification)  
**Last Updated:** November 16, 2025  
**Next Action:** Start Docker Desktop, then run Redis tests
