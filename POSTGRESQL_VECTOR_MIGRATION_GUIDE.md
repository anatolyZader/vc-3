# Pinecone to PostgreSQL pgvector Migration Guide

This document explains the migration from Pinecone to PostgreSQL pgvector for vector storage and similarity search.

## 📋 Migration Overview

The codebase now supports both PostgreSQL pgvector and Pinecone for vector operations, with PostgreSQL as the default. This provides:

- ✅ **Better cost control** - No external vector database costs
- ✅ **Simplified architecture** - One database for all data
- ✅ **Improved performance** - Native SQL queries with vector filtering
- ✅ **Data ownership** - Complete control over vector data
- ✅ **Easier deployment** - No external dependencies

## 🔧 Configuration

### Environment Variables

Set `USE_POSTGRESQL_VECTORS=true` in your `.env` file to use PostgreSQL (default):

```env
# Vector Database Configuration
USE_POSTGRESQL_VECTORS=true  # Use PostgreSQL pgvector (default)
# USE_POSTGRESQL_VECTORS=false  # Use Pinecone fallback
```

### Database Setup

1. **Install pgvector extension** (already configured):
   ```sql
   CREATE EXTENSION IF NOT EXISTS "vector";
   ```

2. **Restart PostgreSQL container** if needed:
   ```bash
   docker-compose down postgres
   docker-compose up -d postgres
   ```

## 🚀 Migration Process

### Automatic Migration

The system automatically defaults to PostgreSQL pgvector. No manual migration is required for new data.

### Migrate Existing Pinecone Data

If you have existing data in Pinecone, use the migration script:

```bash
# Migrate all namespaces
node scripts/migrate-pinecone-to-postgresql.js

# Migrate specific namespaces
node scripts/migrate-pinecone-to-postgresql.js namespace1 namespace2
```

The script will:
1. Connect to both Pinecone and PostgreSQL
2. Fetch all vectors from Pinecone namespaces
3. Store them in PostgreSQL collections
4. Create HNSW indexes for performance
5. Verify the migration

## 📊 Performance Optimization

### HNSW Indexes

PostgreSQL pgvector supports HNSW (Hierarchical Navigable Small World) indexes for fast similarity search:

```javascript
// Automatically created during migration
await pgVectorService.createHnswIndex(embeddings, {
  dimensions: 1536,  // OpenAI text-embedding-3-small
  m: 16,            // Max connections per layer
  efConstruction: 64 // Build quality
});
```

### Query Performance

HNSW indexes provide:
- **Sub-linear search time** vs linear scan
- **Configurable trade-offs** between speed and accuracy
- **Memory efficient** storage

## 🔄 API Compatibility

### Service Layer

Both services implement the same interface:

```javascript
// Works with both PostgreSQL and Pinecone
const result = await vectorService.upsertDocuments(documents, embeddings, {
  namespace: 'my-namespace',
  ids: documentIds
});

const searchResults = await vectorService.querySimilar(queryEmbedding, {
  namespace: 'my-namespace',
  topK: 10,
  filter: { source: 'file.js' }
});
```

### Backward Compatibility

Legacy Pinecone methods are still supported:

```javascript
// Legacy method (deprecated but working)
await embeddingManager.storeToPinecone(documents, namespace, owner, repo);

// New method (preferred)
await embeddingManager.storeToVectorDB(documents, namespace, owner, repo);
```

## 🗃️ Data Structure

### PostgreSQL Schema

```sql
-- Main embeddings table
CREATE TABLE langchain_pg_embedding (
  uuid UUID PRIMARY KEY,
  embedding VECTOR(1536),
  document TEXT,
  cmetadata JSONB
);

-- Collection management
CREATE TABLE langchain_pg_collection (
  uuid UUID PRIMARY KEY,
  name VARCHAR NOT NULL
);

-- HNSW index for fast similarity search
CREATE INDEX CONCURRENTLY langchain_pg_embedding_embedding_idx 
ON langchain_pg_embedding USING hnsw (embedding vector_cosine_ops);
```

### Metadata Structure

Metadata is stored as JSONB for flexible querying:

```json
{
  "source": "src/components/Button.js",
  "contentHash": "abc123",
  "chunkIndex": 0,
  "version": 1698765432000,
  "collection": "user-123_repo-456",
  "migrated_at": "2024-01-01T00:00:00Z",
  "pinecone_id": "original-pinecone-id"
}
```

## 🔍 Querying Examples

### Basic Similarity Search

```javascript
const results = await vectorStore.similaritySearch("async function", 5);
```

### Advanced Filtering

```javascript
const results = await vectorStore.similaritySearchWithScore(
  queryVector,
  10,
  {
    source: { $regex: ".*\\.js$" },  // JavaScript files only
    contentHash: { $exists: true }    // Must have content hash
  }
);
```

### SQL-based Filtering

```sql
-- Direct SQL access for complex queries
SELECT uuid, document, cmetadata, 
       embedding <=> $1 as similarity
FROM langchain_pg_embedding 
WHERE cmetadata->>'source' LIKE '%.js'
  AND cmetadata->>'collection' = 'my-namespace'
ORDER BY embedding <=> $1 
LIMIT 10;
```

## 🛠️ Troubleshooting

### Common Issues

1. **pgvector extension not found**
   ```
   ERROR: extension "vector" does not exist
   ```
   **Solution**: Restart PostgreSQL container or install pgvector extension manually.

2. **Dimension mismatch**
   ```
   ERROR: vector dimension mismatch
   ```
   **Solution**: Ensure embedding dimensions match the vector column (1536 for text-embedding-3-small).

3. **Performance issues**
   ```
   Slow similarity search
   ```
   **Solution**: Create HNSW indexes using the provided script.

### Debug Commands

```bash
# Check pgvector extension
docker exec -it postgres-container psql -U postgres -d eventstorm_db -c "SELECT * FROM pg_extension WHERE extname='vector';"

# Check vector tables
docker exec -it postgres-container psql -U postgres -d eventstorm_db -c "\\dt langchain_pg_*"

# Check vector count
docker exec -it postgres-container psql -U postgres -d eventstorm_db -c "SELECT count(*) FROM langchain_pg_embedding;"
```

## 📈 Benefits Summary

| Feature | Pinecone | PostgreSQL pgvector |
|---------|----------|---------------------|
| **Cost** | $70+/month | $0 (included) |
| **Latency** | Network dependent | Local database |
| **Scalability** | Auto-scaling | Manual scaling |
| **Flexibility** | Vector-only | Full SQL + vectors |
| **Data control** | External | Complete control |
| **Deployment** | External dependency | Self-contained |
| **Backup** | Pinecone-managed | Standard PostgreSQL |

## 🚢 Deployment

### Docker Compose

No changes needed - PostgreSQL container already configured:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: eventstorm_db
      POSTGRES_USER: eventstorm_user
      POSTGRES_PASSWORD: local_dev_password
```

### Production Considerations

1. **Resource allocation**: Increase PostgreSQL memory for vector operations
2. **Index maintenance**: Monitor HNSW index performance
3. **Backup strategy**: Include vector data in PostgreSQL backups
4. **Monitoring**: Track vector search performance metrics

## 🔄 Rollback Plan

To rollback to Pinecone if needed:

1. Set `USE_POSTGRESQL_VECTORS=false` in environment
2. Ensure Pinecone credentials are configured
3. Restart the application
4. Data will automatically route to Pinecone

The system maintains backward compatibility during the transition period.