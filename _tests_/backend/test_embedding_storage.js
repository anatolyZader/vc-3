#!/usr/bin/env node

// Test Pinecone embedding storage directly
require('dotenv').config();

async function testEmbeddingStorage() {
  console.log('🧪 Testing direct Pinecone embedding storage...');
  
  try {
    // Load required modules
    const { Pinecone } = require('@pinecone-database/pinecone');
    const { OpenAI } = require('openai');
    
    // Initialize clients
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const index = pinecone.index('eventstorm-index');
    const namespace = 'anatolyzader_vc-3_main';
    
    console.log('📊 Current namespace stats:');
    const stats = await index.describeIndexStats();
    console.log('Total vectors:', stats.totalVectorCount);
    console.log('Namespaces:', Object.keys(stats.namespaces || {}));
    console.log('Target namespace vectors:', stats.namespaces?.[namespace]?.vectorCount || 0);
    
    // Create a test embedding
    console.log('✨ Creating test embedding...');
    const testText = 'This is a test document for EventStorm repository embeddings.';
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: testText
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    console.log('✅ Created embedding with', embedding.length, 'dimensions');
    
    // Store the embedding
    console.log('💾 Storing embedding to Pinecone...');
    const vector = {
      id: `test_${Date.now()}`,
      values: embedding,
      metadata: {
        content: testText,
        source: 'test_embedding',
        userId: 'anatolyzader',
        githubOwner: 'anatolyZader',
        repoName: 'vc-3',
        type: 'test'
      }
    };
    
    await index.namespace(namespace).upsert([vector]);
    console.log('✅ Successfully stored embedding');
    
    // Verify storage
    console.log('🔍 Verifying storage...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for indexing
    
    const newStats = await index.describeIndexStats();
    console.log('New total vectors:', newStats.totalVectorCount);
    console.log('New namespace vectors:', newStats.namespaces?.[namespace]?.vectorCount || 0);
    
    // Test retrieval
    console.log('🔎 Testing retrieval...');
    const queryResponse = await index.namespace(namespace).query({
      vector: embedding,
      topK: 1,
      includeMetadata: true
    });
    
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      console.log('✅ Successfully retrieved embedding');
      console.log('Retrieved content:', queryResponse.matches[0].metadata?.content);
    } else {
      console.log('❌ Failed to retrieve embedding');
    }
    
    console.log('\n🎉 Test completed successfully!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  testEmbeddingStorage();
}

module.exports = { testEmbeddingStorage };