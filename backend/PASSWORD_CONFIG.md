# 🔐 Password Configuration for EventStorm Backend

## Current Password Status (2025-11-30)

### ✅ PostgreSQL
- **User:** `eventstorm_user`
- **Password:** `eventstorm_secure_pass`
- **Database:** `eventstorm_db`
- **Host:** `localhost`
- **Port:** `5432`
- **Status:** ✅ Verified working

### ✅ Redis
- **Host:** `localhost`
- **Port:** `6379`
- **Password:** `CHANGE_THIS_REDIS_PASSWORD`
- **Status:** ✅ Verified working (password enforced after restart)

---

## Required .env Variables

Your `.env` file should have these values:

```bash
# PostgreSQL Configuration
LOCAL_DATABASE_HOST=localhost
LOCAL_DATABASE_PORT=5432
LOCAL_DATABASE_NAME=eventstorm_db
LOCAL_DATABASE_USER=eventstorm_user
LOCAL_DATABASE_PASSWORD=eventstorm_secure_pass

# Or using connection string format:
# PG_CONNECTION_STRING=postgresql://eventstorm_user:eventstorm_secure_pass@localhost:5432/eventstorm_db

# Production (if different from local)
PG_USER=eventstorm_user
PG_PASSWORD=eventstorm_secure_pass
PG_DATABASE=eventstorm_db
PG_HOST=localhost
PG_PORT=5432

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_SECRET=CHANGE_THIS_REDIS_PASSWORD
```

---

## ⚠️ Security Recommendations

### For Local Development (Current Setup)
The current passwords are fine for local development on the VM.

### For Production Deployment
**IMPORTANT:** Before going to production, change these passwords to strong, randomly-generated values:

```bash
# Change PostgreSQL password
sudo -u postgres psql -c "ALTER USER eventstorm_user PASSWORD 'STRONG_RANDOM_PASSWORD';"

# Update Redis password
sudo sed -i 's/requirepass CHANGE_THIS_REDIS_PASSWORD/requirepass YOUR_STRONG_REDIS_PASSWORD/' /etc/redis/redis.conf
sudo systemctl restart redis-server
```

Then update your `.env` file accordingly.

---

## Verification Commands

### Test PostgreSQL Connection
```bash
PGPASSWORD='eventstorm_secure_pass' psql -h localhost -U eventstorm_user -d eventstorm_db -c "SELECT version();"
```

### Test Redis Connection
```bash
redis-cli -a "CHANGE_THIS_REDIS_PASSWORD" PING
```

---

## Next Steps

1. ✅ **PostgreSQL password:** Already set to `eventstorm_secure_pass`
2. ✅ **Redis password:** Already set to `CHANGE_THIS_REDIS_PASSWORD`
3. 🔄 **Update .env file:** Make sure these values are in your `.env` file
4. 🔄 **Restart backend:** After updating `.env`, restart the backend application

---

*Last updated: 2025-11-30 17:31 UTC*

