# EventStorm Backend - GCP VM Deployment Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [VM Setup](#vm-setup)
5. [Deployment](#deployment)
6. [Configuration](#configuration)
7. [Operations](#operations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers deploying the EventStorm backend to a **GCP Debian VM** with:

- ✅ **Open-source Redis** (in-memory store, local Pub/Sub for dev)
- ✅ **Open-source PostgreSQL 15 with pgvector** (persistence)
- ✅ **GCP Pub/Sub** (messaging in production)
- ✅ **GCP IAM** (authentication and authorization)
- ✅ **GCP Secret Manager** (secrets in production - optional)
- ✅ **Node.js 18** (application runtime)

---

## Architecture

### Service Layout

```
┌─────────────────────────────────────────────────────────────┐
│                        GCP Debian VM                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Redis      │  │ PostgreSQL   │  │   Node.js    │      │
│  │  (Port 6379) │  │  (Port 5432) │  │  (Port 3000) │      │
│  │              │  │   +pgvector  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                   │              │
│         └─────────────────┴───────────────────┘              │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            │ (Connections to GCP Services)
                            │
              ┌─────────────┴──────────────┐
              │                            │
         ┌────▼─────┐              ┌──────▼──────┐
         │ GCP IAM  │              │ GCP Pub/Sub │
         │          │              │  (optional) │
         └──────────┘              └─────────────┘
```

### Runtime Modes

| Mode | NODE_ENV | Database | Messaging | Use Case |
|------|----------|----------|-----------|----------|
| **Local Dev** | development | Local PG (port 5433) | Redis Pub/Sub | Development on VM |
| **Production** | production | Local/Remote PG (port 5432) | GCP Pub/Sub | Production deployment |

---

## Prerequisites

### 1. GCP VM Instance

Create a Debian 11/12 VM:

```bash
gcloud compute instances create eventstorm-backend \
  --project=eventstorm-1 \
  --zone=us-west1-a \
  --machine-type=e2-standard-2 \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --scopes=https://www.googleapis.com/auth/cloud-platform \
  --tags=http-server,https-server
```

**Recommended specs:**
- **Machine type:** e2-standard-2 (2 vCPU, 8GB RAM)
- **Disk:** 30GB standard persistent disk
- **OS:** Debian 11 or 12

### 2. Firewall Rules

```bash
# Allow HTTP/HTTPS traffic
gcloud compute firewall-rules create allow-http \
  --project=eventstorm-1 \
  --allow=tcp:80,tcp:443,tcp:3000 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=http-server
```

### 3. Service Account Permissions

The VM's service account needs:

```bash
# Grant permissions (run as project owner/admin)
PROJECT_ID="eventstorm-1"
SERVICE_ACCOUNT="<vm-service-account>@eventstorm-1.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/pubsub.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"  # Optional

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/logging.logWriter"
```

---

## VM Setup

### Step 1: Connect to VM

```bash
gcloud compute ssh eventstorm-backend --project=eventstorm-1 --zone=us-west1-a
```

### Step 2: Run Installation Script

```bash
# Switch to root
sudo su -

# Download deployment scripts
cd /tmp
git clone https://github.com/YOUR_ORG/eventstorm.git
cd eventstorm/backend/deployment/scripts

# Make scripts executable
chmod +x *.sh

# Install all dependencies
./install-dependencies.sh
```

This script installs:
- Redis Server
- PostgreSQL 15 with pgvector
- Node.js 18
- Google Cloud SDK
- Creates application user and directories

**Duration:** ~10-15 minutes

### Step 3: Update Passwords

```bash
# Update Redis password
sudo nano /etc/redis/redis.conf
# Find: requirepass CHANGE_THIS_REDIS_PASSWORD
# Change to a strong password

# Update PostgreSQL password
sudo -u postgres psql -c "ALTER USER eventstorm_user PASSWORD 'your_secure_db_password';"

# Restart services
sudo systemctl restart redis-server
sudo systemctl restart postgresql
```

### Step 4: Verify Services

```bash
# Check Redis
redis-cli ping
# Should return: PONG

# Check PostgreSQL
sudo -u postgres psql -c "SELECT version();"
# Should show PostgreSQL 15.x

# Check pgvector
sudo -u postgres psql -d eventstorm_db -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
# Should show vector extension
```

---

## Deployment

### Step 1: Prepare Application Files

On your local machine:

```bash
cd /path/to/eventstorm/backend

# Create deployment package
tar -czf backend-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='logs' \
  --exclude='.env' \
  .

# Copy to VM
gcloud compute scp backend-deploy.tar.gz eventstorm-backend:/tmp/ \
  --project=eventstorm-1 \
  --zone=us-west1-a
```

### Step 2: Deploy to VM

On the VM:

```bash
# Extract deployment package
cd /tmp
sudo tar -xzf backend-deploy.tar.gz -C /opt/eventstorm/backend/

# Or use the deployment script
cd /path/to/deployment/scripts
sudo ./deploy-app.sh /tmp/backend-source
```

### Step 3: Configure Environment

```bash
# Create .env file
sudo nano /opt/eventstorm/backend/.env
```

**Minimum configuration for local dev mode:**

```bash
# Environment
NODE_ENV=development
PORT=3000

# Database (Local development)
LOCAL_DATABASE_HOST=localhost
LOCAL_DATABASE_PORT=5432  # Note: 5432 for production PostgreSQL
LOCAL_DATABASE_NAME=eventstorm_db
LOCAL_DATABASE_USER=eventstorm_user
LOCAL_DATABASE_PASSWORD=your_secure_db_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_SECRET=your_redis_password

# Security - Generate with: openssl rand -base64 32
COOKIE_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRE_IN=1h

# OAuth
GCP_OAUTH2_CLIENT_ID=979848823566-jrtu...apps.googleusercontent.com
GCP_OAUTH2_CLIENT_SECRET=your_oauth_secret

# GitHub
GITHUB_TOKEN=ghp_your_token_here

# AI Services (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Application
APP_URL=http://YOUR_VM_EXTERNAL_IP:3000
```

Set proper permissions:

```bash
sudo chown appuser:appuser /opt/eventstorm/backend/.env
sudo chmod 600 /opt/eventstorm/backend/.env
```

### Step 4: Install Systemd Services

```bash
cd /opt/eventstorm/backend/deployment/scripts
sudo ./install-services.sh
```

### Step 5: Start Application

```bash
# Start the service
sudo systemctl start eventstorm-backend.service

# Check status
sudo systemctl status eventstorm-backend.service

# View logs
sudo journalctl -u eventstorm-backend.service -f
```

---

## Configuration

### Environment-Specific Settings

#### Development Mode (on VM)

```bash
NODE_ENV=development
LOCAL_DATABASE_HOST=localhost
LOCAL_DATABASE_PORT=5432  # Local PostgreSQL
REDIS_HOST=localhost
```

**Behavior:**
- Uses local PostgreSQL (port 5432)
- Uses Redis Pub/Sub for messaging
- HTTP-only cookies (no HTTPS required)

#### Production Mode

```bash
NODE_ENV=production
PG_HOST=localhost  # Or remote host
PG_PORT=5432
PG_DATABASE=eventstorm_db
PG_USER=eventstorm_user
PG_PASSWORD=<from-secret-manager>
PG_USE_SSL=false  # true for remote connections
```

**Behavior:**
- Uses production PostgreSQL
- Uses GCP Pub/Sub for messaging
- HTTPS-only cookies (requires HTTPS setup)

### Database Connection Strings

The app supports multiple formats:

```bash
# Option 1: Individual variables (preferred)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=eventstorm_db
PG_USER=eventstorm_user
PG_PASSWORD=password

# Option 2: Connection string
PG_CONNECTION_STRING=postgresql://eventstorm_user:password@localhost:5432/eventstorm_db
```

### Redis Configuration

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_SECRET=your_redis_password  # Match requirepass in redis.conf
```

---

## Operations

### Service Management

```bash
# Start service
sudo systemctl start eventstorm-backend.service

# Stop service
sudo systemctl stop eventstorm-backend.service

# Restart service
sudo systemctl restart eventstorm-backend.service

# View status
sudo systemctl status eventstorm-backend.service

# Enable on boot
sudo systemctl enable eventstorm-backend.service

# Disable on boot
sudo systemctl disable eventstorm-backend.service
```

### Log Management

```bash
# View real-time logs
sudo journalctl -u eventstorm-backend.service -f

# View last 100 lines
sudo journalctl -u eventstorm-backend.service -n 100

# View logs from today
sudo journalctl -u eventstorm-backend.service --since today

# View logs with timestamps
sudo journalctl -u eventstorm-backend.service -o short-iso
```

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","timestamp":"2025-01-...","version":"0.x.y"}

# Check Redis connection
redis-cli ping

# Check PostgreSQL connection
sudo -u postgres psql -d eventstorm_db -c "SELECT 1;"
```

### Database Maintenance

```bash
# Backup database
sudo -u postgres pg_dump eventstorm_db > backup-$(date +%Y%m%d).sql

# Restore database
sudo -u postgres psql eventstorm_db < backup-20250130.sql

# Vacuum database
sudo -u postgres psql -d eventstorm_db -c "VACUUM ANALYZE;"
```

### Redis Maintenance

```bash
# Check Redis memory usage
redis-cli INFO memory

# Flush all data (CAREFUL!)
redis-cli FLUSHALL

# Save snapshot
redis-cli SAVE
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check service status
sudo systemctl status eventstorm-backend.service

# View detailed logs
sudo journalctl -u eventstorm-backend.service -n 200 --no-pager

# Common issues:
# 1. Missing environment variables
# 2. Redis not running
# 3. PostgreSQL not running
# 4. Port 3000 already in use
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U eventstorm_user -d eventstorm_db

# Check pg_hba.conf allows local connections
sudo cat /etc/postgresql/15/main/pg_hba.conf | grep local

# Should have:
# local   all   eventstorm_user   md5
```

### Redis Connection Errors

```bash
# Check Redis is running
sudo systemctl status redis-server

# Test connection
redis-cli ping

# If password protected:
redis-cli -a your_redis_password ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

### Port Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

### Permission Errors

```bash
# Fix ownership
sudo chown -R appuser:appuser /opt/eventstorm/backend

# Fix permissions
sudo chmod 755 /opt/eventstorm/backend
sudo chmod 600 /opt/eventstorm/backend/.env
```

---

## Performance Tuning

### PostgreSQL

Edit `/etc/postgresql/15/main/postgresql.conf`:

```ini
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Connections
max_connections = 100

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Redis

Edit `/etc/redis/redis.conf`:

```ini
# Memory
maxmemory 512mb
maxmemory-policy allkeys-lru

# Performance
tcp-backlog 511
tcp-keepalive 300
```

### Node.js

Set in environment or systemd service:

```bash
# Increase max memory
NODE_OPTIONS="--max-old-space-size=2048"

# Enable cluster mode (future)
NODE_ENV=production
```

---

## Security Checklist

- [ ] Strong passwords for Redis and PostgreSQL
- [ ] `.env` file has 600 permissions
- [ ] Firewall rules limit access
- [ ] Service account has minimum required permissions
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] SSL/TLS for external connections
- [ ] Backup encryption
- [ ] Monitoring and alerting configured

---

## Monitoring

### System Metrics

```bash
# CPU and memory
htop

# Disk usage
df -h

# Network connections
ss -tulpn
```

### Application Metrics

Use GCP Cloud Logging:

```bash
# Stream logs to Cloud Logging
sudo journalctl -u eventstorm-backend.service -f | \
  gcloud logging write eventstorm-backend-logs --severity=INFO
```

---

## Backup Strategy

### Automated Backups

```bash
# Create backup script
sudo nano /opt/eventstorm/scripts/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/eventstorm/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL backup
sudo -u postgres pg_dump eventstorm_db | gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Redis backup (copy RDB file)
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis-$DATE.rdb"

# Cleanup old backups (keep 7 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +7 -delete
```

```bash
# Schedule with cron
sudo crontab -e
0 2 * * * /opt/eventstorm/scripts/backup.sh
```

---

## Quick Reference

| Task | Command |
|------|---------|
| View logs | `sudo journalctl -u eventstorm-backend -f` |
| Restart app | `sudo systemctl restart eventstorm-backend` |
| Check Redis | `redis-cli ping` |
| Check PostgreSQL | `sudo -u postgres psql -l` |
| Health check | `curl http://localhost:3000/health` |
| Update code | `sudo ./deploy-app.sh /path/to/source` |

---

## Support

For issues or questions:
- Check logs: `sudo journalctl -u eventstorm-backend -f`
- Review [PRE_FLIGHT_CHECKLIST.md](./PRE_FLIGHT_CHECKLIST.md)
- Check [Troubleshooting](#troubleshooting) section above

---

Last Updated: January 2025

