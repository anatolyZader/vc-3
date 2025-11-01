# Repository Indexing Architecture

## Overview

EventStorm uses a **dual-path architecture** for triggering repository indexing in the AI module's RAG (Retrieval-Augmented Generation) system. Both paths are independent and can work in parallel or separately.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIGGER SOURCES                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PATH 1: GitHub Actions (Primary - Automatic)              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  Git Push → deploy.yml → Publish Event → AI Module         │
│                                                             │
│  PATH 2: Manual API (Fallback - On-Demand)                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │
│  User API Call → Git Module → Publish Event → AI Module    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Google Cloud Pub/Sub (git-topic)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    AI Module Processing                     │
├─────────────────────────────────────────────────────────────┤
│  1. Receive repoPushed event (git-sub subscription)        │
│  2. Clone repository from GitHub                            │
│  3. Split code into chunks (AST + Semantic)                 │
│  4. Generate embeddings (OpenAI)                            │
│  5. Store vectors in Pinecone                               │
│  6. Store metadata in PostgreSQL (FTS)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Path 1: GitHub Actions (Primary Method)

### When It Runs
- **Automatically** on every push to `main` branch
- After successful deployment to Cloud Run
- Part of the CI/CD pipeline

### Location
- `.github/workflows/deploy.yml` (lines 438-472)

### How It Works
```yaml
- name: Publish repoPushed event for RAG reindexing
  run: |
    gcloud pubsub topics publish git-topic \
      --message='{
        "event": "repoPushed",
        "payload": {
          "userId": "d41402df-182a-41ec-8f05-153118bf2718",
          "repoId": "${{ github.repository }}",
          "repoData": {
            "url": "https://github.com/${{ github.repository }}",
            "branch": "${{ github.ref_name }}",
            "githubOwner": "${{ github.repository_owner }}",
            "repoName": "${{ github.event.repository.name }}",
            "commitHash": "${{ github.sha }}"
          }
        }
      }'
```

### Advantages
✅ **Fastest**: Direct event publishing, no API roundtrips  
✅ **Most reliable**: GitHub Actions is the source of truth  
✅ **Automatic**: No manual intervention required  
✅ **Always current**: Triggered on every deployment  

---

## Path 2: Git Module API (Fallback Method)

### When It Runs
- **Manual** user API calls to persist repository
- On-demand indexing requests
- Re-indexing existing repositories

### Endpoint
```
POST /api/git/repositories/:owner/:repo/persist
```

### How It Works
1. User calls Git API with repository details
2. Git module fetches metadata from GitHub
3. Stores metadata in PostgreSQL (repositories table)
4. Publishes `repoPushed` event to Pub/Sub
5. AI module receives event and indexes repository

### Implementation
- **File**: `backend/business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter.js`
- **Method**: `publishRepoPersistedEvent()`

### Advantages
✅ **Manual control**: User can trigger re-indexing anytime  
✅ **Works offline**: Can index without pushing code  
✅ **Flexible**: Can index any branch or commit  
✅ **Independent**: Doesn't require GitHub Actions  

---

## Event Payload Format

Both paths use the **same payload structure** to ensure consistency:

```javascript
{
  "event": "repoPushed",
  "eventType": "repoPushed",
  "userId": "d41402df-182a-41ec-8f05-153118bf2718",
  "repoId": "owner/repo-name",
  "repoData": {
    // REQUIRED: AI module validates these fields
    "url": "https://github.com/owner/repo-name",
    "branch": "main",
    "githubOwner": "owner",
    "repoName": "repo-name",
    
    // OPTIONAL: Additional metadata
    "commitHash": "abc123...",
    "description": "Repository description",
    "language": "JavaScript",
    "source": "github-actions" | "git-module-api"
  },
  "timestamp": "2025-11-01T12:00:00.000Z",
  "correlationId": "deploy-123456"
}
```

### Required Fields
The AI module's **ContextPipeline** validates these fields (lines 431-466 in `contextPipeline.js`):
- ✅ `repoData.url` - GitHub repository URL
- ✅ `repoData.branch` - Git branch to index
- ✅ `repoData.githubOwner` - Repository owner
- ✅ `repoData.repoName` - Repository name

**If validation fails**, the AI module returns early with `mode: 'validation_failed'` and no indexing occurs.

---

## AI Module Processing Pipeline

### Entry Point
- **File**: `backend/business_modules/ai/input/aiPubsubListener.js`
- **Handler**: EventBus listener for `repoPushed` event (lines 84-200)

### Processing Flow
1. **Validation**: Check userId, repoId, repoData structure
2. **Text Search Init**: Initialize PostgreSQL full-text search
3. **Controller Call**: `fastify.processPushedRepo()`
4. **Service Layer**: `aiService.processPushedRepo()`
5. **Domain Entity**: `PushedRepo.processPushedRepo()`
6. **Infrastructure**: `aiLangchainAdapter.processPushedRepo()`
7. **Core Pipeline**: `contextPipeline.processPushedRepo()`

