/**
 * Quick test to verify Pinecone connection and modernized components
 */

// Load environment variables
require('dotenv').config();

const PineconeService = require('./business_modules/ai/infrastructure/ai/pinecone/PineconeService');

async function testPineconeConnection() {
  console.log('🔍 Testing Pinecone connection...');
  
  try {
    // Create PineconeService instance
    const pineconeService = new PineconeService();
    
    // Test connection (this will auto-create index if needed)
    console.log('📊 Attempting to connect and get index stats...');
    const stats = await pineconeService.getIndexStats();
    
    console.log('✅ Pinecone connection successful!');
    console.log('📋 Index stats:', JSON.stringify(stats, null, 2));
    
    // Test if we can list existing indexes
    console.log('� Listing indexes...');
    const indexes = await pineconeService.client.listIndexes();
    console.log('📄 Available indexes:', indexes.indexes?.map(idx => idx.name) || []);
    
    return true;
  } catch (error) {
    console.error('❌ Pinecone test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
testPineconeConnection()
  .then(success => {
    console.log(`Test ${success ? 'passed' : 'failed'}.`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Test completed.');
  });