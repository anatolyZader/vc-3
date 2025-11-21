# Fixed Hard-coded Namespaces in QueryPipeline

## Problem
The `performVectorSearch()` method in `QueryPipeline` was using hard-coded namespaces like `anatolyzader_vc-3_*`, making it impossible to use with different repositories.

## Solution
Updated the `performVectorSearch()` method to:

1. **Accept a repository descriptor parameter** - New `repoDescriptor` parameter with `{owner, name, branch}`
2. **Use consistent `sanitizeId()` helper** - Leverages `PineconeService.sanitizeId()` for namespace generation  
3. **Provide utility methods** - Added `QueryPipeline.createRepoDescriptor()` static helper
4. **Maintain backward compatibility** - Falls back gracefully when `repoDescriptor` is null

## Usage Examples

### Using with Repository Descriptor Object
```javascript
const queryPipeline = new QueryPipeline(options);

const repoDescriptor = {
  owner: 'anatolyZader',
  name: 'vc-3', 
  branch: 'main'
};

const results = await queryPipeline.performVectorSearch(
  prompt,
  vectorStore,
  traceData,
  userId,
  repoId,
  repoDescriptor  // New parameter
);
```

### Using with Repository URL Helper
```javascript
const repoDescriptor = QueryPipeline.createRepoDescriptor('https://github.com/anatolyZader/vc-3');
// Returns: { owner: 'anatolyZader', name: 'vc-3', branch: 'main' }

const results = await queryPipeline.performVectorSearch(
  prompt,
  vectorStore, 
  traceData,
  userId,
  repoId,
  repoDescriptor
);
```

### Backward Compatibility
```javascript
// Still works - falls back to default namespace generation
const results = await queryPipeline.performVectorSearch(
  prompt,
  vectorStore,
  traceData,
  userId,
  repoId,
  null  // No repository descriptor
);
```

## Implementation Details

### Namespace Generation
- **Before**: `${baseUserId}_anatolyzader_vc-3` (hard-coded)
- **After**: `PineconeService.sanitizeId(\`${owner}_${name}_${branch}\`)` (dynamic)

### Helper Method
```javascript
static createRepoDescriptor(repoData) {
  // Supports GitHub URLs or descriptor objects
  // Returns standardized {owner, name, branch} format
}
```

### Sanitization
Uses `PineconeService.sanitizeId()` which:
- Converts to lowercase
- Replaces invalid characters with underscores
- Ensures Pinecone namespace compatibility

## Files Modified
1. `queryPipeline.js` - Added `repoDescriptor` parameter and dynamic namespace generation
2. `aiLangchainAdapter.js` - Updated to pass `null` for `repoDescriptor` (TODO: enhance with actual repository context)

## Benefits
- ✅ Eliminates hard-coded repository references
- ✅ Consistent namespace generation across the codebase  
- ✅ Supports any GitHub repository
- ✅ Maintains backward compatibility
- ✅ Provides convenient utility methods