### ContextPipeline Operations
**File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js`

1. **Validation** (lines 431-466)
   - Verify repoData structure
   - Parse GitHub URL

2. **Smart Decision** (lines 467-520)
   - Get commit info from GitHub
   - Check if already indexed
   - Decide: skip, incremental, or full processing

3. **Repository Processing** (lines 521+)
   - Clone repository from GitHub
   - Load and filter files
   - Split code using AST splitter
   - Split docs using semantic splitter
   - Enhance with ubiquitous language
   - Generate embeddings (OpenAI)
   - Store vectors in Pinecone
   - Store metadata in PostgreSQL

4. **Result**
   ```javascript
   {
     success: true,
     mode: 'full' | 'incremental' | 'skipped',
     chunksStored: 150,
     commitHash: 'abc123...',
     repoId: 'owner/repo',
     userId: 'user-id',
     timestamp: '2025-11-01T...'
   }
   ```

---

## Storage Layers

### Git Module Storage (Metadata Only)
- **What**: Repository metadata from GitHub API
- **Where**: PostgreSQL `repositories` table
- **When**: Git API persist endpoint called
- **Data**: 
  - Repository info (name, description, stars, etc.)
  - Branch info (commit SHA, ref)
  - File tree structure

### AI Module Storage (Code Chunks + Vectors)
- **What**: Processed code chunks with embeddings
- **Where**: 
  - **Pinecone**: Vector embeddings for semantic search
  - **PostgreSQL** `code_chunks`: Full-text search metadata
- **When**: After `repoPushed` event processed
- **Data**:
  - Code chunks with source location
  - Vector embeddings (1536 dimensions)
  - Text search tokens
  - Metadata (language, file type, etc.)

**These are completely independent!**

---

## Use Cases

### Automatic Indexing (Production)
**Use Path 1**: GitHub Actions
- ✅ Every deployment automatically indexes
- ✅ Always up-to-date with latest code
- ✅ No manual intervention required

### Manual Re-indexing
**Use Path 2**: Git API
```bash
curl -X POST https://api.eventstorm.app/api/git/repositories/owner/repo/persist \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"branch": "main", "forceUpdate": true}'
```

### Indexing Different Branch
**Use Path 2**: Git API
```bash
curl -X POST https://api.eventstorm.app/api/git/repositories/owner/repo/persist \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"branch": "feature-branch"}'
```

### Troubleshooting Failed Index
**Use Path 2**: Git API with force update
```bash
curl -X POST https://api.eventstorm.app/api/git/repositories/owner/repo/persist \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"branch": "main", "forceUpdate": true}'
```

---

## Monitoring & Debugging

### Check If Event Published (GitHub Actions)
```yaml
# In deploy.yml, the publish step logs:
📤 Publishing repoPushed to git-topic...
```

### Check If Event Received (AI Module)
```javascript
// In backend logs:
📊 AI MODULE: Event payload: {...}
📋 AI MODULE: Processing repository: owner/repo for user d41402df...
```

### Check Processing Result
```javascript
// Success:
✅ AI MODULE: Repository owner/repo processed successfully with 150 chunks stored

// Validation failure:
⚠️ DATA-PREP: Invalid repository data: missing url or branch
```

### Query Pinecone
```bash
# Check if vectors exist
curl -X POST https://api.pinecone.io/query \
  -H "Api-Key: $PINECONE_API_KEY" \
  -d '{"namespace": "userId_repoId", "topK": 1}'
```

---

## Best Practices

### ✅ DO
- Let GitHub Actions handle automatic indexing (Path 1)
- Use Git API for manual re-indexing (Path 2)
- Keep event payload format consistent between both paths
- Monitor logs for validation failures
- Use correlation IDs for tracking

### ❌ DON'T
- Don't rely solely on Git API for production indexing
- Don't modify event payload structure without updating both paths
- Don't skip validation in AI module
- Don't assume indexing succeeded without checking logs

---

## Future Improvements

### Potential Enhancements
1. **Webhook Support**: Direct GitHub webhooks → Pub/Sub (skip Actions)
2. **Batch Processing**: Index multiple repositories in one event
3. **Selective Indexing**: Only index specific directories/files
4. **Delta Updates**: Only reprocess changed files
5. **Status API**: Query indexing progress/status

---

## Related Files

### GitHub Actions
- `.github/workflows/deploy.yml` - Main deployment workflow
- `.github/scripts/publish-index-event.js` - Script helper (optional)

### Git Module
- `backend/business_modules/git/infrastructure/messaging/pubsub/gitPubsubAdapter.js`
- `backend/business_modules/git/application/services/gitService.js`
- `backend/business_modules/git/domain/events/repoPersistedEvent.js`

### AI Module
- `backend/business_modules/ai/input/aiPubsubListener.js`
- `backend/business_modules/ai/application/aiController.js`
- `backend/business_modules/ai/application/services/aiService.js`
- `backend/business_modules/ai/infrastructure/ai/aiLangchainAdapter.js`
- `backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js`

---

## Conclusion

The **dual-path architecture** provides:
- ✅ **Reliability**: Multiple ways to trigger indexing
- ✅ **Flexibility**: Automatic + manual control
- ✅ **Independence**: Paths work separately or together
- ✅ **Consistency**: Same event format from both sources
- ✅ **Resilience**: Fallback if one path fails

**Primary method**: GitHub Actions (automatic)  
**Fallback method**: Git API (manual)  
**Both work**: Independently and in parallel  
