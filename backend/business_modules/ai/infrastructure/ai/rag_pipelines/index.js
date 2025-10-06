// rag_pipelines/index.js - Main exports for RAG pipelines
"use strict";

const ContextPipeline = require('./context/contextPipeline');
const QueryPipeline = require('./query/queryPipeline');
const VectorSearchStrategy = require('./query/vectorSearchStrategy');

// Export main pipeline classes
module.exports = {
  ContextPipeline,
  QueryPipeline,
  VectorSearchStrategy,
  
  // For backward compatibility
  DataPipeline: ContextPipeline,
  
  // Export specialized processors for advanced usage
  processors: {
  SemanticPreprocessor: require('./context/semanticPreprocessor'),
  ASTCodeSplitter: require('./context/processors_by_doc_type/astCodeSplitter'),
  ContentAwareSplitterRouter: require('./context/processors/contentAwareSplitterRouter'), // REFACTORED: Now provides specialized splitting methods only
  UbiquitousLanguageEnhancer: require('./context/ubiquitousLanguageEnhancer'),
  EmbeddingManager: require('./context/embeddingManager'), // REFACTORED: Now uses centralized PineconeService
  ApiSpecProcessor: require('./context/processors/docsProcessor'),
  DocsProcessor: require('./context/processors/docsProcessor'),
  OptimizedRepositoryProcessor: require('./context/repoProcessor')
  }
};
