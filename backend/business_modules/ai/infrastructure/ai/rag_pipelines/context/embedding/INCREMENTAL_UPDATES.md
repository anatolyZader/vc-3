# Incremental Updates with Deterministic Vector IDs

## Overview

With deterministic vector IDs (`namespace:source:contentHash`), incremental repository updates become significantly simpler and more efficient.

## Key Principle

**Idempotent Upserts**: Same content + source = same ID = automatic overwrite

This means:
- ✅ **Modified files** → new content hash → new ID → add new vector (old one can be deleted)
- ✅ **Unchanged files** → same content hash → same ID → upsert overwrites (but content identical, so no change)
- ✅ **New files** → new source → new ID → add new vector
- ❌ **Deleted files** → no upsert → old vectors remain (needs explicit cleanup)

## Incremental Update Strategy

### Option 1: Smart Incremental (Recommended)

Only process changed files, explicitly clean up deleted files.

```javascript
async incrementalUpdate({ namespace, changedFiles, deletedFiles, newContent }) {
  // 1. Delete vectors for removed/renamed files
  if (deletedFiles.length > 0) {
    await pineconeService.deleteVectorsForFiles(namespace, deletedFiles);
  }
  
  // 2. Process only changed files (added + modified)
  const documents = await loadAndChunkFiles(changedFiles);
  const documentIds = PineconeService.generateRepositoryDocumentIds(documents, namespace);
  
  // 3. Upsert with deterministic IDs
  // - New files: creates new vectors
  // - Modified files: new hash = new ID (old vectors can be cleaned up separately)
  // - Unchanged files: same ID = overwrite (but identical content, so no-op)
  await pineconeService.upsertDocuments(documents, embeddings, {
    namespace,
    ids: documentIds
  });
}
```

### Option 2: Full Refresh (Simpler)

Delete entire namespace and re-index everything.

```javascript
async fullRefresh({ namespace, allFiles }) {
  // 1. Clear namespace
  await pineconeService.cleanupOldRepositoryEmbeddings(namespace);
  
  // 2. Process all files
  const documents = await loadAndChunkFiles(allFiles);
  const documentIds = PineconeService.generateRepositoryDocumentIds(documents, namespace);
  
  // 3. Upsert with deterministic IDs
  await pineconeService.upsertDocuments(documents, embeddings, {
    namespace,
    ids: documentIds
  });
}
```

**When to use:**
- Initial indexing
- Major refactors (many files changed)
- After git force-push or rebase
- Simpler error recovery

## Handling File Operations

### File Added
```javascript
// New source → new ID → new vector
const newFile = { source: 'src/NewComponent.js', content: '...' };
const doc = await chunkFile(newFile);
const id = generateId(doc); // namespace:src_NewComponent.js:hash

await upsert(doc, id); // Creates new vector
```

### File Modified
```javascript
// Same source, different content → different hash → different ID
const modifiedFile = { source: 'src/Button.js', content: '... updated ...' };
const doc = await chunkFile(modifiedFile);
const id = generateId(doc); // namespace:src_Button.js:NEW_HASH

await upsert(doc, id); // Creates new vector with new hash

// Note: Old vector (with old hash) still exists
// Options:
// 1. Leave it (will be cleaned up on next full refresh)
// 2. Explicitly delete old vectors for this source
await deleteVectorsForFiles(namespace, ['src/Button.js']); // Deletes ALL chunks for this file
await upsert(doc, id); // Then add new version
```

### File Deleted
```javascript
// No upsert → old vectors remain → explicit cleanup needed
const deletedFile = 'src/OldComponent.js';

await deleteVectorsForFiles(namespace, [deletedFile]);
// Deletes all vectors where source = 'src/OldComponent.js'
```

### File Renamed
```javascript
// Treat as: delete old + add new
const oldPath = 'src/OldName.js';
const newPath = 'src/NewName.js';

// 1. Delete old vectors
await deleteVectorsForFiles(namespace, [oldPath]);

// 2. Add new vectors (same content, new source → new IDs)
const doc = await chunkFile({ source: newPath, content: '...' });
const id = generateId(doc); // namespace:src_NewName.js:hash
await upsert(doc, id);
```

