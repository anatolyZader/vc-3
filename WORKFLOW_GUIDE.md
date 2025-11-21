# Local Development Workflow Guide

## Visual Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DAILY DEVELOPMENT WORKFLOW                       │
└─────────────────────────────────────────────────────────────────────┘

START
  │
  ├─► Is Docker Desktop running? ──NO──► Start Docker Desktop
  │                                       │
  │   ◄───────────────────────────────────┘
  │
  ├─► Are containers running? ──NO──► Run: .\start-dev.ps1
  │                                    │
  │   ◄────────────────────────────────┘
  │
  ├─► Test connections
  │   └─► Run: .\scripts\test-connections.ps1
  │        │
  │        ├─► PASS ──► Continue
  │        │
  │        └─► FAIL ──► Troubleshoot:
  │                     • Check Docker logs
  │                     • Restart containers
  │                     • Check ports
  │
  ├─► Start Backend
  │   └─► Terminal 1:
  │       cd backend
  │       npm run dev
  │       │
  │       ├─► SUCCESS ──► Backend running on :3000
  │       │
  │       └─► FAIL ──► Check:
  │                   • .env.local exists
  │                   • Dependencies installed
  │                   • Database connection
  │
  ├─► Start Frontend
  │   └─► Terminal 2:
  │       cd client
  │       npm run dev
  │       │
  │       ├─► SUCCESS ──► Frontend running on :5173
  │       │
  │       └─► FAIL ──► Check:
  │                   • Dependencies installed
  │                   • Port 5173 available
  │
  ├─► DEVELOP! 🎉
  │   • Write code
  │   • Test features
  │   • Debug as needed
  │   • Use VSCode debugger
  │
  ├─► End of Day
  │   │
  │   ├─► Stop Backend/Frontend (Ctrl+C in terminals)
  │   │
  │   ├─► Optional: Backup database
  │   │   └─► Run: .\scripts\backup-db.ps1
  │   │
  │   └─► Stop Docker containers
  │       └─► Run: .\stop-dev.ps1
  │
END
```

---

## Detailed Step-by-Step Guide

### 🌅 Morning Startup (5 minutes)

```
┌─────────────────────────────────────┐
│  STEP 1: Start Docker Desktop       │
└─────────────────────────────────────┘
    ↓
    • Windows Start Menu → Docker Desktop
    • Wait for "Docker Desktop is running"
    • Verify: docker info

┌─────────────────────────────────────┐
│  STEP 2: Start Infrastructure       │
└─────────────────────────────────────┘
    ↓
    PowerShell:
    cd c:\dev\vc-3
    .\start-dev.ps1
    
    Wait for:
    ✅ PostgreSQL: healthy
    ✅ Redis: healthy

┌─────────────────────────────────────┐
│  STEP 3: Verify Connections         │
└─────────────────────────────────────┘
    ↓
    .\scripts\test-connections.ps1
    
    Expected:
    ✅ PostgreSQL: Connected
    ✅ Redis: Connected

┌─────────────────────────────────────┐
│  STEP 4: Start Backend              │
└─────────────────────────────────────┘
    ↓
    New Terminal (Ctrl+Shift+`)
    cd backend
    npm run dev
    
    Wait for:
    Server listening on :3000 ✓

┌─────────────────────────────────────┐
│  STEP 5: Start Frontend             │
└─────────────────────────────────────┘
    ↓
    New Terminal (Ctrl+Shift+`)
    cd client
    npm run dev
    
    Wait for:
    Local: http://localhost:5173/ ✓

┌─────────────────────────────────────┐
│  STEP 6: Open Browser               │
└─────────────────────────────────────┘
    ↓
    http://localhost:5173
    
    Ready to code! 🚀
```

---

### 💻 Development Activities

```
┌───────────────────────────────────────────────────────────────┐
│                      DURING DEVELOPMENT                        │
└───────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  Write Code         │
│  • Edit files       │
│  • Hot reload auto  │
│  • See changes live │
└─────────────────────┘

┌─────────────────────┐
│  Debug Code         │
│  • Set breakpoints  │
│  • Press F5         │
│  • Step through     │
└─────────────────────┘

┌─────────────────────┐
│  Test Features      │
│  • Manual testing   │
│  • npm test         │
│  • Check logs       │
└─────────────────────┘

┌─────────────────────┐
│  Database Work      │
│  • pgAdmin :8080    │
│  • Run migrations   │
│  • Query data       │
└─────────────────────┘

┌─────────────────────┐
│  Redis Work         │
│  • Commander :8081  │
│  • View keys        │
│  • Flush cache      │
└─────────────────────┘

┌─────────────────────┐
│  Git Operations     │
│  • Commit changes   │
│  • Push to remote   │
│  • Pull updates     │
└─────────────────────┘
```

---

### 🌙 Evening Shutdown (2 minutes)

```
┌─────────────────────────────────────┐
│  STEP 1: Stop Development Servers   │
└─────────────────────────────────────┘
    ↓
    In Backend terminal: Ctrl+C
    In Frontend terminal: Ctrl+C
    
    Wait for graceful shutdown

┌─────────────────────────────────────┐
│  STEP 2: Optional Backup            │
└─────────────────────────────────────┘
    ↓
    If you made database changes:
    .\scripts\backup-db.ps1
    
    Creates: backup_YYYYMMDD_HHMMSS.sql

┌─────────────────────────────────────┐
│  STEP 3: Stop Docker Containers     │
└─────────────────────────────────────┘
    ↓
    .\stop-dev.ps1
    
    Stops all Docker containers
    Data is preserved in volumes

┌─────────────────────────────────────┐
│  STEP 4: Optional - Close Docker    │
└─────────────────────────────────────┘
    ↓
    Right-click Docker Desktop tray icon
    → Quit Docker Desktop
    (Or leave it running)

    Done! 🎉
```

---

## VSCode Task Integration

### Using Built-in Tasks (Easier!)

```
┌─────────────────────────────────────────────────────────────┐
│              USING VSCODE TASKS (RECOMMENDED)                │
└─────────────────────────────────────────────────────────────┘

Press: Ctrl+Shift+P
Type: "Tasks: Run Task"

Available Tasks:
┌─────────────────────────────────┐
│  Start All Services             │  ← Starts everything!
│  --------------------------------│
│  Start Infrastructure           │  ← Just Docker
│  Start Backend                  │  ← Just backend
│  Start Frontend                 │  ← Just frontend
│  Stop Infrastructure            │  ← Stop Docker
│  Test Connections               │  ← Test DB/Redis
│  Backup Database                │  ← Backup now
│  View Docker Logs               │  ← Watch logs
│  Backend: Run Tests             │  ← Run tests
└─────────────────────────────────┘

TIP: "Start All Services" does everything automatically!
```

---

## Debugging Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     DEBUGGING WORKFLOW                       │
└─────────────────────────────────────────────────────────────┘

OPTION 1: Debug Backend
─────────────────────────
1. Open backend file in VSCode
2. Set breakpoints (click left of line numbers)
3. Press F5
4. Select "Debug Backend"
5. Make API request
6. Debugger stops at breakpoint
7. Inspect variables, step through code

OPTION 2: Debug Frontend
─────────────────────────
1. Open browser DevTools (F12)
2. Set breakpoints in Sources tab
3. Interact with UI
4. Debug in browser

OPTION 3: Debug Full Stack
───────────────────────────
1. Press F5
2. Select "Debug Full Stack"
3. Debugs both backend and frontend
4. Set breakpoints in both
5. Step through entire flow

OPTION 4: Attach to Running Backend
────────────────────────────────────
1. Start backend with: npm run dev
2. Press F5
3. Select "Attach to Backend"
4. Debugger attaches to running process
```

---

## Troubleshooting Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│                   TROUBLESHOOTING FLOW                       │
└─────────────────────────────────────────────────────────────┘

Problem?
  │
  ├─► Docker won't start
  │     │
  │     ├─► Is Docker Desktop installed?
  │     │   └─► NO → Install Docker Desktop
  │     │   └─► YES → Continue
  │     │
  │     ├─► Is Docker Desktop running?
  │     │   └─► NO → Start from Start Menu
  │     │   └─► YES → Continue
  │     │
  │     └─► Run: docker info
  │         ├─► ERROR → Restart Docker Desktop
  │         └─► OK → Continue
  │
  ├─► Containers won't start
  │     │
  │     ├─► Port conflict?
  │     │   └─► Run: netstat -ano | findstr :5432
  │     │   └─► Kill process or change port
  │     │
  │     ├─► Check logs
  │     │   └─► docker-compose logs
  │     │   └─► Fix error shown
  │     │
  │     └─► Full reset
  │         └─► docker-compose down -v
  │         └─► docker-compose up -d
  │
  ├─► Can't connect to database
  │     │
  │     ├─► Is container running?
  │     │   └─► docker ps | findstr postgres
  │     │   └─► If not, start it
  │     │
  │     ├─► Check connection settings
  │     │   └─► Verify .env.local
  │     │   └─► DATABASE_HOST=localhost
  │     │   └─► DATABASE_PORT=5432
  │     │
  │     └─► Test directly
  │         └─► .\scripts\test-connections.ps1
  │         └─► See specific error
  │
  ├─► Backend won't start
  │     │
  │     ├─► Dependencies installed?
  │     │   └─► cd backend
  │     │   └─► npm install
  │     │
  │     ├─► Environment variables?
  │     │   └─► Check .env.local exists
  │     │   └─► Check it's loaded in code
  │     │
  │     └─► Port in use?
  │         └─► netstat -ano | findstr :3000
  │         └─► Kill process or change port
  │
  └─► Frontend won't start
        │
        ├─► Dependencies installed?
        │   └─► cd client
        │   └─► npm install
        │
        └─► Port in use?
            └─► netstat -ano | findstr :5173
            └─► Kill process or change port
