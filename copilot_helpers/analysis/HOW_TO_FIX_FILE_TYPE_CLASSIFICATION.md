# How to Fix: Integrate FileTypeClassifier into Repository Processing

## The Missing Integration

**Location**: `/backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessor.js`

**Line 129-147**: Where metadata is enriched, but `type` field is missing

## Current Code (BROKEN):
```javascript
const enrichedDocuments = allDocuments.map(doc => ({
  ...doc,
  metadata: {
    ...doc.metadata,
    githubOwner,
    repoName,
    branch,
    ...(commitInfo && {
      commitHash: commitInfo?.hash ?? null,
      // ... other commit fields
    }),
    file_type: this.getFileType(doc.metadata.source || ''),  // ← Wrong field name!
    repository_url: repoUrl,
    loaded_at: new Date().toISOString(),
    loading_method: 'batched_github_loader'
    // ❌ MISSING: type field for Pinecone filters!
  }
}));
```

## Fixed Code (WORKING):
```javascript
// Add import at top of file:
const FileTypeClassifier = require('../utils/fileTypeClassifier');

// Then in the map function (line 129):
const enrichedDocuments = allDocuments.map(doc => {
  const filePath = doc.metadata.source || doc.metadata.filePath || '';
  const content = doc.pageContent || '';
  
  return {
    ...doc,
    metadata: {
      ...doc.metadata,
      githubOwner,
      repoName,
      branch,
      ...(commitInfo && {
        commitHash: commitInfo?.hash ?? null,
        commitTimestamp: commitInfo?.timestamp ?? null,
        commitAuthor: commitInfo?.author ?? null,
        commitSubject: commitInfo?.subject ?? null,
        commitDate: commitInfo?.date ?? null,
      }),
      // NEW: Use FileTypeClassifier for Pinecone type field
      type: FileTypeClassifier.determineGitHubFileType(filePath, content),
      // Keep file_type for backwards compatibility
      file_type: this.getFileType(filePath),
      repository_url: repoUrl,
      loaded_at: new Date().toISOString(),
      loading_method: 'batched_github_loader'
    }
  };
});
```

## What This Does:

1. **Adds `type` field** with values like:
   - `github-code` - JavaScript/TypeScript implementation files
   - `github-docs` - Markdown/README files
   - `github-test` - Test files
   - `github-config` - Package.json, .env files
   - `github-catalog` - Data catalog JSON files

2. **Keeps `file_type`** for backwards compatibility (javascript, typescript, etc.)

3. **Uses FileTypeClassifier** which has smart detection:
   - Path-based: `/test/`, `/__tests__/`, `.test.js`
   - Name-based: `catalog.json`, `package.json`
   - Extension-based: `.md`, `.js`, `.ts`

## After Integration:

### New vectors will have:
```javascript
{
  type: 'github-code',           // ← NEW: Works with filters!
  file_type: 'javascript',       // ← OLD: Still there
  source: 'anatolyZader/vc-3',
  filePath: 'backend/.../queryPipeline.js'
}
```

### Search filters will match:
```javascript
{
  $or: [
    { type: { $eq: 'github-code' } },  // ← MATCHES!
    { type: { $eq: 'module_documentation' } }
  ]
}
```

## Steps to Apply:

1. **Add the import** (line ~5):
   ```javascript
   const FileTypeClassifier = require('../utils/fileTypeClassifier');
   ```

2. **Replace the enrichedDocuments mapping** (lines ~129-147)

3. **Re-push your repository** to trigger re-processing

4. **Verify** with debug script:
   ```bash
   node backend/debug_pinecone_index.js
   ```
   Should show `type: 'github-code'` instead of `type: 'github-file'`

## Need the Quick Fix First?

I can also add **legacy type support** to your filters so RAG works immediately while we do the proper integration. Let me know!