### File Moved (Content Unchanged)
```javascript
// Old: src/components/Button.js → hash: a1b2c3d4
// New: src/ui/Button.js → hash: a1b2c3d4 (same content)

// Despite same content hash, source differs → different IDs
// Old ID: namespace:src_components_Button.js:a1b2c3d4
// New ID: namespace:src_ui_Button.js:a1b2c3d4

// Cleanup required:
await deleteVectorsForFiles(namespace, ['src/components/Button.js']);
await upsertNewFile('src/ui/Button.js');
```

## Integration with Change Detection

### Using ChangeAnalyzer

```javascript
const changes = await changeAnalyzer.analyzeChangesAndRecommendStrategy({
  oldCommitHash,
  newCommitHash,
  changedFiles,
  githubOwner,
  repoName,
  repoCharacteristics
});

switch (changes.strategy) {
  case 'skip':
    // No processing needed
    break;
    
  case 'incremental':
    // Smart incremental update
    const { added, modified, deleted } = changedFiles;
    
    // Delete vectors for removed files
    await pineconeService.deleteVectorsForFiles(namespace, deleted);
    
    // Process changed files (deterministic IDs handle the rest)
    const docs = await loadAndChunkFiles([...added, ...modified]);
    const ids = PineconeService.generateRepositoryDocumentIds(docs, namespace);
    await pineconeService.upsertDocuments(docs, embeddings, { namespace, ids });
    break;
    
  case 'full':
    // Full refresh (delete namespace + re-index all)
    await pineconeService.cleanupOldRepositoryEmbeddings(namespace);
    const allDocs = await loadAndChunkAllFiles();
    const allIds = PineconeService.generateRepositoryDocumentIds(allDocs, namespace);
    await pineconeService.upsertDocuments(allDocs, embeddings, { namespace, ids: allIds });
    break;
}
```

## Tracking File Versions

### Store Version in Metadata

```javascript
// When generating IDs, we also store metadata:
doc.metadata = {
  contentHash: 'a1b2c3d4e5f6g7h8',
  chunkIndex: 0,
  version: Date.now(),           // Timestamp of indexing
  gitCommitHash: 'abc123',       // Git commit for this version
  source: 'src/Button.js'        // Original file path
};
```

### Query by Version

```javascript
// Find all vectors from a specific commit
const results = await pineconeService.query({
  namespace,
  filter: { gitCommitHash: 'abc123' }
});

// Find all versions of a specific file
const results = await pineconeService.query({
  namespace,
  filter: { source: 'src/Button.js' }
});
```

## Cleanup Strategies

### Strategy 1: Periodic Full Refresh
```javascript
// Run nightly or weekly
await pineconeService.cleanupOldRepositoryEmbeddings(namespace);
await reindexFullRepository();
```

**Pros:**
- ✅ Simplest to implement
- ✅ Guaranteed consistency
- ✅ No accumulation of stale vectors

**Cons:**
- ❌ Higher API costs (full re-index)
- ❌ Longer processing time
- ❌ Temporary search unavailability during refresh

### Strategy 2: Incremental with Explicit Deletions
```javascript
// On each update
const { added, modified, deleted } = await getChangedFiles();

// Explicit cleanup for modified files (remove old versions)
await pineconeService.deleteVectorsForFiles(namespace, modified);

// Explicit cleanup for deleted files
await pineconeService.deleteVectorsForFiles(namespace, deleted);

// Upsert new/modified files (deterministic IDs)
await upsertChangedFiles([...added, ...modified]);
```

**Pros:**
- ✅ Fast incremental updates
- ✅ Lower API costs
- ✅ Always current (no stale data)

**Cons:**
- ❌ More complex logic
- ❌ Requires accurate change detection
- ❌ Extra deletion operations

