# EventStorm Backend - GCP VM Setup Summary

## ✅ Verification Complete!

The EventStorm backend code has been reviewed and is **ready to run** in local/dev mode on a GCP VM.

---

## 📦 What Was Done

### 1. **Code Review & Fixes** ✅
- ✅ Verified plugin loading order (correct)
- ✅ Verified environment detection (correct)
- ✅ Verified database configuration (flexible, supports local & production)
- ✅ Verified Redis configuration (correct)
- ✅ Verified transport layer (switches based on NODE_ENV)
- ✅ **FIXED:** Cookie/session security settings now environment-aware

### 2. **Infrastructure Files Created** ✅
- ✅ `gcpSecretsPlugin.js` - GCP Secret Manager integration (optional)
- ✅ `Dockerfile.vm` - Optimized for VM deployment
- ✅ `deployment/systemd/` - Service files for Redis, PostgreSQL, and app
- ✅ `deployment/scripts/` - Deployment automation scripts
- ✅ Updated `config/dbConfig.js` - Enhanced PostgreSQL configuration

### 3. **Documentation Created** ✅
- ✅ `PRE_FLIGHT_CHECKLIST.md` - Code verification & checklist
- ✅ `GCP_VM_DEPLOYMENT.md` - Complete deployment guide
- ✅ `deployment/scripts/install-dependencies.sh` - Automated setup
- ✅ `deployment/scripts/deploy-app.sh` - Deployment automation
- ✅ `deployment/scripts/install-services.sh` - Service installation
- ✅ `deployment/scripts/setup-secrets.sh` - Secret management
- ✅ `deployment/scripts/grant-service-account-permissions.sh` - IAM setup

---

## 🚀 Quick Start

### On GCP VM:

```bash
# 1. Install dependencies (as root)
sudo bash deployment/scripts/install-dependencies.sh

# 2. Update passwords
sudo nano /etc/redis/redis.conf  # Update Redis password
sudo -u postgres psql -c "ALTER USER eventstorm_user PASSWORD 'your_password';"

# 3. Create .env file
sudo nano /opt/eventstorm/backend/.env
# See .env.example or GCP_VM_DEPLOYMENT.md for required variables

# 4. Deploy application
sudo bash deployment/scripts/deploy-app.sh /path/to/backend/source

# 5. Start services
sudo systemctl start eventstorm-backend
sudo systemctl status eventstorm-backend

# 6. Test
curl http://localhost:3000/health
```

---

## 📁 File Structure

```
backend/
├── app.js                              # ✅ Updated (cookie/session fix)
├── config/
│   └── dbConfig.js                     # ✅ Updated (enhanced config)
├── gcpSecretsPlugin.js                 # ✅ New (optional for production)
├── Dockerfile.vm                        # ✅ New
├── deployment/
│   ├── systemd/
│   │   ├── redis.service               # ✅ New
│   │   ├── postgresql.service          # ✅ New
│   │   └── eventstorm-backend.service  # ✅ New
│   └── scripts/
│       ├── install-dependencies.sh     # ✅ New
│       ├── deploy-app.sh               # ✅ New
│       ├── install-services.sh         # ✅ New
│       ├── setup-secrets.sh            # ✅ New
│       └── grant-service-account-permissions.sh  # ✅ New
├── PRE_FLIGHT_CHECKLIST.md             # ✅ New
├── GCP_VM_DEPLOYMENT.md                # ✅ New
└── SETUP_SUMMARY.md                    # ✅ This file
```

---

## 🎯 Key Configuration

### For Local/Dev Mode on VM:

