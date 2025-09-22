// rag_pipelines/index.js - Main exports for RAG pipelines
"use strict";

const DataPreparationPipeline = require('./data_preparation/dataPreparationPipeline');
const QueryPipeline = require('./query/queryPipeline');
const VectorSearchStrategy = require('./query/vectorSearchStrategy');

// Export main pipeline classes
module.exports = {
  DataPreparationPipeline,
  QueryPipeline,
  VectorSearchStrategy,
  
  // For backward compatibility
  DataPipeline: DataPreparationPipeline,
  
  // Export specialized processors for advanced usage
  processors: {
  SemanticPreprocessor: require('./data_preparation/processors/semanticPreprocessor'),
  ASTCodeSplitter: require('./context/processors/astCodeSplitter'),
  ContentAwareSplitterRouter: require('./context/processors/contentAwareSplitterRouter'), // REFACTORED: Now provides specialized splitting methods only
  UbiquitousLanguageEnhancer: require('./data_preparation/processors/ubiquitousLanguageEnhancer'),
  RepositoryManager: require('./data_preparation/processors/repositoryManager'),
  EmbeddingManager: require('./data_preparation/processors/embeddingManager'),
  ApiSpecProcessor: require('./data_preparation/processors/apiSpecProcessor'),
  DocsProcessor: require('./data_preparation/processors/markdownDocumentationProcessor'),
  OptimizedRepositoryProcessor: require('./data_preparation/processors/optimizedRepositoryProcessor')
  }
};
