# Bug Fix: "config is not defined" Error in QueryPipeline

## Issue

After deploying, users received the generic error message:
```
"I encountered an issue while processing your request. Please try again shortly."
```

The terminal logs showed:
```
[2025-10-27T16:47:42.214Z] Error in QueryPipeline.respondToPrompt: config is not defined
```

## Root Causes

### 1. Variable Name Mismatch (PRIMARY BUG)

**File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline.js`

**Line 626**:
```javascript
// BEFORE (WRONG):
if (config && config.priority === 'file-specific') {

// AFTER (FIXED):
if (searchStrategy && searchStrategy.priority === 'file-specific') {
```

**Problem**: The method `deduplicateAndCapResults(results, searchStrategy)` received a parameter named `searchStrategy`, but inside the method it was referenced as `config`, causing a ReferenceError.

**Impact**: When file-specific queries were detected (like "explain the difference between app.js and aiLangchainAdapter.js"), the code tried to boost the github-code cap but crashed on the undefined `config` variable.

### 2. Text Search Service Not Initialized (SECONDARY ISSUE)

**Problem**: The full-text search service (PostgreSQL-based filename matching) was never initialized, even though the code to use it existed.

**Files Modified**:
1. `backend/business_modules/ai/application/services/aiService.js` - Added automatic initialization
2. `backend/diPlugin.js` - Improved aiLangchainAdapter registration

**Solution**: Added initialization logic in the `AIService` constructor to automatically call `initializeTextSearch()` when the postgres adapter is available.

## Changes Made

### 1. Query Pipeline Fix
- **File**: `backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline.js`
- **Change**: Changed `config` to `searchStrategy` on line 626
- **Commit**: Variable name fix to match method parameter

### 2. Text Search Initialization
- **File**: `backend/business_modules/ai/application/services/aiService.js`
- **Change**: Added automatic text search initialization in constructor
- **Benefits**:
  - Text search now works for file-specific queries
  - PostgreSQL full-text search finds exact file matches
  - Hybrid search (vector + text) now functional

### 3. DI Container Enhancement
- **File**: `backend/diPlugin.js`
- **Change**: Added disposer to aiLangchainAdapter registration
- **Benefits**: Proper cleanup on service disposal

## Testing

To verify the fix works:

1. **Test the primary bug fix**:
   - Start the server: `npm run dev`
   - Ask a file-specific question: "explain the difference in functioning between app.js and aiLangchainAdapter.js"
   - **Expected**: Should get a proper AI response instead of generic error

2. **Check text search initialization**:
   Look for this log line on startup:
   ```
   ✅ Text search initialized in AIService constructor
   ```

3. **Verify hybrid search works**:
   When asking about specific files, you should see:
   ```
   🔍 FILE-SPECIFIC SEARCH: Looking for app.js, aiLangchainAdapter.js
   🔍 Using hybrid approach: semantic search + full-text search for filenames
   ```

## Impact

- ✅ Fixed crash on file-specific queries
- ✅ Enabled full-text search for exact filename matching
- ✅ Improved search accuracy for explicit file mentions
- ✅ Better error handling and initialization

## Related Files

- `HYBRID_FILENAME_SEARCH_IMPLEMENTATION.md` - Documentation of the hybrid search feature
- `backend/business_modules/ai/infrastructure/search/textSearchService.js` - PostgreSQL text search implementation
- `backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchStrategy.js` - File detection logic

## Next Steps

1. Monitor production logs for successful text search initialization
2. Verify file-specific queries return relevant results
3. Consider adding integration tests for hybrid search functionality
4. Document the text search initialization flow
