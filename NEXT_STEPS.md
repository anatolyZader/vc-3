# Next Steps - Local Development Setup

**Current Status:** PostgreSQL & Redis configured, waiting for Docker Desktop

---

## Immediate Actions Required

### 1. Start Docker Desktop (Do Now!)

**On your Windows host:**
1. Open Docker Desktop application
2. Wait for it to fully start (whale icon should be stable in system tray)
3. **Enable WSL2 Integration:**
   - Docker Desktop → Settings (gear icon)
   - Resources → WSL Integration
   - ✅ Enable "Debian" distribution
   - Click "Apply & Restart"

**Verify from WSL2:**
```bash
docker ps
# Should show empty list or running containers (not an error)
```

---

## 2. Start Infrastructure Services

Once Docker is accessible:

```bash
cd /home/toto/dev/vc-3

# Start PostgreSQL and Redis
./start-dev-local.sh

# Or manually:
docker compose up -d postgres redis
```

---

## 3. Verify Services are Working

```bash
# Run comprehensive Redis verification
./verify-redis.sh

# Or test manually:
cd backend
node test-connections.js
```

**Expected output:**
```
✅ PostgreSQL connected!
✅ Redis connected!
🎉 All connections successful!
```

---

## 4. Configure Backend Environment

Create `backend/.env` file with your configuration:

```bash
cd /home/toto/dev/vc-3/backend
nano .env  # or: code .env
```

**Add these variables:**

```bash
# ============================================
# SERVER
# ============================================
PORT=3000
APP_URL=http://localhost:3000
NODE_ENV=development

# ============================================
# DATABASE - Local Docker PostgreSQL
# ============================================
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=eventstorm_db
DATABASE_USER=eventstorm_user
DATABASE_PASSWORD=local_dev_password

# Alternative: Connection string format (if your app uses this)
PG_CONNECTION_STRING=postgresql://eventstorm_user:local_dev_password@localhost:5432/eventstorm_db
PG_USER=eventstorm_user
PG_PASSWORD=local_dev_password
PG_DATABASE=eventstorm_db

# ============================================
# REDIS - Local Docker
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_SECRET=local_dev_redis_secret

# ============================================
# AUTHENTICATION & SECURITY
# ============================================
JWT_SECRET=local_dev_jwt_secret_change_in_production_minimum_32_chars
JWT_EXPIRE_IN=1h
COOKIE_SECRET=local_dev_cookie_secret_minimum_32_characters_long
SESSION_SECRET=local_dev_session_secret_minimum_32_characters_long

# ============================================
# EXTERNAL APIS - Add your actual keys
# ============================================

# GitHub (get from: https://github.com/settings/tokens)
GITHUB_TOKEN=ghp_your_actual_github_personal_access_token

# Pinecone Vector Database (get from: https://www.pinecone.io/)
PINECONE_API_KEY=your_actual_pinecone_api_key
PINECONE_INDEX_NAME=your_pinecone_index_name

# OpenAI (get from: https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your_actual_openai_api_key

# Anthropic (get from: https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-your_actual_anthropic_api_key

# Google AI (get from: https://makersuite.google.com/app/apikey)
GOOGLE_API_KEY=your_actual_google_api_key

# YouTube API (if needed)
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
# OAUTH (if using Google OAuth)
# ============================================
# GCP_OAUTH2_CLIENT_ID=your_google_oauth_client_id
# GCP_OAUTH2_CLIENT_SECRET=your_google_oauth_client_secret

# ============================================
# NOT NEEDED FOR LOCAL DEVELOPMENT
# ============================================
# CLOUD_SQL_CONNECTION_NAME=  # Only for GCP
# GOOGLE_APPLICATION_CREDENTIALS=  # Only for GCP
# USER_OAUTH2_CREDENTIALS=  # Only for GCP
```

**Security Note:** Never commit `.env` file to git!

```bash
# Verify .env is in .gitignore
grep -E "^\.env$|^backend/\.env$" .gitignore
```

---

## 5. Update Backend Code for Local Development

Your backend currently has GCP-specific code that needs updating:

### A. Update Database Connection

**Current issue:** Backend uses `cloud-sql-proxy` in dev script

```bash
# Check current dev script
grep "cloud-sql-proxy" backend/package.json
```

**Fix needed:** Update `backend/package.json`:

Find the `dev` script and change to:
```json
"dev": "fastify start server.js --watch --port 3000 -l debug | pino-pretty",
"dev:local": "NODE_ENV=development fastify start server.js --watch --watch-ignore logs/ --port 3000 -l debug | pino-pretty --translateTime 'SYS:standard' --colorize",
```

### B. Check Database Connection Code

Look for Cloud SQL socket connections:

```bash
cd /home/toto/dev/vc-3/backend
grep -r "CLOUD_SQL_CONNECTION_NAME" . --include="*.js" | head -10
grep -r "/cloudsql/" . --include="*.js" | head -10
```

These need to be updated to use standard TCP connections.

### C. Verify Pub/Sub Configuration

