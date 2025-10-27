# Chunk Retrieval Limits Analysis

## Current Configuration Summary

### 1. Initial Retrieval (Vector Search)
**Location**: `vectorSearchOrchestrator.js` constructor
```javascript
defaultTopK: 30        // Retrieves up to 30 initial chunks from Pinecone
defaultThreshold: 0.25 // Score threshold (0.25 is quite permissive)
maxResults: 100        // Maximum possible results
```

### 2. Search Strategy Limits
**Location**: `vectorSearchStrategy.js`

Different query types request different amounts:

| Query Type | Code Chunks | Docs Chunks | Total Requested |
|------------|-------------|-------------|-----------------|
| Explicit File Request | 20 | 5 | **25** |
| Domain/Business Logic | 15 | 8 | **23** |
| API/Endpoint | 20 | 10 | **30** |
| Error/Debugging | 20 | 5 | **25** |
| Chat Module | 15 | 5 | **20** |
| Git Module | 15 | 5 | **20** |
| AI Module | 15 | 8 | **23** |
| Documentation | 8 | 12 | **20** |
| Testing | 15 | 5 | **20** |
| Configuration | 10 | 12 | **22** |
| Plugin/Middleware | 15 | 8 | **23** |
| **Default (General)** | **20** | **10** | **30** |

✅ **All strategies request 20-30 chunks initially**

### 3. Per-Type Caps (Deduplication Phase)
**Location**: `queryPipeline.js` - `deduplicateAndCapResults()`

After initial retrieval, chunks are capped per type:

| Type | Max Chunks | Purpose |
|------|-----------|---------|
| `github-code` | **15** | ⭐ Main implementation code |
| `github-docs` | 8 | Documentation files |
| `github-test` | 5 | Test files |
| `github-config` | 3 | Configuration files |
| `github-catalog` | **0** | ❌ Excluded (catalogs) |
| `module_documentation` | 8 | Module docs |
| `apiSpec` | 5 | API specs |
| `apiSpecFull` | 2 | Full API specs |
| `architecture_documentation` | 5 | Architecture docs |
| `github-file` (legacy) | 10 | Fallback for old data |

### 4. Final Result Caps
**Maximum chunks sent to LLM**:
- Best case (diverse sources): **Up to 40+ chunks**
- Typical case (mixed): **20-30 chunks**
- Code-heavy case: **15 code + 8-10 other sources = 23-25 chunks**

## Analysis: Is This Sufficient?

### ✅ Strengths

1. **Initial Retrieval is Generous**
   - 30 chunks requested initially is good
   - Threshold of 0.25 is permissive (catches relevant content)

2. **Per-Type Caps Prevent Dominance**
   - No single source type can flood the context
   - `github-code` getting 15 chunks is reasonable

3. **Smart Strategy Selection**
   - Different query types get different allocations
   - API queries get 30 chunks, code queries get 25

### ⚠️ Potential Issues

1. **`github-code` Cap of 15 May Be Limiting**
   - If a user asks about multiple files (e.g., "explain app.js and aiLangchainAdapter.js")
   - 15 chunks might not be enough to cover both files fully
   - **Your earlier issue**: app.js wasn't retrieved at all

2. **Catalog Exclusion Working as Intended**
   - `github-catalog` is capped at 0 ✅
   - `filterContentTypes()` also removes catalogs ✅
   - Double protection is good

3. **Total Context Sent to LLM**
   - After all caps: typically 20-30 chunks reach the LLM
   - At ~500 tokens per chunk: **10,000-15,000 tokens of context**
   - This is reasonable for most LLMs

## Recommendations

### Option 1: Increase Code Chunk Limit (Conservative)
```javascript
'github-code': 20,  // Up from 15
```
**Pros**: More code context, better for multi-file questions
**Cons**: More tokens, potentially more noise

### Option 2: Dynamic Caps Based on Query Type (Advanced)
```javascript
// In deduplicateAndCapResults, accept strategy parameter
deduplicateAndCapResults(results, strategy) {
  const baseSourceTypeCaps = { ... };
  
  // Boost code limit for explicit file requests
  if (strategy.priority === 'file-specific') {
    baseSourceTypeCaps['github-code'] = 25;  // Higher for file-specific queries
  }
  
  return cappedResults;
}
```

### Option 3: Add File-Specific Boosting (Recommended)
Ensure when specific files are mentioned, they're prioritized:
```javascript
// In vectorSearchStrategy.js
if (mentionedFiles && mentionedFiles.length > 0) {
  return {
    codeResults: Math.max(20, mentionedFiles.length * 8),  // 8 chunks per file
    docsResults: 5,
    priority: 'file-specific'
  };
}
```

## Current Bottlenecks

### 1. File Discovery Problem (Most Critical)
**Issue**: app.js wasn't found in your earlier query
**Cause**: Not a limit problem, but a **search/filtering problem**
- File may not exist in Pinecone with correct metadata
- Or search query didn't match the embeddings well

### 2. Type-Based Caps (Minor)
**Issue**: 15 `github-code` chunks may not cover 3+ files
**Impact**: Medium - affects multi-file queries

### 3. Deduplication (Working as Designed)
**Issue**: Identical chunks removed
**Impact**: Low - this is intentional

## Recommended Actions

### Immediate (High Priority)
1. ✅ **Already implemented**: Specific file type classifications
2. ✅ **Already implemented**: Catalog exclusion (working)
3. 🔄 **Next**: Increase `github-code` cap to 20-25
4. 🔄 **Next**: Add file-specific search boosting

### Medium Priority
5. Add logging to show which files were found/missed
6. Implement explicit file search (filename matching)
7. Add metadata to track file retrieval success rate

### Low Priority
8. Consider dynamic caps based on query complexity
9. Monitor token usage vs. quality trade-offs
10. A/B test different cap configurations

## Conclusion

**Current limits are reasonable but could be improved:**

- ✅ Initial retrieval (30 chunks) is sufficient
- ✅ Catalog exclusion is working properly
- ⚠️ `github-code` cap of 15 might be too restrictive for multi-file queries
- ❌ File discovery needs improvement (search strategy, not limits)

**Recommended immediate change:**
Increase the `github-code` cap from 15 to 20 chunks to allow more comprehensive code context, especially for multi-file queries.

This gives ~33% more code context without overwhelming the LLM.
