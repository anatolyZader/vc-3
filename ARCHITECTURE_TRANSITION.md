# Architecture Transition: GCP VM to Local Development

## Overview

Transitioning from cloud-based development on GCP VM to local development on Windows laptop with Docker.

---

## Architecture Comparison

### Before: GCP VM Development

```
┌─────────────────────────────────────────────────────┐
│                    GCP Project                      │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │           Compute Engine VM                  │  │
│  │              (Debian)                        │  │
│  │                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐        │  │
│  │  │   Backend    │  │  Frontend    │        │  │
│  │  │   Node.js    │  │    Vite      │        │  │
│  │  └──────┬───────┘  └──────────────┘        │  │
│  │         │                                    │  │
│  └─────────┼────────────────────────────────────┘  │
│            │                                        │
│  ┌─────────▼────────────────────────────┐          │
│  │     Cloud SQL (PostgreSQL)           │          │
│  │     /cloudsql/[connection-name]      │          │
│  │     (Unix Socket)                    │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │     Memorystore (Redis)              │          │
│  │     VPC Internal IP                  │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │     Secret Manager                   │          │
│  │     API Keys & Credentials           │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  ┌──────────────────────────────────────┐          │
│  │     Pub/Sub                          │          │
│  │     Message Queue                    │          │
│  └──────────────────────────────────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
           │                    │
           │                    │
      External APIs        Remote Access
           │                    │
           ▼                    ▼
    ┌─────────────┐      ┌─────────────┐
    │  Pinecone   │      │   Windows   │
    │  OpenAI     │      │   Laptop    │
    │  Anthropic  │      │  (VSCode)   │
    └─────────────┘      │  Remote SSH │
                         └─────────────┘
```

### After: Local Development

```
┌──────────────────────────────────────────────────────┐
│              Windows Laptop                          │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │          VSCode Local Workspace                │ │
│  │                                                │ │
│  │  ┌──────────────┐  ┌──────────────┐          │ │
│  │  │   Backend    │  │  Frontend    │          │ │
│  │  │   Node.js    │  │    Vite      │          │ │
│  │  │ localhost:   │  │ localhost:   │          │ │
│  │  │    3000      │  │    5173      │          │ │
│  │  └──────┬───────┘  └──────────────┘          │ │
│  │         │                                      │ │
│  └─────────┼──────────────────────────────────────┘ │
│            │                                        │
│  ┌─────────▼────────────────────────────────────┐  │
│  │        Docker Desktop (WSL2)                 │  │
│  │                                              │  │
│  │  ┌──────────────────────────────────────┐   │  │
│  │  │  PostgreSQL 15 Container            │   │  │
│  │  │  localhost:5432                     │   │  │
│  │  │  Volume: postgres_data              │   │  │
│  │  └──────────────────────────────────────┘   │  │
│  │                                              │  │
│  │  ┌──────────────────────────────────────┐   │  │
│  │  │  Redis 7 Container                  │   │  │
│  │  │  localhost:6379                     │   │  │
│  │  │  Volume: redis_data                 │   │  │
│  │  └──────────────────────────────────────┘   │  │
│  │                                              │  │
│  │  ┌──────────────────────────────────────┐   │  │
│  │  │  pgAdmin Container                  │   │  │
│  │  │  localhost:8080                     │   │  │
│  │  └──────────────────────────────────────┘   │  │
│  │                                              │  │
│  │  ┌──────────────────────────────────────┐   │  │
│  │  │  Redis Commander Container          │   │  │
│  │  │  localhost:8081                     │   │  │
│  │  └──────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  .env.local (replaces Secret Manager)       │  │
│  │  - API Keys                                  │  │
│  │  - Database Credentials                      │  │
│  │  - Configuration                             │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
└────────────────┬───────────────────────────────────┘
                 │
                 │  API Calls (HTTPS)
                 │
                 ▼
         ┌────────────────┐
         │  External APIs │
         │  (Cloud)       │
         │                │
         │  - Pinecone    │
         │  - OpenAI      │
         │  - Anthropic   │
         │  - Google APIs │
         └────────────────┘
```

---

## Service Migration Matrix

| Service | GCP VM | Local | Migration Status |
|---------|--------|-------|------------------|
| **PostgreSQL** | Cloud SQL<br>Unix socket<br>Internal IP | Docker container<br>TCP localhost:5432 | ✅ Complete |
| **Redis** | Memorystore<br>VPC connector<br>Internal IP | Docker container<br>TCP localhost:6379 | ✅ Complete |
| **Pinecone** | API call<br>HTTPS | API call<br>HTTPS | ✅ No change needed |
| **OpenAI** | API call<br>HTTPS | API call<br>HTTPS | ✅ No change needed |
| **Anthropic** | API call<br>HTTPS | API call<br>HTTPS | ✅ No change needed |
| **Secrets** | Secret Manager<br>API | .env.local<br>File | ⚠️ Needs update |
| **Pub/Sub** | GCP Pub/Sub<br>Internal | Bull/EventEmitter<br>or keep GCP | ⚠️ Optional update |
| **OAuth** | Configured for VM | Needs localhost redirect | ⚠️ Needs update |
| **IAM** | Service Account | .env.local | ⚠️ Needs update |

