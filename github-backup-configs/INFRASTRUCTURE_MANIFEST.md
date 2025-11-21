# EventStorm Infrastructure Backup - COMPLETE
**Created:** $(date)
**Project:** eventstorm-1
**Region:** me-west1

## 🚀 CRITICAL INFRASTRUCTURE COMPONENTS FOUND

### 1. Redis Memorystore Instance ⚡
- **Instance Name:** `es`
- **Host:** `10.26.209.3` 
- **Port:** `6379`
- **Tier:** BASIC
- **Memory:** 2GB
- **Version:** REDIS_7_2
- **Network:** Private Service Access
- **Reserved IP Range:** 10.26.209.0/29
- **Config File:** `redis-instances-me-west1.json`

### 2. Secret Manager Secrets 🔐
**Found 11 secrets (values not exported for security):**
- `cookie-secret`
- `github-token` 
- `google-creds` (Service Account)
- `google-oauth2-secret`
- `jwt-secret`
- `pg-conn`
- `pg-pwd` 
- `redis-host`
- `redis-port`
- `redis-secret`
- `session-secret`

### 3. Cloud SQL Instances 🗄️
**Primary:** `eventstorm-pg-instance-1`
- **Version:** POSTGRES_16
- **Tier:** db-custom-4-16384 
- **Connection Name:** `eventstorm-1:me-west1:eventstorm-pg-instance-1`
- **Region:** me-west1

**Secondary:** `eventstorm-pg-instance` (backup/dev?)

### 4. VPC & Networking 🌐
- **Default VPC** with custom firewall rules
- **Private Service Access** for Redis connection
- **Reserved IP ranges** for services
- Files: `vpc-networks.json`, `firewall-rules.json`

### 5. Cloud Run Service ☁️
- **Service:** `eventstorm-backend`
- **Region:** me-west1
- **Image:** Container registry deployment
- **VPC Connector:** `cr-vpc-conn` (from deploy.yml)
- **Memory:** 2Gi, **CPU:** 2, **Max instances:** 10

### 6. Project Configuration 📊
- **Enabled APIs:** 60+ services
- **Quotas and limits:** Saved in `project-quotas.json`
- **Service accounts:** Multiple accounts for different services

## 🔄 CRITICAL MIGRATION REQUIREMENTS

### Redis Memorystore
```bash
# Recreate with EXACT same configuration
gcloud redis instances create es \
  --size=2 \
  --region=me-west1 \
  --network=default \
  --connect-mode=private-service-access \
  --redis-version=redis_7_2 \
  --tier=basic
```

### VPC Connector (for Cloud Run)
```bash
# This is referenced in your deploy.yml as 'cr-vpc-conn'
gcloud compute networks vpc-access connectors create cr-vpc-conn \
  --region=me-west1 \
  --range=10.8.0.0/28 \
  --network=default
```

### Secret Manager Recreation
```bash
# You must recreate all 11 secrets with proper values
# Example:
gcloud secrets create jwt-secret --data-file=jwt-secret.txt
# Repeat for each secret
```

### Cloud SQL Proxy Setup
- Connection string: `eventstorm-1:me-west1:eventstorm-pg-instance-1`
- Proxy command: `./cloud-sql-proxy eventstorm-1:me-west1:eventstorm-pg-instance-1 --port 5432`

## ⚠️ WHAT'S MISSING FROM ORIGINAL GUIDE
1. **Redis instance** (10.26.209.3:6379) - CRITICAL for sessions
2. **11 Secret Manager secrets** - CRITICAL for app functionality  
3. **VPC connector** - Required for Cloud Run networking
4. **Exact networking setup** - Private service access configuration
5. **Project quotas/limits** - May need adjustment in new project

