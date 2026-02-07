# Repository Indexing Debugging - Root Cause Analysis

## Issue Summary
Repository indexing was failing with 0 chunks stored despite successful deployment and valid GitHub token.

## Investigation Timeline

### 1. Initial Symptoms
- ✅ Backend restarted with renewed GitHub token
- ✅ Query pipeline working correctly
- ❌ Vector search returning 0 matches
- ❌ Full-text search returning 0 results  
- ✅ repoPushed events being published from GitHub Actions

### 2. Root Cause Investigation

#### Event Flow Architecture
```
GitHub Actions (deploy.yml)
  ↓ publishes to Pub/Sub
git-topic (Pub/Sub)
  ↓ received by
gitPubsubListener.js
  ↓ forwards to
eventBus (in-memory EventEmitter)
  ↓ listened by
aiPubsubListener.js
  ↓ calls
aiController.processPushedRepo()
  ↓ delegates to
aiService.processPushedRepo()
  ↓ delegates to
aiLangchainAdapter.processPushedRepo()
  ↓ delegates to
contextPipeline.processPushedRepo()
  ↓ processes and stores
Pinecone + PostgreSQL
```

#### Payload Structure From GitHub Actions
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
      "commitHash": "<sha>",
      "description": "VibeSwitch repository - automatic RAG reindexing via GitHub Actions",
      "timestamp": "<iso-timestamp>",
      "source": "github-actions-deployment"
    }
  }
}
```

#### Expected by contextPipeline.js (line 437)
```javascript
if (!repoData?.url || !repoData?.branch) {
  // FAIL: Invalid repository data
}
```

### 3. Potential Bug Locations

#### Location 1: gitPubsubListener.js (line 135)
**Status:** ✅ Forwarding correctly
- Forwards complete `data` object with payload wrapper
- Structure matches deploy.yml output

#### Location 2: aiPubsubListener.js (lines 93-94)
**Status:** ✅ Handles both formats
```javascript
const eventData = data.payload ? data.payload : data;
const { userId, repoId, repoData } = eventData;
```
- Correctly unwraps payload
- Extracts userId, repoId, and repoData

#### Location 3: Data Flow Verification Needed
**Status:** 🔍 DEBUGGING IN PROGRESS
- Added detailed logging in gitPubsubListener.js
- Added detailed logging in aiPubsubListener.js
- Next deployment will show exact data structure at each step

### 4. Debugging Strategy

#### Added Logging Points:
1. **gitPubsubListener.js** (before forwarding to eventBus):
   ```javascript
   fastify.log.info(`📦 GIT MODULE: Event payload structure: ${JSON.stringify(data, null, 2)}`);
   fastify.log.info(`✅ GIT MODULE: repoData has url=${!!repoData.url} branch=${!!repoData.branch}`);
   ```

2. **aiPubsubListener.js** (after receiving from eventBus):
   ```javascript
   fastify.log.info(`🔍 AI MODULE DEBUG: repoData structure: ${JSON.stringify(repoData, null, 2)}`);
   fastify.log.info(`🔍 AI MODULE DEBUG: repoData.url=${repoData.url}`);
   fastify.log.info(`🔍 AI MODULE DEBUG: repoData.branch=${repoData.branch}`);
   ```

### 5. Next Steps

#### After Next Deployment (commit aecbef8):
1. Monitor Cloud Run logs for detailed payload structure
2. Verify repoData contains all required fields at each step
3. Check for any data transformation/loss between steps
4. If repoData is correct but processing still fails, investigate:
   - GitHub API authentication (token scopes)
   - File loading in repoProcessor.js
   - Document processing in contextPipeline.processSmallRepo()

#### Expected Log Output (Success):
```
📦 GIT MODULE: Event payload structure: {
  "event": "repoPushed",
  "payload": {
    "userId": "d41402df-182a-41ec-8f05-153118bf2718",
    "repoId": "anatolyZader/vc-3",
    "repoData": { ... }
  }
}
✅ GIT MODULE: repoData has url=true branch=true githubOwner=true repoName=true
✅ GIT MODULE: repoPushed event forwarded to eventBus successfully
🔍 AI MODULE DEBUG: repoData structure: { "url": "...", "branch": "main", ... }
🔍 AI MODULE DEBUG: repoData.url=https://github.com/anatolyZader/vc-3
🔍 AI MODULE DEBUG: repoData.branch=main
📥 DATA-PREP: Extracted GitHub owner: anatolyZader, repo name: vc-3
🔵 STANDARD PROCESSING: Using Langchain-first approach for repository
```

#### Expected Log Output (Failure - if bug exists):
```
⚠️ GIT MODULE: repoData is missing in payload!
OR
🔍 AI MODULE DEBUG: repoData.url=undefined
🔍 AI MODULE DEBUG: repoData.branch=undefined
⚠️ DATA-PREP: Invalid repository data: missing url or branch
```

## Files Modified
- `backend/business_modules/git/input/gitPubsubListener.js` - Added payload structure logging
- `backend/business_modules/ai/input/aiPubsubListener.js` - Added repoData field validation logging

## Deployment Status
- Commit: `aecbef8` - "debug: add detailed logging for repoPushed event data flow from Pub/Sub to contextPipeline"
- Pushed to: `origin/main`
- GitHub Actions: Will trigger automatically
- Expected indexing: After deployment completes (~5-10 minutes)

## Theory
The most likely issue is either:
1. **GitHub token scope** - Token doesn't have `repo` access for private repositories
2. **Data transformation** - Something between Pub/Sub and contextPipeline is modifying the payload
3. **Silent failure** - Error is caught and logged but not surfaced

The detailed logging will reveal which of these is the actual cause.

## Follow-up Actions
1. ⏳ Wait for GitHub Actions deployment (~5-10 min)
2. 📊 Monitor logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vibeswitch-backend" --limit=50 --format=json --freshness=10m | grep -E "GIT MODULE|AI MODULE DEBUG|DATA-PREP"`
3. ✅ If repoData is correct: Issue is in file loading (GitHub API)
4. ❌ If repoData is missing fields: Issue is in event forwarding/parsing
5. 🔧 Apply appropriate fix based on findings
