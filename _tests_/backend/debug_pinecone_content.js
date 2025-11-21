#!/usr/bin/env node
require('dotenv').config();
const PineconePlugin = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin.js');

async function checkPineconeContent() {
  try {
    console.log('🔑 API Key exists:', !!process.env.PINECONE_API_KEY);
    console.log('🏷️ Index name:', process.env.PINECONE_INDEX_NAME);
    console.log('🌍 Environment:', process.env.PINECONE_ENVIRONMENT);
    
    const plugin = new PineconePlugin();
    const index = await plugin.getIndex();
    
    console.log('\n🔍 Checking namespace stats...');
    const stats = await index.describeIndexStats();
    console.log('Index stats:', JSON.stringify(stats, null, 2));
    
    // Try to query a sample vector to see if anything is stored
    const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
    console.log(`\n🔍 Trying to query namespace: ${namespace}`);
    
    const queryRequest = {
      vector: new Array(3072).fill(0.1), // Use correct dimension (3072 for text-embedding-3-large)
      topK: 3,
      includeValues: false,
      includeMetadata: true
    };

    const queryResponse = await index.namespace(namespace).query(queryRequest);
    
    console.log('Query response:');
    console.log('- Matches found:', queryResponse.matches?.length || 0);
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      queryResponse.matches.forEach((match, i) => {
        console.log(`Match ${i + 1}:`);
        console.log(`  ID: ${match.id}`);
        console.log(`  Score: ${match.score}`);
        console.log(`  Metadata keys: ${Object.keys(match.metadata || {})}`);
        if (match.metadata?.source) {
          console.log(`  Source: ${match.metadata.source}`);
        }
        if (match.metadata?.text) {
          console.log(`  Text preview: ${match.metadata.text.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('❌ No vectors found in this namespace');
      console.log('💡 This suggests either:');
      console.log('   1. No documents have been indexed for this user');
      console.log('   2. Documents were indexed in a different namespace');
      console.log('   3. Documents were not properly embedded before storage');
    }
    
  } catch (error) {
    console.error('❌ Error checking Pinecone:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkPineconeContent();