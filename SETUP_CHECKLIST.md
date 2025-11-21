# Local Development Setup Checklist

Use this checklist to set up your local development environment.

## ✅ Prerequisites

- [ ] **Docker Desktop** installed and running
  - Download: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version`
  
- [ ] **Node.js** installed (v18+)
  - Verify: `node --version`
  
- [ ] **Git** configured
  - Verify: `git --version`
  
- [ ] **VSCode** with recommended extensions:
  - [ ] Docker (ms-azuretools.vscode-docker)
  - [ ] Database Client (cweijan.vscode-database-client2)
  - [ ] Thunder Client or REST Client (for API testing)

## ✅ Initial Setup

- [ ] **Clone repository** (if not already done)
  ```powershell
  git clone https://github.com/anatolyZader/vc-3.git
  cd vc-3
  ```

- [ ] **Create `.env.local`** file
  - [ ] Copy from `.env.local.backup` or create new
  - [ ] Add your API keys:
    - [ ] `PINECONE_API_KEY`
    - [ ] `PINECONE_ENVIRONMENT`
    - [ ] `OPENAI_API_KEY`
    - [ ] `ANTHROPIC_API_KEY`
    - [ ] `GOOGLE_API_KEY` (if needed)
  - [ ] Verify database settings:
    ```bash
    DATABASE_HOST=localhost
    DATABASE_PORT=5432
    DATABASE_NAME=eventstorm_db
    DATABASE_USER=eventstorm_user
    DATABASE_PASSWORD=local_dev_password
    REDIS_HOST=localhost
    REDIS_PORT=6379
    ```

- [ ] **Start Docker infrastructure**
  ```powershell
  .\start-dev.ps1
  ```
  
- [ ] **Verify Docker containers are running**
  ```powershell
  docker-compose ps
  .\scripts\test-connections.ps1
  ```

- [ ] **Install dependencies**
  ```powershell
  # Backend
  cd backend
  npm install
  
  # Frontend
  cd ..\client
  npm install
  ```

- [ ] **Initialize database** (if needed)
  ```powershell
  cd backend
  npm run migrate  # or your migration command
  # OR restore from backup:
  # ..\scripts\restore-db.ps1 -InputFile your-backup.sql
  ```

## ✅ Verify Setup

- [ ] **Test database connection**
  ```powershell
  docker exec -it eventstorm-postgres psql -U eventstorm_user -d eventstorm_db -c "\dt"
  ```

- [ ] **Test Redis connection**
  ```powershell
  docker exec -it eventstorm-redis redis-cli ping
  # Expected output: PONG
  ```

- [ ] **Access management tools**
  - [ ] pgAdmin: http://localhost:8080
    - Login: admin@eventstorm.local / admin123
  - [ ] Redis Commander: http://localhost:8081

- [ ] **Start backend**
  ```powershell
  cd backend
  npm run dev
  ```
  - [ ] Backend starts without errors
  - [ ] Can access: http://localhost:3000

- [ ] **Start frontend**
  ```powershell
  cd client
  npm run dev
  ```
  - [ ] Frontend starts without errors
  - [ ] Can access: http://localhost:5173
  - [ ] Frontend can communicate with backend

## ✅ Configuration Updates

- [ ] **Update backend database connection**
  - [ ] Check `backend/app.js` or database config
  - [ ] Remove Cloud SQL socket connections
  - [ ] Use standard PostgreSQL connection
  - [ ] Verify connection uses `.env.local` variables

- [ ] **Update Redis connection**
  - [ ] Check `backend/redisPlugin.js` or Redis config
  - [ ] Remove Memorystore VPC connector
  - [ ] Use standard Redis connection
  - [ ] Verify connection uses `.env.local` variables

- [ ] **Update OAuth redirect URIs** (if using OAuth)
  - [ ] Google Cloud Console: Add `http://localhost:3000` to authorized redirect URIs
  - [ ] Update OAuth config in backend

- [ ] **Replace Secret Manager** (if used)
  - [ ] Identify where GCP Secret Manager is used
  - [ ] Replace with environment variables from `.env.local`

## ✅ Optional Enhancements

- [ ] **Set up database migrations**
  - [ ] Choose migration tool (Knex, Sequelize, Prisma, etc.)
  - [ ] Create initial migration from GCP schema
  - [ ] Test migration on local database

- [ ] **Set up Pub/Sub alternative** (if needed)
  - [ ] Evaluate needs (Bull/BullMQ, RabbitMQ, or EventEmitter)
  - [ ] Install and configure
  - [ ] Update application code

- [ ] **Configure VSCode debugging**
  - [ ] Try "Debug Backend" launch configuration
  - [ ] Try "Debug Frontend" launch configuration
  - [ ] Try "Debug Full Stack" compound configuration

- [ ] **Set up testing**
  ```powershell
  cd backend
  npm test
  ```

## ✅ Daily Workflow

Your typical development day:

1. [ ] Start Docker Desktop (if not auto-starting)
2. [ ] Run `.\start-dev.ps1` (starts PostgreSQL & Redis)
3. [ ] Wait for containers to be healthy
4. [ ] Start backend: `cd backend; npm run dev`
5. [ ] Start frontend: `cd client; npm run dev`
6. [ ] Develop! 🎉
7. [ ] Stop backend/frontend: `Ctrl+C`
8. [ ] Run `.\stop-dev.ps1` (stops Docker containers)

## 🎯 Success Criteria

You're ready for development when:

- ✅ Docker containers start without errors
- ✅ PostgreSQL accepts connections
- ✅ Redis accepts connections
- ✅ Backend starts and connects to database
- ✅ Frontend starts and communicates with backend
- ✅ Can view data in pgAdmin/Redis Commander
- ✅ Application functions as expected

## 📚 Resources

- [QUICK_START.md](../QUICK_START.md) - Quick reference guide
- [LOCAL_DEVELOPMENT_SETUP.md](../LOCAL_DEVELOPMENT_SETUP.md) - Detailed documentation
- [scripts/README.md](../scripts/README.md) - Script documentation

## 🆘 Troubleshooting

If something doesn't work:

1. Check Docker Desktop is running: `docker info`
2. View container logs: `docker-compose logs -f`
3. Test connections: `.\scripts\test-connections.ps1`
4. Restart containers: `docker-compose restart`
5. Check [LOCAL_DEVELOPMENT_SETUP.md](../LOCAL_DEVELOPMENT_SETUP.md) troubleshooting section

## ✅ Completed Setup

- Setup completed on: _______________
- Database migrated: _______________
- First successful local run: _______________

**Notes:**
