# Synchronized Chunking Strategy for Hybrid Search

## Problem Statement

Currently, we have **two disconnected systems**:

1. **Pinecone (Vector DB)**: 
   - Stores AST-chunked code (functions, classes, semantic units)
   - Rich metadata: semantic_tags, ubiquitous_language, domain_concepts
   - Small chunks: 300-2000 characters
   - Excellent for semantic similarity search

2. **PostgreSQL (Full-Text Search)**:
   - Stores FULL FILES (no chunking)
   - Basic metadata: file_path, extension, user_id, repo_id
   - Large documents: entire file content
   - Good for keyword/filename search

**Result**: Mismatched granularity, lost metadata, poor hybrid search integration.

---

## Recommended Solution: Synchronized Chunking

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  REPOSITORY PROCESSING                        │
│                  (ContextPipeline)                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│            STEP 1: AST Code Splitting                        │
│  - Parse code into semantic chunks (functions, classes)      │
│  - Extract metadata (semantic tags, ubiquitous language)     │
│  - Chunk size: 500-2000 characters                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│            STEP 2: Semantic Enhancement                      │
│  - Add domain concepts, bounded context                      │
│  - Extract function/class names                              │
│  - Ubiquitous language detection                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────────────────┐
                              ▼                                 ▼
                ┌─────────────────────────┐     ┌──────────────────────┐
                │  PINECONE STORAGE       │     │  POSTGRES STORAGE    │
                │  (Vector Embeddings)    │     │  (Full-Text Search)  │
                └─────────────────────────┘     └──────────────────────┘
                              │                                 │
                              ▼                                 ▼
                ┌─────────────────────────┐     ┌──────────────────────┐
                │  Store with:            │     │  Store with:         │
                │  - Embeddings           │     │  - Same chunks       │
                │  - All metadata         │     │  - Same metadata     │
                │  - Namespace            │     │  - ts_vector index   │
                └─────────────────────────┘     │  - JSONB metadata    │
                                                └──────────────────────┘
```

---

## Database Schema Enhancement

### Current `repo_data` Table:
```sql
CREATE TABLE repo_data (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  repo_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_extension TEXT,
  content TEXT,
  content_vector tsvector,
  language TEXT DEFAULT 'english',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, repo_id, file_path)
);
```

### **ENHANCED Schema (with chunking support):**
```sql
CREATE TABLE repo_data (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  repo_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_extension TEXT,
  
  -- CHUNKING SUPPORT
  chunk_index INTEGER DEFAULT 0,  -- Which chunk of the file (0 for full file)
  chunk_content TEXT,             -- Actual chunk content
  chunk_tokens INTEGER,           -- Token count for this chunk
  
  -- SEMANTIC METADATA (matches Pinecone)
  metadata JSONB,                 -- Store all rich metadata
  /*
    Example metadata structure:
    {
      "semantic_tags": ["authentication", "user-management"],
      "ubiquitous_language": ["User", "Session", "Token"],
      "domain_concepts": ["bounded-context:auth"],
      "function_names": ["authenticateUser", "validateToken"],
      "class_names": ["AuthService"],
      "type": "github-code",
      "branch": "main",
      "commit_sha": "abc123..."
    }
  */
  
  -- FULL-TEXT SEARCH
  content_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(file_path, '') || ' ' || 
      COALESCE(chunk_content, '') || ' ' ||
      COALESCE(metadata->>'semantic_tags'::text, '') || ' ' ||
      COALESCE(metadata->>'ubiquitous_language'::text, '')
    )
  ) STORED,
  
  language TEXT DEFAULT 'english',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- UNIQUE constraint on chunk level
  UNIQUE(user_id, repo_id, file_path, chunk_index)
);

-- Indexes
CREATE INDEX idx_repo_data_content_vector ON repo_data USING GIN(content_vector);
CREATE INDEX idx_repo_data_user_repo ON repo_data(user_id, repo_id);
CREATE INDEX idx_repo_data_metadata ON repo_data USING GIN(metadata);
CREATE INDEX idx_repo_data_file_path ON repo_data(file_path);
```

---

## Implementation Steps

### 1. Modify `contextPipeline.js` to Store Chunks to Both Systems

```javascript
// After Step 4: Split documents with intelligent routing
const splitDocuments = await this.repoProcessor.intelligentSplitDocuments(
  processedDocuments, 
  this.routeDocumentsToProcessors?.bind(this)
);