```

---

## Quick Commands Reference

```
┌─────────────────────────────────────────────────────────────┐
│                   QUICK COMMANDS CHEAT SHEET                 │
└─────────────────────────────────────────────────────────────┘

DOCKER
──────
docker info                              # Check Docker is running
docker ps                                # List running containers
docker-compose ps                        # List project containers
docker-compose up -d                     # Start all services
docker-compose down                      # Stop all services
docker-compose logs -f [service]         # View logs
docker-compose restart [service]         # Restart a service
docker stats                             # Resource usage

DATABASE
────────
docker exec -it eventstorm-postgres \
  psql -U eventstorm_user -d eventstorm_db    # PostgreSQL CLI
  
docker exec -it eventstorm-postgres \
  psql -U eventstorm_user -d eventstorm_db \
  -c "\dt"                               # List tables

REDIS
─────
docker exec -it eventstorm-redis redis-cli       # Redis CLI
docker exec -it eventstorm-redis redis-cli ping  # Test Redis
docker exec -it eventstorm-redis redis-cli keys '*'  # List keys

SCRIPTS
───────
.\start-dev.ps1                          # Start infrastructure
.\stop-dev.ps1                           # Stop infrastructure
.\scripts\test-connections.ps1           # Test connections
.\scripts\backup-db.ps1                  # Backup database
.\scripts\restore-db.ps1 -InputFile x.sql    # Restore database

DEVELOPMENT
───────────
cd backend; npm run dev                  # Start backend
cd client; npm run dev                   # Start frontend
npm test                                 # Run tests
npm install                              # Install dependencies

VSCODE
──────
Ctrl+Shift+P → Tasks: Run Task           # Run tasks
F5                                       # Start debugging
Ctrl+Shift+`                            # New terminal
Ctrl+C                                   # Stop process
```

---

## Success Indicators

```
┌─────────────────────────────────────────────────────────────┐
│              HOW TO KNOW EVERYTHING IS WORKING               │
└─────────────────────────────────────────────────────────────┘

✅ DOCKER
   • docker ps shows 4 containers running
   • All containers have "Up" status
   • Health checks show "healthy"

✅ DATABASE
   • .\scripts\test-connections.ps1 passes
   • pgAdmin loads at http://localhost:8080
   • Can connect and see tables

✅ REDIS
   • .\scripts\test-connections.ps1 passes
   • Redis Commander loads at http://localhost:8081
   • PING returns PONG

✅ BACKEND
   • Starts without errors
   • Shows "Server listening on :3000"
   • Responds to http://localhost:3000

✅ FRONTEND
   • Starts without errors
   • Shows "Local: http://localhost:5173"
   • Page loads in browser
   • Can make API calls to backend

✅ OVERALL
   • No error messages in any terminal
   • Hot reload works on file save
   • Can debug with breakpoints
   • Changes reflect immediately
```

---

## Timeline Reference

```
┌─────────────────────────────────────────────────────────────┐
│                    TYPICAL DAY TIMELINE                      │
└─────────────────────────────────────────────────────────────┘

08:00 AM  │ Start Docker Desktop (30 seconds)
08:01 AM  │ Run .\start-dev.ps1 (1 minute)
08:02 AM  │ Verify connections (30 seconds)
08:03 AM  │ Start backend (1 minute)
08:04 AM  │ Start frontend (1 minute)
08:05 AM  │ Ready to code! ✓
          │
          │ [CODING HAPPENS HERE - 8 hours] 🚀
          │
05:00 PM  │ Stop backend/frontend (10 seconds)
05:01 PM  │ Backup database (optional) (1 minute)
05:02 PM  │ Run .\stop-dev.ps1 (30 seconds)
05:03 PM  │ Done for the day! ✓

TOTAL STARTUP TIME: ~5 minutes
TOTAL SHUTDOWN TIME: ~2 minutes
```

---

## Summary

This workflow gives you:
- ✅ Fast startup (~5 minutes)
- ✅ Hot reload for instant feedback
- ✅ Easy debugging in VSCode
- ✅ Database management tools
- ✅ Automated scripts
- ✅ Clean shutdown process
- ✅ Data persistence
- ✅ Cost-free development (except API calls)

**You're all set! Happy coding! 🎉**
