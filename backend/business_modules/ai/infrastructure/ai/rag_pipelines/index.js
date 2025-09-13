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
  ASTCodeSplitter: require('./data_preparation/processors/aSTCodeSplitter'),
  EnhancedASTCodeSplitter: require('./data_preparation/processors/EnhancedASTCodeSplitter'),
  ContentAwareSplitterRouter: require('./data_preparation/processors/ContentAwareSplitterRouter'),
  UbiquitousLanguageProcessor: require('./data_preparation/processors/ubiquitousLanguageProcessor'),
  RepositoryManager: require('./data_preparation/processors/repositoryManager'),
  VectorStorageManager: require('./data_preparation/processors/vectorStorageManager'),
  ApiSpecProcessor: require('./data_preparation/processors/apiSpecProcessor'),
  MarkdownDocumentationProcessor: require('./data_preparation/processors/markdownDocumentationProcessor'),
  RepositoryProcessor: require('./data_preparation/processors/repositoryProcessor'),
  DocumentProcessor: require('./data_preparation/processors/documentProcessor'),
  OptimizedRepositoryProcessor: require('./data_preparation/processors/optimizedRepositoryProcessor')
  }
};
