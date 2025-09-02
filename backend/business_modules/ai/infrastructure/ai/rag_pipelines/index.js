// rag_pipelines/index.js - Main exports for RAG pipelines
"use strict";

const DataPreparationPipeline = require('./data_preparation/DataPreparationPipeline');
const QueryPipeline = require('./query/QueryPipeline');
const VectorSearchStrategy = require('./query/VectorSearchStrategy');

// Export main pipeline classes
module.exports = {
  DataPreparationPipeline,
  QueryPipeline,
  VectorSearchStrategy,
  
  // For backward compatibility
  DataPipeline: DataPreparationPipeline,
  
  // Export specialized processors for advanced usage
  processors: {
    SemanticPreprocessor: require('./data_preparation/processors/SemanticPreprocessor'),
    ASTCodeSplitter: require('./data_preparation/processors/ASTCodeSplitter'),
    UbiquitousLanguageProcessor: require('./data_preparation/processors/UbiquitousLanguageProcessor'),
    RepositoryManager: require('./data_preparation/processors/RepositoryManager'),
    VectorStorageManager: require('./data_preparation/processors/VectorStorageManager'),
    ApiSpecProcessor: require('./data_preparation/processors/ApiSpecProcessor'),
    MarkdownDocumentationProcessor: require('./data_preparation/processors/MarkdownDocumentationProcessor'),
    RepositoryProcessor: require('./data_preparation/processors/RepositoryProcessor'),
    DocumentProcessor: require('./data_preparation/processors/DocumentProcessor'),
    OptimizedRepositoryProcessor: require('./data_preparation/processors/OptimizedRepositoryProcessor')
  }
};
