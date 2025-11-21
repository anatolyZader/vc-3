# Docker & Login Issues - Complete Troubleshooting Guide

## Problem Context
When setting up local development for a Fastify + PostgreSQL + Redis application, you may encounter Docker networking issues and authentication problems. This guide documents the complete resolution process.

## Primary Issues Encountered

### 1. Docker Desktop WSL2 Networking Problems
- **Symptom**: `docker pull` commands hang indefinitely
- **Root Cause**: Docker Desktop WSL2 VM has DNS/networking conflicts
- **Error**: `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`

### 2. Mixed Docker Environments
- **Symptom**: Commands work but use wrong Docker daemon
- **Root Cause**: Docker Desktop proxy intercepting commands instead of native Docker
- **Evidence**: Process shows `/mnt/wsl/docker-desktop/docker-desktop-user-distro proxy`

### 3. Authentication Decorator Conflicts
- **Symptom**: `FastifyError: The decorator 'issueJwt' has already been added!`
- **Root Cause**: Duplicate decorator registrations in authPlugin.js

### 4. Database Connection Issues
- **Symptom**: Connection refused to PostgreSQL
- **Root Cause**: PostgreSQL running on port 5433, not 5432

## Complete Solution Steps

### Step 1: Fix WSL2 DNS Configuration
```bash
# Check current DNS
wsl -d Debian -e sh -c "cat /etc/resolv.conf"

# Fix DNS to use Google's resolver
wsl -d Debian -e sh -c "echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf"

# Prevent WSL from auto-regenerating resolv.conf
wsl -d Debian -e sh -c "echo '[network]' | sudo tee /etc/wsl.conf; echo 'generateResolvConf = false' | sudo tee -a /etc/wsl.conf"

# Restart WSL
wsl --shutdown
```

### Step 2: Identify Docker Environment Mixing
```bash
# Check which Docker you're using
which docker
# Should show: /usr/bin/docker (native) not Docker Desktop

# Check Docker context
docker context list
# Look for 'desktop-linux' context - this indicates Docker Desktop

# Check for Docker Desktop processes
ps aux | grep docker | grep -v grep
# Look for: /mnt/wsl/docker-desktop/docker-desktop-user-distro proxy

# Remove Docker Desktop context
docker context rm desktop-linux
```

### Step 3: Use Native Services Instead of Docker
```bash
# Install PostgreSQL and Redis natively
sudo apt update
sudo apt install -y postgresql-13 redis-server

# Start services
sudo service postgresql start
sudo service redis-server start

# Check PostgreSQL port (often 5433, not 5432)
sudo -u postgres psql -c "SHOW port;"

# Create database user matching your .env
sudo -u postgres createdb eventstorm_db
sudo -u postgres psql -c "CREATE USER eventstorm_user WITH PASSWORD 'local_dev_password'; GRANT ALL PRIVILEGES ON DATABASE eventstorm_db TO eventstorm_user;"

# Test Redis
redis-cli ping
# Should return: PONG
```

### Step 4: Fix Environment Configuration
Update `.env` with correct database port:
```env
# Add missing JWT configuration
JWT_EXPIRE_IN=24h

# Local Development OAuth Fallbacks
FALLBACK_CLIENT_ID=dev_client_id
FALLBACK_CLIENT_SECRET=dev_client_secret

# Fix database port (check actual port with psql)
DATABASE_HOST=localhost
DATABASE_PORT=5433  # NOT 5432!
DATABASE_NAME=eventstorm_db
DATABASE_USER=eventstorm_user
DATABASE_PASSWORD=local_dev_password
PG_CONNECTION_STRING=postgresql://eventstorm_user:local_dev_password@localhost:5433/eventstorm_db
```

### Step 5: Fix Authentication Decorator Duplicates
Check `backend/aop_modules/auth/authPlugin.js` for multiple `issueJwt` decorations:

```bash
# Find duplicate decorators
grep -n "issueJwt" backend/aop_modules/auth/authPlugin.js

# Should have only ONE declaration in the main plugin code
# Remove any duplicates in else blocks or other sections
```

### Step 6: Test the Setup
```bash
# Start backend without Cloud SQL proxy
cd backend
npm run dev-stable:local

# Test health endpoint
curl http://localhost:3000/health

# Test development authentication
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@localhost.com", "username": "Developer"}' \
  -c cookies.txt -v

# Should return 200 OK with JWT token and set authToken cookie

# Test authenticated endpoint
curl -b cookies.txt http://localhost:3000/api/auth/me
```

## Expected Working Architecture

### Local Development Mode
- **PostgreSQL**: Native on localhost:5433
- **Redis**: Native on localhost:6379
- **Backend**: localhost:3000
- **Authentication**: DevAuthProvider with in-memory user
- **Frontend**: localhost:5173 (when running)

### Authentication Flow
1. POST `/api/auth/dev-login` with optional email/username
2. Returns JWT token + sets secure cookie
3. Subsequent requests use cookie or Authorization header
4. JWT verified against in-memory dev user (no DB pollution)

## Key Files Modified

### `backend/.env`
- Added `JWT_EXPIRE_IN=24h`
- Added `FALLBACK_CLIENT_ID` and `FALLBACK_CLIENT_SECRET`
- Updated `DATABASE_PORT=5433`

### `backend/aop_modules/auth/authPlugin.js`
- Removed duplicate `issueJwt` decorator registrations
- Kept single centralized JWT creation function

### Architecture Files Created
- `DevAuthProvider.js` - Handles dev-mode authentication
- In-memory user storage prevents DB pollution
- Environment-gated (only in `NODE_ENV=development`)

## Quick Commands Reference

```bash
# Check services
sudo service postgresql status
sudo service redis-server status

# Check database port
sudo -u postgres psql -c "SHOW port;"

# Test database connection
PGPASSWORD='local_dev_password' psql -h localhost -p 5433 -U eventstorm_user -d eventstorm_db -c "\dt"

# Start backend
cd backend && npm run dev-stable:local

# Quick auth test
curl -X POST http://localhost:3000/api/auth/dev-login -d '{}'
```

## Troubleshooting Tips

### If Docker pulls still hang:
1. Try phone hotspot to rule out network restrictions
2. Use native services instead of containers
3. Check corporate firewall/VPN settings

### If authentication fails:
1. Check PostgreSQL is on correct port (`SHOW port;`)
2. Verify database user exists and has correct password
3. Look for duplicate decorator errors in logs
4. Ensure `NODE_ENV=development` is set

### If backend won't start:
1. Check for Cloud SQL proxy errors (use `dev-stable:local` script)
2. Verify all environment variables are set
3. Check for port conflicts (3000, 5433, 6379)
4. Look for missing dependencies

## Success Indicators

✅ **Backend starts successfully** with these log messages:
- `✅ Redis PING response: PONG`
- `route registered: "/api/auth/dev-login"`
- `Server listening at http://127.0.0.1:3000`

✅ **Authentication works**:
- `POST /api/auth/dev-login` returns 200 with JWT
- Cookie is set with proper security settings
- `GET /api/auth/me` returns user data when authenticated

✅ **Architecture is clean**:
- No database pollution (dev users in memory only)
- Single JWT creation method
- Environment-specific behavior
- Production settings preserved

This setup provides a robust local development environment that matches production architecture while avoiding common Docker/WSL2 pitfalls.