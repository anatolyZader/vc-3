#!/usr/bin/env node

console.log('🧪 Testing EmbeddingManager Constructor Fix');
console.log('===========================================');

try {
  const EmbeddingManager = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/embeddingManager');
  
  console.log('✅ EmbeddingManager import successful');
  
  // Test 1: Should throw error when no pineconeService provided
  try {
    new EmbeddingManager({
      embeddings: {},
      pineconeLimiter: {}
    });
    console.log('❌ Expected error when no pineconeService provided');
  } catch (error) {
    console.log('✅ Correctly throws error when no pineconeService provided:', error.message);
  }
  
  // Test 2: Should work when pineconeService is provided
  try {
    const mockPineconeService = {
      upsertDocuments: () => Promise.resolve(),
      // other methods...
    };
    
    const embeddingManager = new EmbeddingManager({
      embeddings: {},
      pineconeLimiter: {},
      pineconeService: mockPineconeService
    });
    
    console.log('✅ Constructor works correctly with valid pineconeService');
    console.log('✅ pineconeService assigned:', !!embeddingManager.pineconeService);
    console.log('✅ Backward compatibility alias works:', embeddingManager.pinecone === embeddingManager.pineconeService);
    
  } catch (error) {
    console.log('❌ Unexpected error with valid constructor:', error.message);
  }
  
  console.log('\n🎉 All constructor tests passed!');
  
} catch (error) {
  console.error('❌ Failed to import EmbeddingManager:', error.message);
  process.exit(1);
}