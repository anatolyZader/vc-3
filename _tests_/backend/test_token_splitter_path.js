#!/usr/bin/env node

console.log('🧪 Testing TokenBasedSplitter Path & Fallback');
console.log('=============================================');

async function testTokenSplitterPath() {
  try {
    const EmbeddingManager = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/embeddingManager');
    
    // Create a mock pineconeService
    const mockPineconeService = {
      upsertDocuments: async (docs, embeddings, options) => {
        console.log(`📝 Mock upsert called with ${docs.length} documents`);
        return { success: true, upserted: docs.length };
      }
    };
    
    const mockEmbeddings = {
      embedDocuments: async (texts) => {
        console.log(`🔢 Mock embeddings called with ${texts.length} texts`);
        return texts.map(() => new Array(1536).fill(0.1));
      }
    };
    
    const embeddingManager = new EmbeddingManager({
      embeddings: mockEmbeddings,
      pineconeLimiter: null,
      pineconeService: mockPineconeService
    });
    
    console.log('✅ EmbeddingManager created successfully');
    
    // Test with a small document (should not trigger re-chunking)
    const smallDoc = {
      pageContent: 'This is a small document that should not exceed token limits.',
      metadata: { source: 'test-small.js', type: 'code' }
    };
    
    console.log('\n🔬 Testing with small document...');
    await embeddingManager.storeToPinecone([smallDoc], 'test-namespace', 'testOwner', 'testRepo');
    console.log('✅ Small document processed successfully');
    
    // Test with a large document (should trigger re-chunking)
    const largeContent = 'function largeFunction() {\n' + '  console.log("large content");\n'.repeat(1000) + '}';
    const largeDoc = {
      pageContent: largeContent,
      metadata: { source: 'test-large.js', type: 'code' }
    };
    
    console.log('\n🔬 Testing with large document...');
    await embeddingManager.storeToPinecone([largeDoc], 'test-namespace', 'testOwner', 'testRepo');
    console.log('✅ Large document processed successfully (should have been re-chunked)');
    
    console.log('\n🎉 All TokenBasedSplitter tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Test the TokenBasedSplitter path directly
console.log('\n🔍 Testing TokenBasedSplitter import path...');
try {
  const TokenBasedSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/tokenBasedSplitter');
  console.log('✅ TokenBasedSplitter import successful');
  
  const splitter = new TokenBasedSplitter({ maxTokens: 1400, minTokens: 100, overlapTokens: 150 });
  const result = splitter.exceedsTokenLimit('This is a test');
  console.log('✅ TokenBasedSplitter functionality works:', result);
  
} catch (error) {
  console.log('⚠️ TokenBasedSplitter direct import failed:', error.message);
  console.log('(This will test the fallback mechanism)');
}

testTokenSplitterPath();