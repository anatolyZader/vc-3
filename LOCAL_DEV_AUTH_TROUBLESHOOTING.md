# Local Development Authentication Troubleshooting

## Quick Health Check

Run this command to test your local dev authentication:
```bash
cd /home/toto/dev/vc-3
node test-dev-auth.js
```

## Common Issues & Solutions

### 1. 🐳 Docker Not Running

**Problem:** Docker containers not accessible from WSL2
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solutions:**
```bash
# Option A: Start Docker Desktop on Windows
# Then enable WSL2 integration:
# Docker Desktop → Settings → Resources → WSL Integration → Enable "Debian"

# Option B: Check if Docker daemon is running in WSL2
sudo service docker start

# Verify access
docker ps
```

### 2. 🔑 Authentication Endpoints Not Working

**Problem:** `/api/auth/dev-login` returns 404 or 500

**Check:**
1. **Backend is running in development mode:**
   ```bash
   cd /home/toto/dev/vc-3/backend
   echo $NODE_ENV  # Should be "development"
   ```

2. **DevAuthProvider exists:**
   ```bash
   ls -la backend/aop_modules/auth/providers/
   # Should show devAuthProvider.js
   ```

3. **Backend logs show auth routes loaded:**
   ```bash
   # Look for these in backend startup logs:
   # "authRouter is loaded!"
   # "DevAuthProvider loaded in development mode"
   ```

### 3. 🍪 Cookie Issues

**Problem:** Authentication works but cookies aren't set

**Check your cookie settings in authController.js:**
```javascript
// Should be:
const cookieSecure = process.env.NODE_ENV !== 'development';  // false for local
const cookieSameSite = cookieSecure ? 'None' : 'Lax';         // 'Lax' for local
```

**Testing cookies:**
```bash
# Test with curl to see cookie headers
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v  # Shows headers including Set-Cookie
```

### 4. 🔧 JWT Token Issues

**Problem:** Tokens are malformed or expired quickly

**Check JWT configuration in .env:**
```bash
cd /home/toto/dev/vc-3/backend
grep JWT .env
# Should show:
# JWT_SECRET=<long-random-string>
# JWT_EXPIRE_IN=1h  # or desired duration
```

**Decode a token to debug:**
```javascript
// In browser console or Node.js:
const token = "your.jwt.token";
console.log(JSON.parse(atob(token.split('.')[1])));
```

### 5. 🗄️ Database Connection Issues

**Problem:** UserService fails when trying to save dev users

**Good news:** DevAuthProvider uses in-memory storage, so database issues shouldn't affect dev login!

**Check database separately:**
```bash
# Test PostgreSQL connection
docker exec -it postgres-container psql -U postgres -d eventstorm_db

# Test from backend
cd /home/toto/dev/vc-3/backend
node -e "
const db = require('./infrastructure/database/postgres/postgresAdapter');
db.testConnection().then(() => console.log('DB OK')).catch(console.error);
"
```

### 6. 🌐 CORS Issues in Browser

**Problem:** Frontend can't call auth endpoints

**Check CORS configuration:**
```javascript
// In your backend, should allow localhost:5173
const corsOrigin = process.env.NODE_ENV === 'development' 
  ? ['http://localhost:5173', 'http://localhost:3000']
  : 'https://eventstorm.me';
```

**Test API directly:**
```bash
# From browser console:
fetch('/api/auth/dev-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
})
.then(r => r.json())
.then(console.log);
```

### 7. 🔄 Port Conflicts

**Problem:** Backend won't start - port 3000 in use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (if safe)
sudo kill <PID>

# Or use different port
PORT=3001 npm run dev:local
```

## Step-by-Step Debugging

1. **Check environment:**
   ```bash
   cd /home/toto/dev/vc-3/backend
   echo "NODE_ENV: $NODE_ENV"
   echo "PORT: $PORT"
   ```

2. **Start backend with detailed logs:**
   ```bash
   npm run dev:local 2>&1 | tee debug.log
   ```

3. **Test auth endpoint manually:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/dev-login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@localhost.com"}' \
     -v
   ```

4. **Run the test script:**
   ```bash
   node test-dev-auth.js
   ```

## Integration Test

Complete end-to-end test:
```bash
# 1. Start infrastructure
docker compose up -d postgres redis

# 2. Start backend
cd backend && npm run dev:local &

# 3. Wait for startup
sleep 5

# 4. Test authentication
node test-dev-auth.js

# 5. Test with frontend
cd client && npm run dev
# Then visit http://localhost:5173 and try logging in
```

## Expected Successful Flow

1. **POST** `/api/auth/dev-login` → Returns token + user data
2. **Cookie** `authToken` is set (check browser dev tools)
3. **Protected endpoints** work with token in Authorization header or cookie
4. **Frontend** can authenticate and access protected features

## Getting Help

If none of the above works, provide these details:
```bash
# Environment
echo "OS: $(uname -a)"
echo "Node: $(node -v)"
echo "Docker: $(docker -v)"
echo "NODE_ENV: $NODE_ENV"

# Backend status
curl -f http://localhost:3000/health 2>/dev/null && echo "Backend: OK" || echo "Backend: NOT RESPONDING"

# Auth endpoint test
node test-dev-auth.js
```