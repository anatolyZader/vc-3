// comprehensive_structure_test.js - Final verification of new directory structure
"use strict";

console.log("=== COMPREHENSIVE STRUCTURE TEST ===");
console.log("Testing all imports with the new organized directory structure...\n");

// Test 1: Main pipeline imports from adapter level
try {
  console.log("1. Testing main pipeline imports from adapter level...");
  const DataPreparationPipeline = require('./rag_pipelines/data_preparation/DataPreparationPipeline');
  const QueryPipeline = require('./rag_pipelines/query/QueryPipeline');
  console.log("✅ Main pipelines imported successfully");
  
  // Test instantiation
  const dataPipeline = new DataPreparationPipeline();
  console.log("✅ DataPreparationPipeline instantiated successfully");
} catch (error) {
  console.error("❌ Main pipeline test failed:", error.message);
}

// Test 2: Index.js exports
try {
  console.log("\n2. Testing index.js exports...");
  const ragPipelines = require('./rag_pipelines');
  console.log(`✅ Index exports available:`, Object.keys(ragPipelines));
  console.log(`✅ Processors available: ${Object.keys(ragPipelines.processors).length}`);
} catch (error) {
  console.error("❌ Index exports test failed:", error.message);
}

// Test 3: Individual processor imports
try {
  console.log("\n3. Testing individual processor imports...");
  const SemanticPreprocessor = require('./rag_pipelines/data_preparation/processors/SemanticPreprocessor');
  const ASTCodeSplitter = require('./rag_pipelines/data_preparation/processors/ASTCodeSplitter');
  const RepositoryManager = require('./rag_pipelines/data_preparation/processors/RepositoryManager');
  const UbiquitousLanguageProcessor = require('./rag_pipelines/data_preparation/processors/UbiquitousLanguageProcessor');
  
  // Test instantiation
  const semanticProcessor = new SemanticPreprocessor();
  const astSplitter = new ASTCodeSplitter();
  const repoManager = new RepositoryManager();
  const ubiqProcessor = new UbiquitousLanguageProcessor();
  
  console.log("✅ All core processors imported and instantiated successfully");
} catch (error) {
  console.error("❌ Processor imports test failed:", error.message);
}

// Test 4: Langchain imports in processors
try {
  console.log("\n4. Testing Langchain imports in processors...");
  const RepositoryProcessor = require('./rag_pipelines/data_preparation/processors/RepositoryProcessor');
  console.log("✅ RepositoryProcessor with Langchain imports working");
} catch (error) {
  console.error("❌ Langchain imports test failed:", error.message);
}

console.log("\n=== STRUCTURE VERIFICATION COMPLETE ===");
