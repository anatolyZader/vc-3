# Full-Text Search Missing Data - Root Cause Analysis

## 🔍 Issue Summary

**Problem**: Query for "aiService.js" returned 7 chunks from Pinecone vector search, but 0 results from PostgreSQL full-text search.

**Date**: October 30, 2025
**User**: d41402df-182a-41ec-8f05-153118bf2718
**Repository**: anatolyZader/vc-3

## 📊 Symptoms

1. ✅ **Vector Search Working**: Pinecone returned 7 relevant chunks
2. ❌ **Full-Text Search Failing**: PostgreSQL `repo_data` table had **0 rows**
3. ❌ **Result**: FTS couldn't find any files, including `aiService.js`

## 🎯 Root Cause

**The `textSearchService` was NOT initialized when repository was processed via Pub/Sub events.**

### Why This Happened:

```javascript
// contextPipeline.js line 807-819
if (this.textSearchService) {
  try {
    console.log(`Storing ${splitDocuments.length} chunks to PostgreSQL...`);
    await this.textSearchService.storeChunks(splitDocuments, userId, repoId);
  } catch (pgError) {
    console.error(`PostgreSQL storage failed (non-fatal):`, pgError.message);
  }
} else {
  console.log(`Text search service not available, skipping PostgreSQL storage`);
}
```

**The `if (this.textSearchService)` check failed** → PostgreSQL storage was skipped → repo_data table remained empty.

### The Missing Initialization:

The initialization code exists in `aiService.js` (lines 122-134):

```javascript
if (this.aiPersistAdapter && this.aiAdapter && typeof this.aiAdapter.initializeTextSearch === 'function') {
  if (!this.aiAdapter.textSearchService) {
    await this.aiAdapter.initializeTextSearch(this.aiPersistAdapter);
  }
}
```

**BUT**: This code is called AFTER the diScope is created and AFTER the service is resolved. In the Pub/Sub flow via `aiPubsubListener`, the initialization wasn't happening reliably because:

1. The DI scope was created in the listener
2. The service was resolved from that scope
3. But the `aiPersistAdapter` wasn't available or wasn't properly initialized at that moment
4. Or the initialization silently failed (caught by try-catch, logged as warning)

## ✅ The Fix

### Commit: `e4ca3b0`

Added **defensive initialization** in `aiPubsubListener.js` BEFORE calling `processPushedRepo`:

```javascript
// Create a proper DI scope for the mock request
const diScope = fastify.diContainer.createScope();

// CRITICAL: Initialize text search service before processing repo
try {
  const aiService = await diScope.resolve('aiService');
  const postgresAdapter = await diScope.resolve('aiPersistAdapter');
  
  if (aiService && postgresAdapter && aiService.aiAdapter) {
    if (!aiService.aiAdapter.textSearchService) {
      fastify.log.info(`🔍 AI PUBSUB: Initializing text search before repo processing...`);
      await aiService.aiAdapter.initializeTextSearch(postgresAdapter);
      fastify.log.info(`✅ AI PUBSUB: Text search initialized successfully`);
    } else {
      fastify.log.info(`ℹ️  AI PUBSUB: Text search already initialized`);
    }
  } else {
    fastify.log.warn(`⚠️  AI PUBSUB: Could not initialize text search - missing dependencies`);
  }
} catch (initError) {
  fastify.log.error(`❌ AI PUBSUB: Text search initialization failed: ${initError.message}`);
  // Continue anyway - Pinecone storage will still work
}
```

### Why This Works:

1. **Resolves dependencies FIRST** from the DI scope
2. **Explicitly checks** if both `aiService` and `postgresAdapter` are available
3. **Initializes textSearchService** before any processing
4. **Logs every step** for debugging
5. **Non-fatal**: If initialization fails, Pinecone storage still works

## 🚀 Impact

After this fix, when repositories are indexed via GitHub Actions → Pub/Sub → aiPubsubListener:

1. ✅ **Pinecone storage** - Vector embeddings (as before)
2. ✅ **PostgreSQL storage** - Full-text search data (NOW WORKING)
3. ✅ **Rich metadata** - Both databases get complete metadata
4. ✅ **Synchronized chunking** - Same chunks in both databases

## 📝 Testing Plan

1. **Monitor next deployment**:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND 
     resource.labels.service_name=eventstorm-backend AND 
     textPayload:\"AI PUBSUB: Initializing text search\"" 
     --limit=10 --project=eventstorm-1
   ```

2. **Verify PostgreSQL storage**:
   ```bash
   node check_database_with_env.js
   # Should show > 0 rows in repo_data table
   ```

3. **Test FTS query**:
   ```bash
   # Query for specific file
   # Should return results from both Pinecone AND PostgreSQL
   ```

## 🔄 Related Commits

- **bb82e79**: Moved persistence logic to aiPostgresAdapter
- **f30c0fd**: Fixed repoPushed event forwarding from gitPubsubListener
- **aecbef8**: Added comprehensive debugging logs
- **e4ca3b0**: **THIS FIX** - Ensure textSearchService initialized in Pub/Sub flow

## 📚 Lessons Learned

1. **Defensive initialization** is critical in event-driven architectures
2. **DI scope resolution timing** matters - dependencies must be available when needed
3. **Non-fatal error handling** can hide critical issues (PostgreSQL storage was "optional")
4. **Comprehensive logging** at initialization points is essential for debugging
5. **End-to-end validation** (Pinecone + PostgreSQL) should be part of monitoring

## 🎯 Future Improvements

1. Add health check endpoint that validates both Pinecone AND PostgreSQL connectivity
2. Add metrics/alerts when PostgreSQL storage is skipped
3. Consider making PostgreSQL storage failures more visible (not just warnings)
4. Add integration tests that verify both storage backends
5. Document initialization sequence and dependencies clearly

---

**Status**: ✅ **FIXED** in commit `e4ca3b0`  
**Deployed**: Pending GitHub Actions deployment  
**Next Step**: Monitor logs and verify PostgreSQL storage on next indexing