---

## Connection Changes

### Database Connection

#### Before (GCP)
```javascript
// Unix socket connection
const pool = new Pool({
  host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
});
```

#### After (Local)
```javascript
// TCP connection
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});
```

### Redis Connection

#### Before (GCP)
```javascript
// Memorystore with VPC
const redis = createClient({
  host: process.env.REDIS_HOST, // Internal VPC IP
  port: process.env.REDIS_PORT,
});
```

#### After (Local)
```javascript
// Docker Redis
const redis = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});
```

---

## File System Changes

### Development Location

| Aspect | GCP VM | Local |
|--------|--------|-------|
| **OS** | Debian Linux | Windows 11 |
| **Shell** | Bash | PowerShell |
| **Path Format** | `/home/user/app` | `c:\dev\vc-3` |
| **Line Endings** | LF | CRLF (Git handles) |
| **Permissions** | chmod/chown | Windows ACL |
| **Package Manager** | apt | Docker/npm |

### Environment Files

| File | GCP VM | Local |
|------|--------|-------|
| **Location** | `~/app/.env` | `c:\dev\vc-3\.env.local` |
| **Loaded by** | dotenv | dotenv |
| **Contains** | Database URLs, Secrets | Database config, API keys |
| **Secrets from** | Secret Manager API | Direct values |

---

## Network Architecture

### GCP VM Setup
```
Internet → Load Balancer → VM → VPC Network
                               ↓
                        Cloud SQL (private)
                        Memorystore (private)
                        Secret Manager (API)
                        Pub/Sub (API)
```

### Local Setup
```
Internet → Windows Firewall → Laptop
                               ↓
                        Docker Network (bridge)
                        ↓
                        PostgreSQL container
                        Redis container
                        
                        Internet (HTTPS)
                        ↓
                        External APIs (Pinecone, OpenAI, etc.)
```

---

## Port Mapping

### GCP VM Ports
- **Backend**: 3000 (internal)
- **Frontend**: 5173 (internal)
- **Cloud SQL**: Unix socket
- **Memorystore**: 6379 (VPC internal)

### Local Ports
- **Backend**: localhost:3000
- **Frontend**: localhost:5173
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **pgAdmin**: localhost:8080
- **Redis Commander**: localhost:8081

---

## Data Persistence

### GCP VM
- **Database**: Cloud SQL managed storage
- **Redis**: Memorystore managed storage
- **Backups**: GCP automated backups
- **Snapshots**: GCP disk snapshots

### Local
- **Database**: Docker volume `postgres_data`
- **Redis**: Docker volume `redis_data`
- **Backups**: Manual via `backup-db.ps1`
- **Snapshots**: Docker volume backups

---

## Development Workflow Comparison

### GCP VM Workflow
1. SSH into VM via VSCode Remote SSH
2. Edit files remotely
3. Run commands in remote terminal
4. Access services via internal IPs
5. View logs in Cloud Console

### Local Workflow
1. Open VSCode locally
2. Edit files on laptop
3. Run commands in local PowerShell
4. Access services via localhost
5. View logs in Docker Desktop / terminal

---

## Benefits of Local Development

### Performance
- ✅ No network latency for file operations
- ✅ Faster code reload and hot module replacement
- ✅ Direct access to debugging tools
- ✅ No SSH overhead

### Cost
- ✅ No VM runtime costs
- ✅ No Cloud SQL charges for development
- ✅ No Memorystore charges for development
- ✅ Only pay for API calls (Pinecone, OpenAI, etc.)

### Flexibility
- ✅ Work offline (except for external APIs)
- ✅ Full control over infrastructure
- ✅ Easy to reset and recreate environment
- ✅ Can run multiple projects simultaneously

### Development Experience
- ✅ Native VSCode performance
- ✅ Better debugging capabilities
- ✅ Easier to experiment
- ✅ Local database management tools

---

## Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| **Different OS** | Use Docker for consistent environment |
| **Path differences** | Git handles line endings, use cross-platform paths |
| **No VPC networking** | Use localhost, keep external APIs |
| **Secret management** | Use .env.local (never commit!) |
| **Database migration** | Export from GCP, import to local |
| **Pub/Sub replacement** | Use Bull/BullMQ or keep GCP remotely |

---

## Next Phase: Further Migration

### Potential Future Steps

1. **Containerize entire application**
   - Backend in Docker
   - Frontend in Docker
   - Full docker-compose stack

2. **Add local testing infrastructure**
   - Test database
   - Mock services
   - Integration test suite

3. **CI/CD pipeline**
   - Local → GitHub → GCP deployment
   - Automated testing
   - Infrastructure as Code

4. **Pub/Sub alternative**
   - Bull/BullMQ for job queues
   - RabbitMQ for messaging
   - Or keep GCP Pub/Sub remotely

---

## Summary

You've successfully migrated from:
- **Remote development** on GCP VM
- To **local development** on Windows laptop
- Using **Docker** for infrastructure services
- Maintaining **cloud APIs** for specialized services

This gives you the best of both worlds:
- Fast, local development experience
- Access to powerful cloud AI/ML services
- Cost-effective development workflow
- Production-like local environment