```bash
grep -r "@google-cloud/pubsub" backend/ --include="*.js" | head -10
```

Your app uses Pub/Sub - you'll need to decide on a local alternative (covered in step 7).

---

## 6. Install Dependencies

```bash
# Backend
cd /home/toto/dev/vc-3/backend
npm install

# Frontend
cd /home/toto/dev/vc-3/client
npm install
```

---

## 7. Start Backend (Test Run)

```bash
cd /home/toto/dev/vc-3/backend
npm run dev:local
```

**Watch for:**
- ✅ Server starts on port 3000
- ✅ PostgreSQL connection successful
- ✅ Redis connection successful
- ⚠️ Pub/Sub warnings (expected, will fix later)
- ❌ Any errors (need to fix)

**Test the API:**
```bash
# In another terminal
curl http://localhost:3000/health
# or whatever health endpoint you have
```

---

## 8. Start Frontend

```bash
# In a new terminal
cd /home/toto/dev/vc-3/client
npm run dev
```

Access at: http://localhost:5173

---

## 9. Address Remaining GCP Services

### Pub/Sub Replacement Options

Your app uses GCP Pub/Sub for async processing. Choose an approach:

#### Option A: Mock for Development (Quickest)
- Messages are logged but not processed
- Good for UI/API development
- Not suitable for testing async features

#### Option B: Redis-based Queue (Recommended)
- Use Bull or BullMQ (Redis-backed)
- Similar async behavior
- Works with existing Redis container

#### Option C: Keep GCP Pub/Sub
- Continue using GCP Pub/Sub API remotely
- Requires GCP credentials
- Incurs GCP costs

**Recommendation:** Start with **Option A (Mock)** to get running quickly, then implement **Option B (Bull)** for full functionality.

### Secret Manager
- ✅ Replaced with `.env` file (done)

### OAuth Configuration
If using Google OAuth, update redirect URIs:
1. Go to Google Cloud Console
2. APIs & Services → Credentials
3. Find your OAuth client
4. Add authorized redirect URI: `http://localhost:3000/auth/callback`

---

## 10. Database Schema Migration

If you have an existing database schema from GCP:

```bash
# Option A: Export from GCP and import
# (On GCP VM or with gcloud CLI)
gcloud sql export sql eventstorm-pg-instance-1 \
  gs://your-bucket/schema.sql \
  --database=eventstorm_db

# Download and import
gsutil cp gs://your-bucket/schema.sql ./schema.sql
cat schema.sql | docker exec -i eventstorm-postgres psql -U eventstorm_user -d eventstorm_db

# Option B: Run migrations if you have them
cd backend
npm run migrate  # if you have migration scripts
```

---

## Checklist Progress

Track your progress:

- [ ] **Step 1:** Docker Desktop started and WSL2 integration enabled
- [ ] **Step 2:** Infrastructure services running (`./start-dev-local.sh`)
- [ ] **Step 3:** Services verified (`./verify-redis.sh` passes)
- [ ] **Step 4:** `backend/.env` created with API keys
- [ ] **Step 5:** Backend code updated (remove cloud-sql-proxy from dev script)
- [ ] **Step 6:** Dependencies installed (backend and frontend)
- [ ] **Step 7:** Backend starts successfully
- [ ] **Step 8:** Frontend starts successfully
- [ ] **Step 9:** Pub/Sub approach decided and implemented
- [ ] **Step 10:** Database schema migrated (if applicable)

---

## Quick Commands Reference

```bash
# Start infrastructure
cd /home/toto/dev/vc-3
./start-dev-local.sh

# Test connections
cd backend && node test-connections.js

# Start backend
cd backend && npm run dev:local

# Start frontend (new terminal)
cd client && npm run dev

# Stop infrastructure
./stop-dev-local.sh

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Access database
docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db
```

---

## Troubleshooting

### Docker not accessible
```bash
# Check Docker Desktop is running on Windows
# Then enable WSL2 integration:
# Docker Desktop → Settings → Resources → WSL Integration → Enable "Debian"

# Restart WSL2 if needed (from Windows PowerShell):
wsl --shutdown
# Then reopen WSL2 terminal
```

### Backend won't start
```bash
# Check environment variables are loaded
cd backend
cat .env | grep DATABASE_HOST

# Check dependencies
npm install

# Check for errors in detail
npm run dev:local 2>&1 | tee startup.log
```

### Port conflicts
```bash
# Check what's using ports
sudo lsof -i :3000  # Backend
sudo lsof -i :5173  # Frontend
sudo lsof -i :5432  # PostgreSQL
sudo lsof -i :6379  # Redis
```

---

## Next Documentation to Read

After completing these steps:
1. `WSL2_DEV_GUIDE.md` - WSL2-specific tips
2. `LOCAL_DEVELOPMENT_COMPLETE_PLAN.md` - Stage 4: Pub/Sub replacement
3. `WORKFLOW_GUIDE.md` - Daily development workflow

---

**Current Step:** Start Docker Desktop and verify accessibility
**Run this command when ready:** `docker ps`