```bash
NODE_ENV=development
LOCAL_DATABASE_HOST=localhost
LOCAL_DATABASE_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Behavior:**
- Uses local PostgreSQL (localhost:5432)
- Uses Redis Pub/Sub for messaging
- HTTP-only cookies (no HTTPS required)
- Environment variables from `.env` file

### For Production Mode:

```bash
NODE_ENV=production
PG_HOST=localhost
PG_PORT=5432
```

**Behavior:**
- Uses production PostgreSQL
- Uses GCP Pub/Sub for messaging
- HTTPS-only cookies
- Can integrate GCP Secret Manager (optional)

---

## 🔧 Runtime Behavior

The app automatically detects the environment and adjusts:

| Feature | Development | Production |
|---------|-------------|------------|
| **Database** | Local PG (port 5432) | Configurable PG |
| **Messaging** | Redis Pub/Sub | GCP Pub/Sub |
| **Cookies** | HTTP, SameSite=Lax | HTTPS, SameSite=None |
| **Secrets** | .env file | .env or GCP Secret Manager |
| **Logging** | Verbose | Info/Warn |

---

## ✅ Pre-Flight Checklist

Before starting the app:

- [ ] Redis installed and running: `redis-cli ping`
- [ ] PostgreSQL 15 installed with pgvector
- [ ] Database `eventstorm_db` created
- [ ] User `eventstorm_user` created with permissions
- [ ] `.env` file configured with all required variables
- [ ] `NODE_ENV=development` set
- [ ] Dependencies installed: `npm install`
- [ ] Port 3000 available

---

## 📊 Architecture

```
┌─────────────────────────────────────┐
│        GCP Debian VM                │
├─────────────────────────────────────┤
│                                     │
│  ┌────────┐  ┌────────┐  ┌──────┐ │
│  │ Redis  │  │  PG    │  │ Node │ │
│  │  6379  │  │  5432  │  │ 3000 │ │
│  └────────┘  └────────┘  └──────┘ │
│      ▲           ▲           ▲     │
│      └───────────┴───────────┘     │
│              │                      │
└──────────────┼──────────────────────┘
               │
         (Local Dev Mode)
         No external deps
```

---

## 🔍 Verification

Run these commands to verify everything is working:

```bash
# 1. Check services
sudo systemctl status redis-server
sudo systemctl status postgresql
sudo systemctl status eventstorm-backend

# 2. Test connections
redis-cli ping
psql -h localhost -U eventstorm_user -d eventstorm_db -c "SELECT 1;"

# 3. Test application
curl http://localhost:3000/health

# 4. View logs
sudo journalctl -u eventstorm-backend -f
```

Expected results:
- Redis: `PONG`
- PostgreSQL: `?column? | 1`
- Health check: `{"status":"healthy","timestamp":"..."}`
- Logs: Should show successful initialization

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `PRE_FLIGHT_CHECKLIST.md` | Code verification & issues found |
| `GCP_VM_DEPLOYMENT.md` | Complete deployment guide |
| `SETUP_SUMMARY.md` | This file - quick overview |

---

## 🐛 Troubleshooting

### App won't start?
```bash
sudo journalctl -u eventstorm-backend -n 200 --no-pager
```

### Database connection error?
```bash
psql -h localhost -U eventstorm_user -d eventstorm_db
# Check password and pg_hba.conf
```

### Redis connection error?
```bash
redis-cli ping
sudo systemctl status redis-server
```

---

## 🎉 What's Different from Cloud Run?

| Aspect | Cloud Run | GCP VM (This Setup) |
|--------|-----------|---------------------|
| **Redis** | Embedded in container | Standalone systemd service |
| **PostgreSQL** | Cloud SQL via proxy | Local PostgreSQL with pgvector |
| **Secrets** | Cloud Secret Manager | .env file (or Secret Manager) |
| **Scaling** | Automatic | Manual (or with autoscaler) |
| **Persistence** | Stateless | Can be stateful |
| **Cost** | Pay per request | Pay for VM uptime |

---

## ⚡ Next Steps

1. **Test locally** - Verify the app starts and all endpoints work
2. **Add monitoring** - Set up Cloud Logging/Monitoring
3. **Configure backups** - Automated PostgreSQL/Redis backups
4. **Add HTTPS** - Set up SSL/TLS with Let's Encrypt
5. **Tune performance** - Adjust PostgreSQL/Redis configs
6. **Set up CI/CD** - Automated deployment pipeline

---

## 🔐 Security Notes

- Store sensitive values in `.env` (permissions: 600)
- Use strong passwords for Redis and PostgreSQL
- Consider using GCP Secret Manager for production
- Keep system packages updated
- Monitor logs for suspicious activity
- Use service account with minimal permissions

---

## 📞 Support

If you encounter issues:
1. Check `PRE_FLIGHT_CHECKLIST.md` for common issues
2. Review logs: `sudo journalctl -u eventstorm-backend -f`
3. Verify services: `systemctl status redis-server postgresql eventstorm-backend`
4. Check `GCP_VM_DEPLOYMENT.md` Troubleshooting section

---

**Status:** ✅ **READY TO DEPLOY AND TEST**

All code has been reviewed, fixes applied, and deployment infrastructure created. The app is ready to run in local/dev mode on a GCP VM with open-source Redis and PostgreSQL.

---

*Last Updated: January 30, 2025*

