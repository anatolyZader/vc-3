# RAG Pipeline Audit: Push to Dev → Vector Storage

## Overview
Complete flow trace from GitHub Actions push to pgvector storage.

## ✅ CORRECT Flow

### 1. GitHub Workflow → CI Endpoint
**File**: `.github/workflows/local-deploy.yml` (lines 379-441)

Payload sent:
```json
{
  "repoId": "anatolyZader/vc-3",
  "repoData": {
    "url": "https://github.com/anatolyZader/vc-3",
    "branch": "dev",
    "commitHash": "abc123...",
    "githubOwner": "anatolyZader",
    "repoName": "vc-3",
    "description": "...",
    "timestamp": "...",
    "source": "github-actions-local-deploy"
  }
}
```

✅ **Correct**: All required fields are present

### 2. CI Endpoint → AI Service
**File**: `backend/business_modules/ai/input/aiRouter.js` (lines 137-202)

- Sets userId: `'github-actions-ci'` (mock user for CI)
- Passes `repoId` and `repoData` to `aiService.processPushedRepo()`

✅ **Correct**: Proper data flow

### 3. AI Service → Domain Entity → AI Adapter
**Files**: 
- `backend/business_modules/ai/application/services/aiService.js` (lines 121-179)
- `backend/business_modules/ai/domain/entities/pushedRepo.js`
- `backend/business_modules/ai/infrastructure/ai/aiLangchainAdapter.js` (lines 354-408)

✅ **Correct**: Clean domain-driven flow

### 4. Context Pipeline Processing
**File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js`

Line 476: Parses URL to extract `githubOwner` and `repoName`
```javascript
const { githubOwner, repoName } = ContextPipelineUtils.parseRepositoryUrl(url);
```

Lines 548 or 632/648: Calls either `processFullRepo()` or splits to:
- `processRepoWithWorkers()` (large repos)
- `processSmallRepo()` (small repos)

✅ **Correct**: Proper parameter extraction and routing

### 5. Vector Storage - Small Repos
**File**: `contextPipeline.js` `processSmallRepo()` (lines 781-868)

Line 848: **CRITICAL** - Generates repository-based collection:
```javascript
const namespace = CollectionNameGenerator.generateForRepository({ repoId, githubOwner, repoName });
```

Line 849: Stores with correct namespace:
```javascript
await this.embeddingManager.storeToPinecone(splitDocuments, namespace, githubOwner, repoName);
```

✅ **Correct**: Uses repository collection (e.g., `repo_anatolyzader_vc-3`)

### 6. Vector Storage - Large Repos  
**File**: `contextPipeline.js` `processRepoWithWorkers()` (lines 668-776)

Line 715: **CRITICAL** - Uses same collection generation:
```javascript
const namespace = CollectionNameGenerator.generateForRepository({ repoId, githubOwner, repoName });
```

✅ **Correct**: Consistent collection naming

### 7. Embedding Manager → PGVector Service
**File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/embeddingManager.js`

Method flow:
```
storeToPinecone() (line 234)
  ↓ (redirects to)
storeToVectorDB() (line 45)
  ↓
vectorService.upsertDocuments() (line 142) with namespace parameter
```

Line 143: Passes namespace to vector service:
```javascript
await vectorService.upsertDocuments(safeDocuments, this.embeddings, {
  namespace: namespace,  // Repository collection passed through
  ids: documentIds,
  githubOwner,
  repoName,
  verbose: true
});
```

✅ **Correct**: Namespace preserved through all layers

### 8. PGVector Service Final Storage
**File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pgVectorService.js`

Line 174: Uses namespace as collection:
```javascript
const collectionName = namespace || 'default';
const vectorStore = await this.createVectorStore(embeddings, collectionName);
```

✅ **Correct**: Stores in repository collection in PostgreSQL

## 🔍 BUGS FOUND

### Bug #1: Dead Code - storeRepositoryDocuments() ❌
**File**: `embeddingManager.js` (lines 176-223)

**Issue**: Method `storeRepositoryDocuments()` is never called anywhere in the codebase. It's dead code.

**Impact**: No impact - it's unused

**Recommendation**: Remove the method or update it if it will be used in future

---

### Bug #2: Query Pipeline Collection Mismatch ✅ FIXED
**File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline.js`

**Issue**: Was using user-specific collection for queries:
```javascript
// OLD - WRONG:
const repositoryNamespace = CollectionNameGenerator.generateForUser(userId, { repoId: 'default' });
// Results in: user_6410d591_6221_4f01_a738_0a29a7906ef1_repo_default
```

**Fix Applied**: Now uses repository collection:
```javascript
// NEW - CORRECT:
const defaultRepo = process.env.DEFAULT_REPO_ID || 'anatolyZader/vc-3';
const repositoryNamespace = CollectionNameGenerator.generateForRepository({ repoId: defaultRepo });
// Results in: repo_anatolyzader_vc-3
```

**Status**: ✅ Fixed in this session

**Lines Fixed**:
- Line 182: `getVectorStore()` method
- Line 666: `performVectorSearch()` method

---

## ✅ VERIFICATION CHECKLIST

- [x] Workflow sends correct repoData structure
- [x] CI endpoint extracts repoId and repoData  
- [x] githubOwner and repoName extracted from URL
- [x] Repository collection name generated consistently
- [x] Collection name passed through all storage layers
- [x] PGVector uses collection name correctly
- [x] Query pipeline uses SAME collection name

## 📊 Collection Name Flow

```
Indexing:  repo_anatolyzader_vc-3  ← Generated from repoId
                ↓
           [pgvector storage]
                ↓
Querying:  repo_anatolyzader_vc-3  ← Must match!
```

## 🎯 RECOMMENDATION

### Immediate Action
1. ✅ **DONE**: Fix query pipeline to use repository collection
2. **TODO**: Test the full flow:
   - Push to dev
   - Verify indexing logs show correct collection
   - Query in chat
   - Verify query logs show same collection
   - Confirm chunks are retrieved

### Future Improvements
1. **Remove dead code**: Delete `storeRepositoryDocuments()` method
2. **Add validation**: Assert collection name matches between indexing and querying
3. **Add logging**: Log collection names at every step for debugging
4. **Environment variable**: Make `DEFAULT_REPO_ID` configurable per deployment

## 🚀 Ready to Test

The pipeline is now corrected! Next step:
1. Commit the fixes
2. Push to dev
3. Watch the workflow trigger indexing
4. Test chat queries to verify code context is retrieved