// Step 5: Store to Pinecone (existing)
await this.embeddingManager.storeToPinecone(
  splitDocuments, 
  namespace, 
  githubOwner, 
  repoName
);

// Step 5.5: STORE SAME CHUNKS TO POSTGRES (new)
if (this.textSearchService) {
  console.log(`[${new Date().toISOString()}] 📊 Storing ${splitDocuments.length} chunks to PostgreSQL for FTS`);
  
  await this.textSearchService.storeChunks(
    splitDocuments,
    userId,
    repoId,
    {
      includeMetadata: true,  // Store ALL metadata from Pinecone
      useChunking: true       // Store as individual chunks
    }
  );
  
  console.log(`[${new Date().toISOString()}] ✅ PostgreSQL storage complete`);
}
```

### 2. Enhance `textSearchService.js` to Support Chunked Storage

```javascript
/**
 * Store document chunks with full metadata (matching Pinecone structure)
 * @param {Array} chunks - Array of document chunks with pageContent and metadata
 * @param {string} userId - User identifier
 * @param {string} repoId - Repository identifier
 * @param {object} options - Storage options
 */
async storeChunks(chunks, userId, repoId, options = {}) {
  const client = await this.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let storedCount = 0;
    
    for (const chunk of chunks) {
      const filePath = chunk.metadata?.source || chunk.metadata?.filePath || 'unknown';
      const chunkIndex = chunk.metadata?.chunkIndex || 0;
      const fileExtension = this.extractFileExtension(filePath);
      
      // Extract rich metadata
      const metadata = {
        semantic_tags: chunk.metadata?.semantic_tags || [],
        ubiquitous_language: chunk.metadata?.ubiquitous_language || [],
        domain_concepts: chunk.metadata?.domain_concepts || [],
        function_names: chunk.metadata?.function_names || [],
        class_names: chunk.metadata?.class_names || [],
        type: chunk.metadata?.type || 'github-code',
        branch: chunk.metadata?.branch || 'main',
        commit_sha: chunk.metadata?.commit_sha || null,
        processed_at: chunk.metadata?.processedAt || new Date().toISOString(),
        chunk_tokens: chunk.metadata?.chunkTokens || null
      };
      
      const insertQuery = `
        INSERT INTO repo_data (
          user_id, 
          repo_id, 
          file_path, 
          file_extension,
          chunk_index,
          chunk_content,
          chunk_tokens,
          metadata,
          language
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id, repo_id, file_path, chunk_index) 
        DO UPDATE SET
          chunk_content = EXCLUDED.chunk_content,
          chunk_tokens = EXCLUDED.chunk_tokens,
          metadata = EXCLUDED.metadata,
          updated_at = CURRENT_TIMESTAMP;
      `;
      
      await client.query(insertQuery, [
        userId,
        repoId,
        filePath,
        fileExtension,
        chunkIndex,
        chunk.pageContent,
        metadata.chunk_tokens,
        JSON.stringify(metadata),
        'english'
      ]);
      
      storedCount++;
    }
    
    await client.query('COMMIT');
    
    this.logger.info(`✅ Stored ${storedCount} chunks to PostgreSQL`);
    
    return {
      success: true,
      chunksStored: storedCount
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    this.logger.error(`❌ Failed to store chunks to PostgreSQL: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}
```

### 3. Update Search to Use Chunked Data

```javascript
/**
 * Search with semantic metadata support
 */
async searchDocuments(searchQuery, options = {}) {
  const { userId, repoId, limit = 10, offset = 0 } = options;
  
  // Build search query that includes semantic metadata
  let query = `
    SELECT 
      id,
      user_id,
      repo_id,
      file_path,
      file_extension,
      chunk_index,
      chunk_content,
      metadata,
      ts_rank(
        content_vector, 
        plainto_tsquery('english', $1)
      ) AS rank,
      ts_headline(
        'english', 
        chunk_content, 
        plainto_tsquery('english', $1),
        'MaxWords=30'
      ) AS snippet
    FROM repo_data
    WHERE content_vector @@ plainto_tsquery('english', $1)
  `;
  
  const queryParams = [searchQuery];
  let paramIndex = 1;
  
  // Add filters
  if (userId) {
    paramIndex++;
    query += ` AND user_id = $${paramIndex}`;
    queryParams.push(userId);
  }
  
  if (repoId) {
    paramIndex++;
    query += ` AND repo_id = $${paramIndex}`;
    queryParams.push(repoId);
  }
  
  // Order by rank and limit
  query += ` ORDER BY rank DESC, chunk_index ASC`;
  
  paramIndex++;
  query += ` LIMIT $${paramIndex}`;
  queryParams.push(limit);
  
  paramIndex++;
  query += ` OFFSET $${paramIndex}`;
  queryParams.push(offset);
  
  const result = await this.pool.query(query, queryParams);
  
  // Format results with rich metadata
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    repoId: row.repo_id,
    filePath: row.file_path,
    fileExtension: row.file_extension,
    chunkIndex: row.chunk_index,
    content: row.chunk_content,
    rank: parseFloat(row.rank),
    snippet: row.snippet,
    // Include all semantic metadata
    semanticTags: row.metadata?.semantic_tags || [],
    ubiquitousLanguage: row.metadata?.ubiquitous_language || [],
    domainConcepts: row.metadata?.domain_concepts || [],
    functionNames: row.metadata?.function_names || [],
    classNames: row.metadata?.class_names || [],
    type: row.metadata?.type,
    branch: row.metadata?.branch,
    searchType: 'text_semantic',
    source: 'postgres'
  }));
}
```

---

## Benefits of Synchronized Chunking

### ✅ **Advantages:**

1. **Consistent Granularity**: Both vector and text search return similar-sized chunks
2. **Rich Metadata Everywhere**: Semantic tags available in both systems
3. **Better Hybrid Search**: Combine results intelligently with comparable chunk sizes
4. **Improved Ranking**: Text search can rank by semantic relevance
5. **Faster Queries**: Smaller chunks = faster PostgreSQL queries
6. **Better Debugging**: Same chunks in logs from both sources
7. **Scalability**: PostgreSQL handles millions of chunks efficiently

### ⚠️ **Trade-offs:**

1. **More Storage**: Chunks duplicated in both Pinecone and Postgres
2. **Complexity**: Need to keep both systems synchronized
3. **Migration Effort**: Need to re-index existing data

---

## Migration Plan

### Phase 1: Schema Update
```bash
# Run migration to add new columns
node migrate_add_chunking_support.js
```

### Phase 2: Re-index Repositories
```bash
# Trigger re-processing of existing repositories
# This will:
# 1. Load existing Pinecone data
# 2. Store chunks to new PostgreSQL schema
node migrate_sync_pinecone_to_postgres.js
```

### Phase 3: Update Pipeline
```bash
# Deploy updated contextPipeline with dual storage
git commit -m "feat: synchronized chunking for hybrid search"
git push origin main
```

---

## Alternative: Hybrid Approach (If Migration is Too Heavy)

If full re-indexing is not feasible, you can use a **hybrid approach**:

1. **Keep full files in PostgreSQL** (for quick filename lookup)
2. **Add a separate `repo_chunks` table** for chunked data
3. **Use PostgreSQL for filename matching only**
4. **Use Pinecone for all semantic search**

This minimizes migration but loses some benefits of semantic text search.

---

## Conclusion

**Recommended**: **Synchronized chunking** with mirrored storage in both Pinecone and PostgreSQL.

This gives you:
- Fast filename search (PostgreSQL ILIKE)
- Semantic search (Pinecone embeddings)
- Keyword search with context (PostgreSQL full-text on chunks)
- Rich metadata in both systems
- Consistent debugging and logging

The extra storage cost is minimal compared to the UX and performance improvements.
