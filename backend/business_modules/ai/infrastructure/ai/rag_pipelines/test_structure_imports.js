// test_structure_imports.js - Test imports with new structure
"use strict";

console.log("Testing new directory structure imports...");

try {
  console.log("1. Testing DataPreparationPipeline import...");
  const DataPreparationPipeline = require('./data_preparation/DataPreparationPipeline');
  console.log("✅ DataPreparationPipeline imported successfully");
  
  const pipeline = new DataPreparationPipeline();
  console.log("✅ DataPreparationPipeline instantiated successfully");
  
} catch (error) {
  console.error("❌ DataPreparationPipeline import/instantiation failed:");
  console.error("Message:", error.message);
  console.error("Stack:", error.stack);
}

try {
  console.log("\n2. Testing QueryPipeline import...");
  const QueryPipeline = require('./query/QueryPipeline');
  console.log("✅ QueryPipeline imported successfully");
  
} catch (error) {
  console.error("❌ QueryPipeline import failed:");
  console.error("Message:", error.message);
}

console.log("\nImport structure test completed.");
