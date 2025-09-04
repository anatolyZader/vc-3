# QueryPipeline Modular Architecture

This document describes the refactored QueryPipeline architecture that improves modularity, maintainability, and separation of concerns.

## Overview

The QueryPipeline has been refactored from a monolithic class into a modular architecture using specialized utility classes. This improves code organization, testability, and maintainability while preserving all existing functionality.

## Architecture Components

### 1. LoggingManager (`utils/LoggingManager.js`)

**Purpose**: Provides structured logging with configurable levels for the entire RAG pipeline.

**Features**:
- Configurable log levels (DEBUG, INFO, WARN, ERROR)
- Formatted messages with timestamps and component information
- Specialized logging methods for RAG operations
- Environment variable configuration support

**Usage**:
```javascript
const logger = new LoggingManager({ 
  component: 'QueryPipeline',
  level: 'INFO' 
});
logger.info('Processing started', { userId: 'user123' });
logger.vectorSearch('Search completed', { documentsFound: 5 });
```

**Configuration**:
- Set `RAG_LOG_LEVEL` environment variable to control logging level
- Supported levels: DEBUG, INFO, WARN, ERROR

### 2. VectorSearchManager (`utils/VectorSearchManager.js`)

**Purpose**: Handles all vector search operations with intelligent strategies and fallbacks.

**Features**:
- Intelligent search strategy determination
- Parallel searches across user and core namespaces
- Graceful error handling with filter fallbacks
- Configurable timeout handling
- Comprehensive search result analysis

**Key Methods**:
- `performIntelligentSearch()` - Main search orchestration
- `analyzeSearchStrategy()` - Determines optimal search approach
- `executeParallelSearches()` - Runs searches in parallel
- `processSearchResults()` - Analyzes and logs results

### 3. ContextAnalyzer (`utils/ContextAnalyzer.js`)

**Purpose**: Analyzes retrieved documents and formats them into structured context.

**Features**:
- Source composition analysis (API specs, documentation, code)
- Intelligent content truncation based on document type
- Structured context formatting with section headers
- Module and repository usage tracking
- Configurable content length limits

**Key Methods**:
- `analyzeAndFormatContext()` - Main context processing
- `analyzeSourceComposition()` - Categorizes document sources
- `formatDocumentsContext()` - Creates structured context string
- `extractModuleDocumentation()` - Identifies module usage

### 4. ResponseManager (`utils/ResponseManager.js`)

**Purpose**: Handles LLM response generation with intelligent prompting and retry logic.

**Features**:
- Intelligent question type analysis (general vs. application-specific)
- Context-aware prompt selection
- Conversation history formatting
- Rate limiting and retry logic
- Both RAG and standard response generation

**Key Methods**:
- `generateLLMResponse()` - Main response generation
- `analyzeQuestionType()` - Determines question category
- `generateResponseWithRetry()` - Handles rate limiting
- `generateStandardResponse()` - Non-RAG responses

### 5. EventManager (`utils/EventManager.js`)

**Purpose**: Manages RAG status events for monitoring and observability.

**Features**:
- Structured event emission
- Configurable event enabling/disabling
- Specialized events for different pipeline stages
- Graceful handling of missing event bus

**Key Methods**:
- `emitRagStatus()` - General status events
- `emitRetrievalSuccess()` - Document retrieval events
- `emitProcessingError()` - Error events
- `emitProcessingCompleted()` - Completion events

## Refactored QueryPipeline

The main QueryPipeline class now acts as a coordinator that delegates to specialized utility classes:

### Constructor Changes
```javascript
constructor(options = {}) {
  // ... existing properties
  
  // Initialize utility managers with proper dependencies
  this.logger = new LoggingManager({ 
    component: 'QueryPipeline',
    level: options.logLevel 
  });
  
  this.vectorSearchManager = new VectorSearchManager({
    embeddings: this.embeddings,
    pinecone: this.pinecone,
    timeout: options.searchTimeout
  });
  
  // ... other managers
}
```

### Method Delegation
All complex operations are now delegated to specialized managers:
- Vector search → `VectorSearchManager`
- Context analysis → `ContextAnalyzer`
- Response generation → `ResponseManager`
- Event emission → `EventManager`
- Logging → `LoggingManager`

## Benefits of Refactoring

### 1. **Separation of Concerns**
Each utility class has a single, well-defined responsibility, making the code easier to understand and maintain.

### 2. **Improved Testability**
Individual components can be tested in isolation, and dependencies can be easily mocked.

### 3. **Better Logging**
Structured logging with configurable levels replaces scattered console.log statements.

### 4. **Easier Maintenance**
Changes to specific functionality (e.g., vector search logic) are isolated to their respective utility classes.

### 5. **Enhanced Reusability**
Utility classes can be reused in other parts of the application or in different pipelines.

### 6. **Consistent Error Handling**
Centralized error handling patterns across all components.

## Configuration Options

The refactored QueryPipeline supports additional configuration options:

```javascript
const pipeline = new QueryPipeline({
  // Existing options
  vectorStore,
  pinecone,
  embeddings,
  llm,
  requestQueue,
  userId,
  eventBus,
  
  // New configuration options
  logLevel: 'DEBUG',                    // Logging level
  searchTimeout: 30000,                 // Vector search timeout
  enableEvents: true,                   // Enable/disable event emission
  maxContentLength: {                   // Content truncation limits
    documentation: 1000,
    code: 500,
    default: 500
  }
});
```

## Migration Guide

The refactored QueryPipeline maintains the same public API, so existing code should work without changes. However, you can now:

1. **Configure logging levels** using the `RAG_LOG_LEVEL` environment variable or constructor options
2. **Access individual utility managers** for testing or advanced use cases
3. **Customize behavior** through the expanded configuration options

## Testing

The refactored architecture includes comprehensive tests that validate:
- Modular component initialization
- Public API compatibility
- Error handling
- Configuration options
- Individual utility class functionality

Run tests with:
```bash
npm test -- --testPathPattern=QueryPipeline.test.js
```

## Performance Impact

The refactoring maintains the same performance characteristics while improving:
- **Memory usage**: Better object lifecycle management
- **Error recovery**: More graceful handling of failures
- **Observability**: Enhanced logging and event emission for monitoring

## Future Enhancements

The modular architecture enables future improvements:
- **Caching layers** in VectorSearchManager
- **Advanced context optimization** in ContextAnalyzer
- **Multiple LLM providers** in ResponseManager
- **Metrics collection** in EventManager
- **Distributed logging** in LoggingManager