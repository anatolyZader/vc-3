#!/usr/bin/env node

/**
 * Test Pinecone serverless connection and vector store status
 * This script verifies the current configuration works
 */

require('dotenv').config();

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');

async function testPineconeConnection() {
  console.log('🔍 Testing Pinecone serverless connection...');
  console.log(`📊 Environment variables:`);
  console.log(`   PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? 'Set' : 'Missing'}`);
  console.log(`   PINECONE_REGION: ${process.env.PINECONE_REGION || 'Not set'}`);
  console.log(`   PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME || 'Not set'}`);
  console.log(`   PINECONE_ENVIRONMENT: ${process.env.PINECONE_ENVIRONMENT || 'Not set (this is expected for serverless)'}`);

  try {
    // Initialize Pinecone client (serverless - no environment needed)
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    console.log('✅ Pinecone client initialized successfully');

    // Get index
    const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    const index = pinecone.Index(indexName);
    console.log(`✅ Index "${indexName}" obtained successfully`);

    // Test index stats
    console.log('📊 Fetching index statistics...');
    const stats = await index.describeIndexStats();
    console.log('📊 Index Stats:', JSON.stringify(stats, null, 2));

    // Test embeddings
    console.log('🔤 Testing embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-ada-002"
    });
    
    // Test vector store creation
    console.log('🗂️ Testing vector store creation...');
    const testUserId = 'test-user-123';
    const vectorStore = new PineconeStore(embeddings, {
      pineconeIndex: index,
      namespace: testUserId
    });
    console.log('✅ PineconeStore created successfully');

    // Test a simple search (this will tell us if there are any documents)
    console.log('🔍 Testing vector store search...');
    const testQuery = "chat model architecture";
    const results = await vectorStore.similaritySearch(testQuery, 3);
    console.log(`🔍 Search results for "${testQuery}": ${results.length} documents found`);
    
    if (results.length > 0) {
      console.log('📄 First result preview:');
      console.log('   Content:', results[0].pageContent.substring(0, 200) + '...');
      console.log('   Metadata:', JSON.stringify(results[0].metadata, null, 2));
    } else {
      console.log('⚠️  No documents found. This suggests the vector store is empty.');
      console.log('   This might be because:');
      console.log('   1. The index was recently recreated and documents need to be re-embedded');
      console.log('   2. Documents are in a different namespace');
      console.log('   3. The embedding process hasn\'t been run yet');
    }

    console.log('✅ Pinecone connection test completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Pinecone connection test failed:', error.message);
    if (error.stack) {
      console.error('📋 Error details:', error.stack);
    }
    return false;
  }
}

// Run the test
testPineconeConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });