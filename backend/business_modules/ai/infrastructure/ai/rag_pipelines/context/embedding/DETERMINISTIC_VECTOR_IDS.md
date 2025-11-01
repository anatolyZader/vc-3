# Deterministic Vector IDs - Implementation Guide

## Overview

This document describes the deterministic vector ID system implemented for EventStorm's Pinecone embeddings, which eliminates duplicate vectors and makes upserts truly idempotent.

## Problem Solved

**Before:** Vector IDs included chunk indices and generated timestamps, leading to:
- Different IDs for same content on re-indexing → duplicates
- Complex cleanup logic to detect and remove duplicates via sampling
- Non-idempotent upserts (same content → multiple vectors)

**After:** Vector IDs are deterministic based on content hash and source:
- Same content + source = same ID → automatic overwrite
- Idempotent upserts (no duplicates by design)
- Cleanup only needed for deleted/renamed files

## ID Format

### Repository Documents
```
namespace:source:contentHash
```

**Example:**
```
my-repo:src_components_Button.js:a1b2c3d4e5f6g7h8
```

### User Repository Documents
```
userId:repoId:source:contentHash
```

**Example:**
```
user123:repo456:src_utils_helper.js:a1b2c3d4e5f6g7h8
```

## Key Components

### Content Hash Generation
- **Algorithm:** SHA-256
- **Input:** Document page content (doc.pageContent)
- **Output:** First 16 characters of hex digest
- **Purpose:** Stable fingerprint of content

### Source Sanitization
- Replaces `/` with `_` 
- Removes special characters
- Lowercase conversion
- Result: `src/components/Button.js` → `src_components_button.js`

### Metadata Storage
Instead of embedding chunk index in ID, we store it in metadata:

```javascript
{
  contentHash: "a1b2c3d4e5f6g7h8",  // Hash of content
  chunkIndex: 0,                     // Position in document
  version: 1730476800000,            // Timestamp for reference
  source: "src/components/Button.js" // Original file path
}
```

## Implementation Details

### ID Generation (pineconeService.js)

```javascript
static generateRepositoryDocumentIds(documents, namespace) {
  const crypto = require('crypto');
  
  return documents.map((doc, index) => {
    const sourceFile = doc.metadata?.source || 'unknown';
    const sanitizedSource = this.sanitizeId(sourceFile.replace(/\//g, '_'));
    
    // Create stable content hash
    const contentHash = crypto
      .createHash('sha256')
      .update(doc.pageContent || '')
      .digest('hex')
      .substring(0, 16);
    
    // Store metadata (not in ID)
    if (doc.metadata) {
      doc.metadata.contentHash = contentHash;
      doc.metadata.chunkIndex = index;
      doc.metadata.version = Date.now();
    }
    
    // Deterministic ID
    return `${namespace}:${sanitizedSource}:${contentHash}`;
  });
}
```

### Cleanup Strategy (pineconeService.js)

With deterministic IDs, cleanup logic is dramatically simplified:

```javascript
async cleanupOldRepositoryEmbeddings(namespace, options = {}) {
  // With deterministic IDs, upserts are idempotent
  // Duplicates don't occur: same content = same ID = automatic overwrite
  
  // Cleanup only needed for full re-indexing (delete namespace)
  // Incremental updates automatically overwrite matching IDs
  
  await this.deleteNamespace(namespace);
  return { success: true, mode: 'full_namespace_reset' };
}
```

### File-Specific Deletion (New Method)

For handling deleted or renamed files:

```javascript
async deleteVectorsForFiles(namespace, filePaths) {
  // Query to find vectors matching specific file paths
  // Delete vectors where source matches deleted/renamed files
  
  for (const filePath of filePaths) {
    const queryResult = await this.querySimilar(zeroVector, {
      namespace,
      topK: 1000,
      filter: { source: filePath }
    });
    
    // Delete matching vectors
    await this.deleteVectors(matchingIds, namespace);
  }
}
```

## Usage in Embedding Manager

### Before (embeddingManager.js)
```javascript
// Generate IDs with options
const documentIds = PineconeService.generateRepositoryDocumentIds(docs, namespace, {
  includeVersion: true,
  prefix: null
});

// Complex cleanup logic
await pineconeService.cleanupOldRepositoryEmbeddings(namespace, {
  keepLatestCount: 0,
  dryRun: false
});
```

### After (embeddingManager.js)
```javascript
// Generate deterministic IDs (no options needed)
const documentIds = PineconeService.generateRepositoryDocumentIds(docs, namespace);

// Simple cleanup (full namespace reset)
await pineconeService.cleanupOldRepositoryEmbeddings(namespace, {
  dryRun: false
});

// Upsert is now idempotent - same IDs overwrite automatically
await pineconeService.upsertDocuments(docs, embeddings, {
  namespace,
  ids: documentIds
});
```

## Benefits

### 1. No Duplicates
- Same content + source = same ID
- Upsert automatically overwrites
- No duplicate detection logic needed

### 2. Idempotent Operations
- Re-indexing same content → same IDs → overwrites (not duplicates)
- Safe to run multiple times
- Predictable behavior

### 3. Simplified Cleanup
- No sampling required
- No timestamp comparison
- No duplicate grouping logic
- Only delete when files are removed/renamed

### 4. Better Performance
- Faster upserts (no cleanup scanning)
- Reduced Pinecone query load
- Simpler error handling

### 5. Easier Debugging
- ID tells you exactly what it contains
- Deterministic = reproducible
- Clear relationship: content → hash → ID

## Migration Notes

### Backward Compatibility
- Old vectors (with chunk index in ID) will coexist with new ones
- Old cleanup logic preserved as `cleanupOldRepositoryEmbeddingsLegacy()`
- Next full re-index will migrate to new ID format

### Testing Checklist
- ✅ Verify same content produces same ID
- ✅ Verify different content produces different ID
- ✅ Verify upsert overwrites existing vectors
- ✅ Verify metadata contains chunkIndex
- ✅ Verify namespace cleanup works
- ✅ Verify file deletion cleanup works

## Future Enhancements

### Incremental Cleanup
Instead of full namespace deletion, track file changes:
```javascript
// On repository update:
const { added, modified, deleted } = await getChangedFiles();

// Only delete vectors for deleted/renamed files
await pineconeService.deleteVectorsForFiles(namespace, deleted);

// Upsert will automatically overwrite modified files (same ID)
await pineconeService.upsertDocuments(addedAndModifiedDocs, embeddings, {
  namespace,
  ids: documentIds
});
```

### Content-Addressed Storage
The current system is essentially content-addressed storage:
- Content hash = address
- Source path = namespace
- Version metadata = timestamp

This opens up possibilities for:
- Deduplication across repositories
- Content-based caching
- Efficient delta updates

## References

- **pineconeService.js**: ID generation logic
- **embeddingManager.js**: Usage in storage pipeline
- **contextPipeline.js**: Integration with repository processing

## Questions?

Contact: eventstorm-dev team
Last Updated: November 1, 2025
