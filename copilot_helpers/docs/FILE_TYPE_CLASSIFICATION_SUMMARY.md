# File Type Classification Implementation Summary

## Overview
Replaced the generic `github-file` type with specific file type classifications for better search relevance and filtering.

## New File Types

### Primary Classifications
- **`github-code`** - Actual implementation code (`.js`, `.ts`, `.py`, `.java`, etc.)
- **`github-docs`** - Documentation files (`.md`, `README.md`, `CHANGELOG.md`)
- **`github-test`** - Test files (`*.test.js`, `*.spec.ts`, files in `/test/` directories)
- **`github-config`** - Configuration files (`package.json`, `.env`, `*.config.js`)
- **`github-catalog`** - Data catalogs (`catalog.json`, `schema.json`, `ul_dictionary.json`)

### Legacy Support
- **`github-file`** - Legacy type (will gradually be replaced)
- **`github-file-code`** - Legacy code type
- **`github-file-json`** - Legacy JSON type

## Files Modified

### 1. Core Classifier
**`/backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/utils/fileTypeClassifier.js`** (NEW)
- Centralized file type determination logic
- Path-based and content-based classification
- Priority ordering for different file types

### 2. Data Ingestion
**`/backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/loading/cloudNativeRepoLoader.js`**
- Updated to use `FileTypeClassifier` during repository loading
- Automatically classifies files as they're loaded from GitHub

**`/backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter.js`**
- Auto-detects file type if not already set
- Applies classification during chunk creation

**`/backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/chunkPostprocessor.js`**
- Post-processing step ensures all chunks have proper types
- Migrates legacy types to new classifications

### 3. Query Pipeline
**`/backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline.js`**
- Updated `deduplicateAndCapResults()` with per-type caps:
  - `github-code`: 15 chunks max
  - `github-docs`: 8 chunks max
  - `github-test`: 5 chunks max
  - `github-config`: 3 chunks max
  - `github-catalog`: 0 chunks (excluded)
- Enhanced `filterContentTypes()` to filter by type metadata

### 4. Search Strategy
**`/backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchStrategy.js`**
- Updated all search strategies to use specific types
- Added explicit file request handling
- Configuration queries now include `github-config` type
- Test queries prioritize `github-test` type
- Documentation queries prioritize `github-docs` type
- Default queries exclude catalogs and configs

### 5. Context Builder
**`/backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/contextBuilder.js`**
- `analyzeDocuments()` now breaks down GitHub files by specific type
- Enhanced logging shows file type distribution
- Warnings for catalog files that slip through filters

### 6. Migration Support
**`/migrate_file_types.js`** (NEW)
- Information script explaining migration process
- Optional `--stats` flag to check Pinecone statistics
- No destructive operations - safe to run

## Benefits

### 1. Better Search Relevance
- Catalog files (JSON schemas, dictionaries) are automatically excluded
- Reduces noise from non-code content
- **Fixes the root issue** where catalogs were contaminating search results

### 2. Smarter Query Strategies
- Test-related questions prioritize test files
- Configuration questions include config files
- Documentation questions prioritize markdown files
- Default queries exclude catalogs entirely

### 3. Improved Filtering
- Type-based filtering is faster than content analysis
- More reliable than pattern matching on filenames
- Can combine with existing semantic filters

### 4. Better Observability
- Logs show file type breakdown
- Easy to identify if catalogs are being included
- Tracks legacy types that need re-indexing

## Migration Path

### Automatic Migration (Recommended)
1. ✅ **Done**: Code updated to use new classifications
2. 🔄 **Ongoing**: New repositories automatically get new types
3. ⏳ **Gradual**: Re-process existing repositories when convenient

### Legacy Data Handling
- Existing `github-file` vectors will continue to work
- Treated with default 10-chunk cap
- Logs will show as "Legacy GitHub Files"
- No urgent action required

### Force Migration (Optional)
- Re-process all repositories through `processPushedRepo()`
- Will automatically apply new file type classifications
- Recommended for high-priority repositories

## Testing

### Verify New Classifications
```javascript
const FileTypeClassifier = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/utils/fileTypeClassifier');

// Test classification
console.log(FileTypeClassifier.determineGitHubFileType('src/app.js'));           // 'github-code'
console.log(FileTypeClassifier.determineGitHubFileType('README.md'));            // 'github-docs'
console.log(FileTypeClassifier.determineGitHubFileType('src/app.test.js'));      // 'github-test'
console.log(FileTypeClassifier.determineGitHubFileType('package.json'));         // 'github-config'
console.log(FileTypeClassifier.determineGitHubFileType('catalog.json'));         // 'github-catalog'
```

### Monitor Logs
Look for these log entries:
```
🧠 SEARCH STRATEGY: Explicit File Request (app.js, aiLangchainAdapter.js)
💻 GitHub Code Files: 15 chunks
📖 GitHub Documentation: 3 chunks
🧪 GitHub Test Files: 0 chunks
⚙️  GitHub Config Files: 0 chunks
⚠️  WARNING: 0 catalog files included (should be filtered)
```

### Test Query
Try asking: "explain app.js and aiLangchainAdapter.js"
- Should now retrieve both files correctly
- Logs will show explicit file request strategy
- No catalog contamination

## Rollback Plan

If issues arise, you can temporarily revert by:
1. Commenting out `FileTypeClassifier` imports
2. Restoring `type: 'github-file'` in loaders
3. Reverting `vectorSearchStrategy.js` to use generic type
4. Existing vectors will continue to work

However, this should not be necessary as the changes are backward-compatible.

## Performance Impact

- **Ingestion**: Negligible (simple string matching)
- **Query**: Faster (type-based filtering vs. content analysis)
- **Storage**: No change (type field already existed)

## Next Steps

1. ✅ Monitor logs for file type distribution
2. ✅ Test queries that mention specific files
3. ✅ Verify catalogs are being filtered out
4. ⏳ Re-process repositories gradually
5. ⏳ Update any custom filters/queries that hardcode `github-file`

## Questions?

The implementation is conservative and backward-compatible. Legacy data will continue to work while new data automatically gets proper classifications.
