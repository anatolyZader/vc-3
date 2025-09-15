# Modern Pinecone Configuration Guide

This guide covers the configuration and setup for the new, modernized Pinecone integration in EventStorm.

## Overview

The new Pinecone implementation provides:
- ✅ **Centralized service** - Single `PineconeService` for all vector operations
- ✅ **Modern API patterns** - Uses latest Pinecone SDK patterns from official docs
- ✅ **Better error handling** - Robust connection management and retry logic
- ✅ **Improved performance** - Efficient batching and rate limiting
- ✅ **Clean architecture** - Separated concerns with dedicated storage and search components

## Architecture

```
PineconeService (Core)
├── ModernVectorStorageManager (Storage operations)
├── ModernVectorSearchOrchestrator (Search operations)
└── Integration with aiLangchainAdapter & docsLangchainAdapter
```

## Environment Variables

### Required Variables

```bash
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=eventstorm-index

# OpenAI Configuration (for embeddings)
OPENAI_API_KEY=your_openai_api_key_here
```

### Optional Variables

```bash
# Pinecone Region (defaults to us-east-1)
PINECONE_REGION=us-east-1

# Development/Debug settings
NODE_ENV=development  # Enables debug logging
```

## Index Configuration

### Creating a New Index

The new implementation can automatically create indexes following Pinecone's official patterns:

```javascript
const pineconeService = new PineconeService();
await pineconeService.createIndex({
  cloud: 'gcp',
  region: 'us-central1',
  dimension: 3072, // For text-embedding-3-large
  metric: 'cosine',
  waitUntilReady: true
});
```

### Recommended Index Settings

- **Dimension**: 3072 (for OpenAI text-embedding-3-large)
- **Metric**: cosine
- **Cloud**: gcp
- **Region**: us-central1 (Iowa) or europe-west4 (Netherlands)
- **Type**: Serverless (for cost efficiency)

## Usage Examples

### Basic Vector Storage

```javascript
const { ModernVectorStorageManager } = require('./vector/ModernVectorStorageManager');
const { OpenAIEmbeddings } = require('@langchain/openai');

const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-large',
  apiKey: process.env.OPENAI_API_KEY
});

const storageManager = new ModernVectorStorageManager({
  embeddings
});

// Store documents
const documents = [
  {
    pageContent: 'Your document content here',
    metadata: {
      source: 'document.md',
      fileType: 'markdown'
    }
  }
];

const result = await storageManager.storeToPinecone(
  documents,
  'user-namespace',
  'github-owner',
  'repo-name'
);
```

### Vector Search

```javascript
const { ModernVectorSearchOrchestrator } = require('./search/ModernVectorSearchOrchestrator');

const searchOrchestrator = new ModernVectorSearchOrchestrator({
  embeddings
});

// Semantic search
const results = await searchOrchestrator.searchSimilar(
  'Find documents about user authentication',
  {
    namespace: 'user-123',
    topK: 10,
    threshold: 0.7
  }
);

// Advanced search with multiple strategies
const advancedResults = await searchOrchestrator.advancedSearch(
  'authentication security patterns',
  {
    namespace: 'user-123',
    strategies: ['semantic', 'keyword'],
    combineResults: true
  }
);
```

### Repository-Specific Search

```javascript
// Search within a specific repository
const repoResults = await searchOrchestrator.searchInRepository(
  'user service implementation',
  'user-123',
  'my-repo-id',
  {
    fileTypes: ['javascript', 'typescript'],
    semanticRoles: ['service', 'controller'],
    topK: 5
  }
);
```

## Migration from Old Implementation

### Key Changes

1. **Import Changes**:
   ```javascript
   // OLD
   const { Pinecone } = require('@pinecone-database/pinecone');
   const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
   
   // NEW
   const PineconeService = require('./pinecone/PineconeService');
   const pineconeService = new PineconeService();
   ```

2. **Index Access**:
   ```javascript
   // OLD
   const index = pinecone.Index(indexName);
   
   // NEW
   const index = await pineconeService.connect();
   ```

3. **Vector Store Creation**:
   ```javascript
   // OLD
   const vectorStore = new PineconeStore(embeddings, {
     pineconeIndex: pinecone.Index(indexName),
     namespace: userId
   });
   
   // NEW
   const vectorStore = await pineconeService.createVectorStore(embeddings, userId);
   ```

### setUserId Method Changes

The `setUserId` method is now async:

```javascript
// OLD
aiAdapter.setUserId(userId);

// NEW
await aiAdapter.setUserId(userId);
```

Update all calls to `setUserId` to use `await`.

## Error Handling

The new implementation provides better error handling:

```javascript
try {
  const result = await storageManager.storeToPinecone(documents, namespace, owner, repo);
  console.log(`Stored ${result.chunksStored} documents`);
} catch (error) {
  if (error.message.includes('connection')) {
    // Handle connection errors
    console.error('Pinecone connection failed:', error.message);
  } else if (error.message.includes('rate limit')) {
    // Handle rate limiting
    console.error('Rate limit exceeded, retrying...');
  } else {
    // Handle other errors
    console.error('Storage failed:', error.message);
  }
}
```

## Performance Optimization

### Rate Limiting

The new implementation includes built-in rate limiting:

```javascript
const Bottleneck = require('bottleneck');

const rateLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 1000 // 1 second between requests
});

const storageManager = new ModernVectorStorageManager({
  embeddings,
  rateLimiter
});
```

### Batch Processing

Large document sets are automatically processed in batches:

```javascript
const result = await storageManager.storeToPinecone(documents, namespace, owner, repo);
// Automatically handles batching based on document count
```

## Testing

### Run Integration Tests

```bash
# Test the new Pinecone implementation
node test_modern_pinecone.js
```

### Environment for Testing

Create a test environment with:
```bash
PINECONE_API_KEY=your_test_api_key
PINECONE_INDEX_NAME=test-index
OPENAI_API_KEY=your_openai_key
NODE_ENV=development
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**:
   - Check your PINECONE_API_KEY is valid
   - Verify network connectivity
   - Ensure index exists in your Pinecone environment

2. **Index Not Found**:
   - Verify PINECONE_INDEX_NAME matches your actual index
   - Check if index exists in Pinecone dashboard
   - Use `createIndex()` method to create if needed

3. **Rate Limiting**:
   - Implement rate limiting with Bottleneck
   - Reduce batch sizes
   - Add delays between operations

4. **Memory Issues**:
   - Process documents in smaller batches
   - Monitor memory usage during large operations
   - Use streaming for very large datasets

### Debug Logging

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed logs for:
- Connection attempts
- Index operations
- Search queries
- Error details

## Best Practices

1. **Use Namespaces**: Always use namespaces to isolate user data
2. **Batch Operations**: Process documents in reasonable batch sizes (50-100)
3. **Error Handling**: Implement proper try-catch blocks
4. **Rate Limiting**: Use rate limiting for production environments
5. **Monitoring**: Monitor index stats and performance
6. **Cleanup**: Clean up test data and unused namespaces

## Performance Monitoring

### Index Statistics

```javascript
const stats = await pineconeService.getIndexStats();
console.log(`Total vectors: ${stats.totalVectorCount}`);
console.log(`Namespaces: ${Object.keys(stats.namespaces || {}).length}`);
```

### Namespace Management

```javascript
// List all namespaces
const namespaces = await pineconeService.listNamespaces();

// Get specific namespace stats
const nsStats = await pineconeService.getNamespaceStats('user-123');
```

This modern implementation provides a robust, scalable foundation for vector operations in EventStorm.