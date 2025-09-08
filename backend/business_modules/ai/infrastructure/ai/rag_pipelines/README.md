# RAG Pipelines Architecture

This directory contains the modular RAG (Retrieval-Augmented Generation) pipeline architecture that follows Clean Architecture principles.

## Architecture Overview

The RAG system has been refactored into specialized pipeline classes:

```
aiLangchainAdapter.js (Coordinator)
    │
    ├── DataPreparationPipeline.js (Heavy Operations)
    │   ├── Repository cloning
    │   ├── Document loading and processing
    │   ├── Text chunking and splitting
    │   ├── Vector embedding generation
    │   ├── Pinecone vector storage
    │   └── Core documentation indexing
    │
    └── QueryPipeline.js (Lightweight Operations)
        ├── Vector similarity search
        ├── Context retrieval and formatting
        ├── Conversation history integration
        ├── LLM response generation
        └── Fallback response handling
```

## Components

### 1. AILangchainAdapter (Coordinator)

The main coordinator class that:
- Manages shared dependencies (embeddings, Pinecone, LLM)
- Delegates heavy operations to DataPreparationPipeline
- Delegates query operations to QueryPipeline
- Maintains the original interface contract
- Handles rate limiting and request queueing

### 2. DataPreparationPipeline (Heavy Operations)

Handles the computationally expensive, one-time operations:

**Key Methods:**
- `processPushedRepo(userId, repoId, repoData)` - Main entry point
- `indexCoreDocsToPinecone()` - Index API spec and markdown docs
- `cloneRepository(url, branch)` - Git clone operations
- `loadAndProcessRepoDocuments()` - Document processing
- `cleanupTempDir()` - Temporary file cleanup

**Features:**
- Repository cloning with timeout protection
- Multi-format document loading (code, markdown, JSON)
- Smart text splitting based on file types
- Vector embedding generation
- Pinecone storage with proper namespacing
- Comprehensive error handling and cleanup

### 3. QueryPipeline (Lightweight Operations)

Handles fast, per-request operations:

**Key Methods:**
- `respondToPrompt(userId, conversationId, prompt, conversationHistory)` - Main entry point
- `generateResponseWithRetry(messages)` - LLM interaction with retry logic
- `generateStandardResponse()` - Fallback when vector search fails

**Features:**
- Vector similarity search with timeout protection
- Multi-namespace search (user-specific + core docs)
- Conversation history integration
- Contextual response generation
- Comprehensive fallback handling

## Data Flow

### Repository Processing (Data Preparation)
```
User pushes repo → AIService → AILangchainAdapter → DataPreparationPipeline
    │
    ├── Index core docs (API spec, markdown)
    ├── Clone repository
    ├── Load and process documents
    ├── Generate embeddings
    ├── Store in Pinecone (user namespace)
    └── Cleanup temporary files
```

### Query Processing (Lightweight)
```
User sends prompt → AIService → AILangchainAdapter → QueryPipeline
    │
    ├── Retrieve conversation history (from service layer)
    ├── Search vector database (user + core namespaces)
    ├── Format context from retrieved documents
    ├── Generate response with LLM
    └── Return structured response
```

## Clean Architecture Benefits

### Separation of Concerns
- **Data Preparation**: Heavy, one-time operations
- **Query Processing**: Fast, per-request operations  
- **Coordination**: Dependency management and interface compliance

### Dependency Management
- All external dependencies (Pinecone, LLM, embeddings) managed by coordinator
- Pipelines receive dependencies via dependency injection
- Clean interfaces between components

### Testability
- Each pipeline can be tested independently
- Mock dependencies can be easily injected
- Clear separation of business logic

### Scalability
- Heavy operations can be moved to background workers
- Query operations remain fast and responsive
- Independent scaling of different operations

## Configuration

### Environment Variables
```bash
# Required for vector operations
PINECONE_API_KEY=your_key
PINECONE_INDEX_NAME=your_index
OPENAI_API_KEY=your_key

# Optional
PINECONE_ENVIRONMENT=your_env
```

### Pipeline Options
```javascript
// DataPreparationPipeline options
{
  embeddings: OpenAIEmbeddings,
  pinecone: PineconeClient,
  eventBus: EventEmitter,
  pineconeLimiter: Bottleneck
}

// QueryPipeline options
{
  embeddings: OpenAIEmbeddings,
  pinecone: PineconeClient,
  llm: ChatOpenAI,
  eventBus: EventEmitter,
  maxRetries: 10
}
```

## Error Handling

### Graceful Degradation
- Vector search failures fall back to standard responses
- Missing conversation history is handled gracefully
- Network timeouts don't break the system

### Comprehensive Logging
- All operations are logged with timestamps
- Error details are captured for debugging
- Status updates are emitted via event bus

### Rate Limiting
- Built-in rate limiting for LLM calls
- Exponential backoff for retries
- Queue system prevents overwhelming external APIs

## Usage Examples

### Processing a Repository
```javascript
const result = await aiAdapter.processPushedRepo(userId, repoId, {
  url: 'https://github.com/user/repo.git',
  branch: 'main'
});
```

### Querying with History
```javascript
const response = await aiAdapter.respondToPrompt(
  userId, 
  conversationId, 
  prompt,
  conversationHistory
);
```

## Monitoring and Debugging

### Event Bus Integration
Both pipelines emit status updates:
- `processing_started`
- `processing_completed` 
- `processing_error`
- `retrieval_success`
- `retrieval_error`
- `retrieval_timeout_fallback`

### Debug Logging
Set `DEBUG=rag:*` for verbose pipeline logging.

## Future Enhancements

### Planned Improvements
1. **Background Processing**: Move DataPreparationPipeline to worker queues
2. **Caching**: Add Redis caching for frequently accessed documents
3. **Metrics**: Add detailed performance metrics and monitoring
4. **Multi-Model Support**: Support for multiple LLM providers
5. **Advanced Chunking**: Semantic chunking strategies
6. **Vector Search Optimization**: Hybrid search combining vector and keyword search

### Extension Points
- Custom document loaders
- Custom text splitters
- Custom embedding models
- Custom retrieval strategies
