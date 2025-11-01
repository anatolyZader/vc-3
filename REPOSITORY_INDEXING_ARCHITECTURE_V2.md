# Repository Indexing Architecture (Single-Path)

## Overview

EventStorm uses a **single-path architecture** for automatic repository indexing. When code is pushed to GitHub, it flows through the Git Module to the AI Module for RAG (Retrieval-Augmented Generation) indexing.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EVENT FLOW                                   │
└─────────────────────────────────────────────────────────────────────┘

1. GitHub Push → GitHub Actions (deploy.yml)
                      ↓
2. Publish persistRepoRequest → git-topic (Pub/Sub)
                      ↓
3. Git Module (git-module-sub) receives event
                      ↓
4. Fetch from GitHub API → Persist to PostgreSQL
                      ↓
5. Publish repoPushed → git-topic (Pub/Sub)
                      ↓
6. AI Module (git-sub) receives event
                      ↓
7. RAG Pipeline: Load → Chunk → Embed → Store (Pinecone + PostgreSQL)
                      ↓
8. ✅ Chat has code access
```

---

## Component Details

### 1. GitHub Actions (`.github/workflows/deploy.yml`)

**What it does:**
- Builds and deploys backend to Cloud Run
- Publishes `persistRepoRequest` event to `git-topic`

**Event Payload:**
```json
{
  "event": "persistRepoRequest",
  "payload": {
    "userId": "d41402df-182a-41ec-8f05-153118bf2718",
    "repoId": "anatolyZader/vc-3",
    "correlationId": "deploy-123456",
    "branch": "main",
    "forceUpdate": true,
    "includeHistory": true
  }
}
```

### 2. Git Module (Subscription: `git-module-sub`)

**Location:** `backend/business_modules/git/input/gitPubsubListener.js`

**What it does:**
1. Listens for `persistRepoRequest` events
2. Fetches repository data from GitHub API
3. Persists to PostgreSQL database
4. Publishes `repoPushed` event

**Key Files:**
- `gitPubsubListener.js` - Pub/Sub event handler
- `gitService.js` - Business logic (persistRepo method)
- `gitPubsubAdapter.js` - Event publisher (publishRepoPersistedEvent method)

**Published Event:**
```json
{
  "event": "repoPushed",
  "payload": {
    "userId": "d41402df-182a-41ec-8f05-153118bf2718",
    "repoId": "anatolyZader/vc-3",
    "repoData": {
      "url": "https://github.com/anatolyZader/vc-3",
      "branch": "main",
      "githubOwner": "anatolyZader",
      "repoName": "vc-3",
      "source": "git-module-api"
    }
  }
}
```

### 3. AI Module (Subscription: `git-sub`)

**Location:** `backend/business_modules/ai/input/aiPubsubListener.js`

**What it does:**
1. Listens for `repoPushed` events from `git-sub` subscription
2. Bridges event to internal EventBus
3. Triggers RAG reindexing pipeline

**Processing Pipeline (ContextPipeline):**
```
1. Clone/Load files from GitHub
2. Split into semantic chunks (AST-aware splitter)
3. Generate embeddings (OpenAI text-embedding-3-small)
4. Store vectors in Pinecone (namespace: userId_owner_repo)
5. Store metadata in PostgreSQL (full-text search)
```

**Key Files:**
- `aiPubsubListener.js` - Receives repoPushed events
- `aiController.js` - Orchestrates RAG pipeline
- `aiService.js` - Business logic (processPushedRepo method)
- `contextPipeline.js` - RAG processing (load, chunk, embed, store)

---

## Pub/Sub Configuration

### Topic
- **Name:** `git-topic`
- **Purpose:** Central message broker for Git/AI inter-module communication
- **Project:** eventstorm-1

### Subscriptions

| Subscription | Module | Purpose | Events Handled |
|---|---|---|---|
| `git-module-sub` | Git Module | Internal operations | `persistRepoRequest`, `fetchRepoRequest`, `fetchDocsRequest` |
| `git-sub` | AI Module | RAG indexing | `repoPushed` |

---

## Event Payload Specifications

### persistRepoRequest (GitHub Actions → Git Module)
```typescript
{
  event: "persistRepoRequest",
  payload: {
    userId: string,              // User UUID
    repoId: string,              // Format: "owner/repo"
    correlationId: string,       // Tracking ID
    branch: string,              // Default: "main"
    forceUpdate: boolean,        // Overwrite existing
    includeHistory: boolean,     // Git history metadata
    metadata?: {
      source: string,
      commitHash: string,
      deploymentRunId: string,
      timestamp: string
    }
  }
}
```

### repoPushed (Git Module → AI Module)
```typescript
{
  event: "repoPushed",
  payload: {
    userId: string,              // User UUID
    repoId: string,              // Format: "owner/repo"
    repoData: {
      url: string,               // REQUIRED: GitHub repo URL
      branch: string,            // REQUIRED: Branch name
      githubOwner: string,       // REQUIRED: Owner name
      repoName: string,          // REQUIRED: Repo name
      description?: string,      // Optional metadata
      defaultBranch?: string,
      language?: string,
      source: string             // "git-module-api"
    }
  }
}
```

**Critical Fields for AI Module:**
- `repoData.url` - Used to clone repository
- `repoData.branch` - Which branch to process
- `repoData.githubOwner` - Part of namespace
- `repoData.repoName` - Part of namespace

---

## Manual Trigger (Fallback)

If automatic indexing fails, you can manually trigger via Git API:

```bash
curl -X POST http://localhost:3000/api/git/repositories/anatolyZader/vc-3/persist \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "branch": "main",
    "forceUpdate": true
  }'
```

This will:
1. Persist repo to database
2. Publish `repoPushed` event
3. Trigger AI Module indexing

---

## Troubleshooting

### Repository Not Indexed After Push

**Check 1: GitHub Actions Published Event**
```bash
# View GitHub Actions logs
# Look for: "📤 Publishing persistRepoRequest to git-topic..."
```

**Check 2: Git Module Received Event**
```bash
# Check Cloud Run logs for Git Module
gcloud logging read "resource.type=cloud_run_revision AND textPayload:persistRepoRequest" \
  --limit=10 --project=eventstorm-1
```

**Check 3: Git Module Published repoPushed**
```bash
# Look for: "✅ Published 'repoPushed' event"
```

**Check 4: AI Module Received Event**
```bash
# Check for: "AI MODULE: Processing repository: owner/repo"
```

**Check 5: Verify Pinecone Storage**
```bash
# Query Pinecone for chunks
# Namespace: userId_owner_repo
# Should show > 0 chunks
```

### Common Issues

**Issue:** No logs from Git Module  
**Cause:** `git-module-sub` subscription doesn't exist  
**Fix:** `gcloud pubsub subscriptions create git-module-sub --topic=git-topic --project=eventstorm-1`

**Issue:** AI Module says "0 chunks found"  
**Cause:** Repository never indexed  
**Fix:** Check Git Module logs for errors, manually trigger via API

**Issue:** Both modules listening to same subscription  
**Cause:** Subscription name conflict  
**Fix:** Git Module uses `git-module-sub`, AI Module uses `git-sub`

---

## Architecture Benefits

✅ **Single Source of Truth:** GitHub Actions always triggers the flow  
✅ **Proper Sequencing:** Git Module persists first, then AI indexes  
✅ **Clear Separation:** Each module has its own subscription  
✅ **Auditability:** Each step logs to Cloud Logging  
✅ **Manual Override:** API fallback if automation fails  

---

## Related Files

### GitHub Actions
- `.github/workflows/deploy.yml` - Main deployment workflow (lines 380-423)

### Git Module
- `backend/business_modules/git/index.js` - Module initialization
- `backend/business_modules/git/input/gitPubsubListener.js` - Pub/Sub listener
- `backend/business_modules/git/application/services/gitService.js` - persistRepo logic
- `backend/business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter.js` - Event publisher
- `backend/business_modules/git/domain/events/repoPersistedEvent.js` - Domain event

### AI Module
- `backend/business_modules/ai/index.js` - Module initialization
- `backend/business_modules/ai/input/aiPubsubListener.js` - Pub/Sub listener
- `backend/business_modules/ai/application/aiController.js` - RAG orchestration
- `backend/business_modules/ai/application/services/aiService.js` - processPushedRepo logic
- `backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js` - RAG processing

---

**Last Updated:** November 1, 2025  
**Architecture Version:** Single-Path v2.0