### Strategy 3: Hybrid Approach (Recommended)
```javascript
// Incremental updates for most changes
if (changedFiles.length < 50) {
  await incrementalUpdate(changedFiles);
}
// Full refresh for major changes
else {
  await fullRefresh();
}

// Periodic full refresh as safety net (e.g., monthly)
if (lastFullRefresh > 30 days) {
  await fullRefresh();
}
```

**Pros:**
- ✅ Best of both worlds
- ✅ Efficient for small changes
- ✅ Guaranteed consistency via periodic refresh

**Cons:**
- ❌ More complex coordination
- ❌ Threshold tuning needed

## Cost Analysis

### Full Refresh (Baseline)
```
- Delete namespace: 1 operation
- Chunk N files: 0 API cost (local)
- Generate N*M vector IDs: 0 API cost (local)
- Upsert N*M vectors: N*M write operations
Total: 1 + N*M operations
```

### Incremental Update (Smart)
```
- Delete K changed files: K query + K delete operations
- Chunk K files: 0 API cost (local)
- Generate K*M vector IDs: 0 API cost (local)
- Upsert K*M vectors: K*M write operations
Total: 2K + K*M operations (where K << N)
```

**Savings for 5% file change rate:**
- N = 1000 files, M = 10 chunks/file
- Full: 1 + 10,000 = 10,001 operations
- Incremental: 2(50) + 500 = 600 operations
- **Savings: 94%** 🎉

## Best Practices

### 1. Track Git Commit Hashes
Store commit hash in metadata for version tracking:
```javascript
doc.metadata.gitCommitHash = currentCommit;
```

### 2. Use Batch Deletions
When deleting multiple files, batch them:
```javascript
// Don't do this:
for (const file of deletedFiles) {
  await deleteVectorsForFiles(namespace, [file]);
}

// Do this instead:
await deleteVectorsForFiles(namespace, deletedFiles);
```

### 3. Validate Deterministic IDs
Add assertions to ensure IDs are stable:
```javascript
const id1 = generateId(doc);
const id2 = generateId(doc); // Same doc
assert(id1 === id2, 'IDs must be deterministic');
```

### 4. Monitor Stale Vectors
Track vector age and alert if too old:
```javascript
const stats = await getNamespaceStats(namespace);
const oldVectors = stats.matches.filter(v => 
  Date.now() - v.metadata.version > 90 * 24 * 60 * 60 * 1000 // 90 days
);
if (oldVectors.length > threshold) {
  alert('Stale vectors detected - consider full refresh');
}
```

### 5. Implement Dry-Run Mode
Test changes before applying:
```javascript
const plan = await planIncrementalUpdate(changes, { dryRun: true });
console.log(`Would delete ${plan.deletions} vectors`);
console.log(`Would add ${plan.additions} vectors`);
// Review plan, then execute
await executeIncrementalUpdate(plan);
```

## Migration Notes

### Phase 1: Deploy (Current)
- New code generates deterministic IDs
- Old vectors remain (backward compatible)
- Both ID formats coexist

### Phase 2: Natural Migration
- Next full refresh per repo migrates to new IDs
- Old IDs gradually phased out
- No manual intervention needed

### Phase 3: Optimization
- Once all repos migrated, enable incremental updates
- Remove old cleanup logic
- Full benefits realized

## Summary

| Update Type | Operations | API Cost | Use Case |
|-------------|-----------|----------|----------|
| **Full Refresh** | Delete namespace + upsert all | High | Initial index, major changes |
| **Incremental** | Delete changed + upsert changed | Low | Daily updates, small changes |
| **Hybrid** | Smart decision based on change size | Optimal | Production recommended |

**Key Insight**: Deterministic IDs make incremental updates possible because:
- Same content = same ID = safe to re-upsert (idempotent)
- Different content = different ID = adds new vector
- Deleted files need explicit cleanup (but easy to track)

This transforms vector storage from "full refresh only" to "efficient incremental updates with occasional full refresh for safety."
