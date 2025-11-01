# Deterministic Vector IDs - Quick Reference

## Core Concept
```
contentHash + source = unique stable key → idempotent upserts
```

## ID Format

### Repository Documents
```
namespace:source:contentHash
```
Example: `my-repo:src_Button.js:a1b2c3d4e5f6g7h8`

### User Repository Documents
```
userId:repoId:source:contentHash
```
Example: `user123:repo456:src_Button.js:a1b2c3d4e5f6g7h8`

## Key Properties

| Property | Value |
|----------|-------|
| **Deterministic** | Same content + source = same ID (always) |
| **Idempotent** | Upserting same ID overwrites (no duplicates) |
| **Stable** | ID never changes for same content |
| **Unique** | Different content = different hash = different ID |

## Code Examples

### Generate IDs
```javascript
const PineconeService = require('./pineconeService');

// Repository documents
const ids = PineconeService.generateRepositoryDocumentIds(
  documents, 
  namespace
);

// User documents
const ids = PineconeService.generateUserRepositoryDocumentIds(
  documents,
  userId,
  repoId
);
```

### Upsert (Idempotent)
```javascript
// Same IDs overwrite automatically - no duplicates!
await pineconeService.upsertDocuments(documents, embeddings, {
  namespace,
  ids: documentIds
});
```

### Cleanup (Simple)
```javascript
// Full namespace reset
await pineconeService.cleanupOldRepositoryEmbeddings(namespace);

// File-specific deletion (for incremental updates)
await pineconeService.deleteVectorsForFiles(namespace, deletedFiles);
```

## Metadata Structure

```javascript
{
  contentHash: "a1b2c3d4e5f6g7h8",  // SHA-256 hash (16 chars)
  chunkIndex: 0,                     // Position in document
  version: 1730476800000,            // Timestamp
  source: "src/Button.js",           // Original file path
  // ... other metadata
}
```

## Common Operations

### Full Refresh
```javascript
// 1. Clean namespace
await pineconeService.cleanupOldRepositoryEmbeddings(namespace);

// 2. Generate IDs
const ids = PineconeService.generateRepositoryDocumentIds(docs, namespace);

// 3. Upsert
await pineconeService.upsertDocuments(docs, embeddings, { namespace, ids });
```

### Incremental Update
```javascript
// 1. Delete changed/removed files
await pineconeService.deleteVectorsForFiles(namespace, [...modified, ...deleted]);

// 2. Generate IDs for changed files
const ids = PineconeService.generateRepositoryDocumentIds(changedDocs, namespace);

// 3. Upsert (overwrites modified, adds new)
await pineconeService.upsertDocuments(changedDocs, embeddings, { namespace, ids });
```

## Benefits vs Old System

| Aspect | Old | New |
|--------|-----|-----|
| **Duplicates** | ❌ Yes | ✅ No (by design) |
| **Cleanup** | Complex (sampling) | Simple (delete namespace) |
| **Performance** | Slow (10s) | Fast (1-2s) |
| **Idempotency** | ❌ No | ✅ Yes |
| **Incremental** | ❌ Full refresh only | ✅ Possible |

## When to Use

### Full Refresh
- ✅ Initial indexing
- ✅ Major refactors (many files changed)
- ✅ After force-push/rebase
- ✅ Periodic cleanup (monthly)

### Incremental Update
- ✅ Daily updates
- ✅ Small changes (<50 files)
- ✅ Continuous integration
- ✅ Cost optimization

## Troubleshooting

### IDs Different for Same Content?
```javascript
// Check metadata is identical
console.log(doc.metadata.source); // Must match exactly

// Verify content is identical
console.log(doc.pageContent); // Must match exactly
```

### Duplicates Still Appearing?
```javascript
// Old vectors (pre-migration) may coexist
// Solution: Full namespace reset
await pineconeService.cleanupOldRepositoryEmbeddings(namespace);
```

### Can't Find Vectors After Update?
```javascript
// Check namespace
console.log(namespace); // Must match exactly

// Check IDs were generated correctly
console.log(ids[0]); // Should match pattern: namespace:source:hash
```

## Testing

```bash
# Run deterministic ID tests
npm test -- pineconeService.deterministic.test.js

# Expected: 13 tests pass
```

## Documentation

- 📖 **DETERMINISTIC_VECTOR_IDS.md** - Full guide
- 📊 **VECTOR_ID_COMPARISON.md** - Before/after comparison
- 🔄 **INCREMENTAL_UPDATES.md** - Incremental update strategies
- 📝 **IMPLEMENTATION_SUMMARY.md** - Complete implementation details

## API Quick Reference

```javascript
// Static methods (PineconeService class)
PineconeService.generateRepositoryDocumentIds(documents, namespace)
PineconeService.generateUserRepositoryDocumentIds(documents, userId, repoId)

// Instance methods (pineconeService instance)
pineconeService.upsertDocuments(documents, embeddings, options)
pineconeService.cleanupOldRepositoryEmbeddings(namespace, options)
pineconeService.deleteVectorsForFiles(namespace, filePaths)
pineconeService.deleteNamespace(namespace)
```

## Migration Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | New code deployed, deterministic IDs active |
| **Phase 2** | 🔄 In Progress | Natural migration on next full refresh |
| **Phase 3** | ⏳ Planned | Optimization and incremental updates |

## Performance Metrics

### Cleanup Time
- **Before**: 5-10 seconds per namespace
- **After**: 1-2 seconds per namespace
- **Savings**: 70-80%

### Incremental Updates (5% change rate)
- **Before**: 10,000 operations (full refresh)
- **After**: 600 operations (incremental)
- **Savings**: 94%

## Key Insights

### Design Pattern
This is **content-addressed storage**:
- Used by Git, IPFS, Docker
- Proven, reliable, efficient
- Best practice for immutable content

### Core Principle
> "The best way to prevent duplicates is to make them impossible by design."

Same content + source = same ID = automatic overwrite = no duplicates

---

**Questions?** See full documentation or contact eventstorm-dev team.
