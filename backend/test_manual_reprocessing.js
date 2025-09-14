#!/usr/bin/env node

/**
 * Manual Repository Reprocessing Test
 * Test if the repository processing pipeline can run successfully
 */

console.log('🔧 MANUAL REPOSITORY REPROCESSING TEST');
console.log('=====================================');

async function testRepositoryProcessing() {
  try {
    // Load required modules
    const path = require('path');
    const { createContainer, asClass, asValue, asFunction } = require('awilix');
    
    // Set up environment
    process.env.NODE_ENV = 'development';
    process.env.PINECONE_API_KEY = process.env.PINECONE_API_KEY || 'your-key';
    process.env.PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'gcp-europe-west4-de1d';
    process.env.PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'your-key';
    
    console.log('📋 Environment check:');
    console.log(`   PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME}`);
    console.log(`   PINECONE_ENVIRONMENT: ${process.env.PINECONE_ENVIRONMENT}`);
    console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Set' : 'Missing'}`);
    console.log('');
    
    // Load AI adapter
    const AILangchainAdapter = require('./business_modules/ai/infrastructure/ai/aiLangchainAdapter');
    
    // Create a minimal container
    const container = createContainer();
    
    // Mock event dispatcher
    const mockEventDispatcher = {
      emit: (event, data) => {
        console.log(`📡 Event emitted: ${event}`, { ...data, timestamp: new Date().toISOString() });
      }
    };
    
    container.register({
      eventDispatcher: asValue(mockEventDispatcher),
      pubSubClient: asValue(null) // Not needed for local test
    });
    
    console.log('🤖 Initializing AI adapter...');
    const aiAdapter = new AILangchainAdapter(container.cradle);
    
    // Set user ID
    await aiAdapter.setUserId('test-user-manual-reprocessing');
    console.log('✅ AI adapter initialized');
    
    console.log('');
    console.log('🔄 Testing repository processing...');
    
    // Test repository processing
    const result = await aiAdapter.processRepository(
      'https://github.com/anatolyZader/vc-3.git',
      'main',
      'anatolyZader_vc-3_manual-test'
    );
    
    console.log('✅ Repository processing completed!');
    console.log('📊 Result summary:', {
      success: result.success,
      documentsProcessed: result.documentsProcessed,
      chunksGenerated: result.chunksGenerated,
      namespace: result.namespace
    });
    
    console.log('');
    console.log('🧪 Testing vector search...');
    
    // Test a simple query
    const searchResults = await aiAdapter.query('how does ai module work in eventstorm.me');
    
    console.log('📋 Search results:');
    console.log(`   Found ${searchResults.length || 0} results`);
    
    if (searchResults && searchResults.length > 0) {
      console.log('✅ Vector search working - embeddings are available!');
      searchResults.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.metadata?.file_path || 'Unknown'} (score: ${result.score?.toFixed(3) || 'N/A'})`);
      });
    } else {
      console.log('⚠️  No search results - index may still be processing or empty');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testRepositoryProcessing();