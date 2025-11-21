# CRITICAL: Chunking Divergence Fix

## Problem Identified

**User observation**: "Reports claim 'method-level splitting', yet output shows 1 giant chunk (≈30K chars / 6.4k tokens)"

### Root Causes Found:

1. **repoProcessor.js Line 586**: Fallback returns documents AS-IS without chunking
   ```javascript
   allChunks.push(document);  // ❌ 30K char document added whole!
   ```

2. **repoProcessor.js Line 591**: Error handling also bypasses chunking
   ```javascript
   allChunks.push(document); // ❌ If AST fails, add giant chunk
   ```

3. **Result**: Pinecone contains **un-chunked files** (30K chars each) instead of granular method-level chunks

---

## Configuration vs Runtime Divergence

**AST Splitter Config** (contextPipeline.js:56):
```javascript
maxTokens: 500        // ✅ Should create ~2000 char chunks
minTokens: 30
maxUnitsPerChunk: 1   // ✅ One method per chunk
```

**Safety Validator** (embeddingManager.js:53):
```javascript
chunkSize: 8000       // ⚠️ ALLOWS 8000 token chunks!
```

**Actual chunks in Pinecone**:
```
Chunk #0: 29,989 chars (~6,400 tokens)  // ❌ MASSIVE!
```

---

## Required Fixes

### 1. **NEVER return unchunked documents**

**File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessor.js`

**Lines 586-591**: Replace fallback with forced text splitting

```javascript
// BEFORE (BROKEN):
} else {
  console.log(`[${new Date().toISOString()}] 📝 FALLBACK: No processors available, returning document as-is`);
  allChunks.push(document);  // ❌ GIANT CHUNK!
}

// AFTER (FIXED):
} else {
  console.warn(`[${new Date().toISOString()}] ⚠️ FALLBACK: No processors available, applying basic text splitting`);
  const basicChunks = await this.forceBasicTextSplitting(document);
  allChunks.push(...basicChunks);
}
```

**Add method**:
```javascript
/**
 * Force basic text splitting when AST/semantic processors fail
 * CRITICAL: Never index unchunked files!
 */
async forceBasicTextSplitting(document) {
  const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
  
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,      // Safe chunk size
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', '']
  });
  
  const chunks = await splitter.splitDocuments([document]);
  console.log(`[${new Date().toISOString()}] 🔪 FORCED SPLIT: ${document.metadata?.source} → ${chunks.length} chunks`);
  
  return chunks.map((chunk, idx) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      forcedSplit: true,
      subChunkIndex: idx
    }
  }));
}
```

### 2. **Fix error handling** (Line 591)

```javascript
// BEFORE:
catch (error) {
  console.error(`[${new Date().toISOString()}] ❌ FALLBACK ERROR: ${document.metadata?.source}:`, error.message);
  allChunks.push(document); // ❌ GIANT CHUNK!
}

// AFTER:
catch (error) {
  console.error(`[${new Date().toISOString()}] ❌ FALLBACK ERROR: ${document.metadata?.source}:`, error.message);
  console.warn(`[${new Date().toISOString()}] 🔄 Applying forced text splitting due to error`);
  const emergency Chunks = await this.forceBasicTextSplitting(document);
  allChunks.push(...emergencyChunks);
}
```

### 3. **Verify routing function usage**

**File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js`

Check that repoProcessor IS receiving routingFunction:

```javascript
// Line ~630 (embedAllContent method)
const processedChunks = await this.repoProcessor.processAndChunkFiles(
  allDocuments,
  this.routeDocumentByType.bind(this)  // ✅ Verify this is passed!
);
```

If routing function is NOT passed, the fallback runs → creates giant chunks!

---

## User Requirement Clarification

> "files mentioned by name in query, then all chunks of this file should be added IN ADDITION to the chunk limits"

**Current behavior** ✅:
```javascript
// queryPipeline.js lines 665-670
searchResults.matches = [
  ...explicitFileChunks,  // ALL chunks from mentioned file
  ...contextualDocs,      // ADDITIONAL docs (15 chunks)
  ...(searchResults.matches || [])  // ADDITIONAL semantic code (30 chunks)
];
```

This is CORRECT! Explicit file chunks are added **in addition** to the normal topK limits.

**Example**:
- Query: "review contextPipeline.js"
- topK: 30 (code) + 15 (docs) = 45 normal limit
- Result: 39 (explicit file) + 15 (docs) + 30 (code) = **84 total chunks** ✅

The problem is NOT the retrieval strategy, it's that **those 39 chunks should be 200+ granular chunks!**

---

## Re-Indexing Required

After fixing repoProcessor.js, you MUST re-index to replace giant chunks with granular ones:

1. **Purge polluted data**:
   ```bash
   node scripts/purge_analysis_chunks.js  # Remove analysis files
   # Also need to purge giant chunks (TBD: create purge script for oversized chunks)
   ```

2. **Re-embed with fixed splitter**:
   ```bash
   # Trigger your repo embedding pipeline
   # Should see logs like:
   # "✅ Code document completed: 47 chunks"  (not "1 chunk"!)
   ```

3. **Verify chunking**:
   - Check trace analysis
   - Should see chunks: 1500-2000 chars each
   - NOT 30,000 chars!

---

## Testing Checklist

- [ ] Fix repoProcessor.js fallback (add forceBasicTextSplitting)
- [ ] Fix error handling (apply forced splitting on errors)
- [ ] Verify routingFunction is passed to repoProcessor
- [ ] Re-index repository
- [ ] Run test query: "review contextPipeline.js"
- [ ] Check trace analysis:
  - [ ] Chunks are 1500-2000 chars (NOT 30K!)
  - [ ] Multiple chunks per file (NOT 1 giant chunk!)
  - [ ] contextPipeline.js has 50-100 chunks (NOT 1!)
- [ ] Verify retrieval:
  - [ ] Explicit file chunks: ~50-100 (granular)
  - [ ] Contextual docs: 15 (separate search)
  - [ ] Semantic code: 30 (separate search)
  - [ ] Total: 95-145 chunks ✅

---

## Impact

**Before fix**:
- ❌ 1 chunk × 30,000 chars = 1 giant blob
- ❌ No method-level granularity
- ❌ Poor LLM context (all or nothing)

**After fix**:
- ✅ 50-100 chunks × 1500-2000 chars each
- ✅ Method-level granularity
- ✅ Semantic search works properly (retrieves relevant methods)
- ✅ LLM gets focused context

---

## Priority: CRITICAL

This affects ALL RAG retrieval quality. Without granular chunks:
- Semantic search can't find specific methods
- LLM receives irrelevant code
- Context window fills with noise
- Answer quality degrades significantly

**Fix ASAP!**
