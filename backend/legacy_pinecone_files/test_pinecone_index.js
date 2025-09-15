#!/usr/bin/env node

/**
 * Pinecone Index Test
 * Check if the Pinecone index is accessible and working
 */

async function testPineconeIndex() {
  console.log('🔍 PINECONE INDEX TEST');
  console.log('=====================');
  
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    
    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME;
    
    console.log('📋 Configuration:');
    console.log(`   Index Name: ${indexName}`);
    console.log(`   Environment: ${process.env.PINECONE_ENVIRONMENT}`);
    console.log(`   API Key: ${process.env.PINECONE_API_KEY ? 'Set' : 'Missing'}`);
    console.log('');
    
    console.log('🔗 Connecting to Pinecone...');
    
    // Test index connection
    const index = pinecone.index(indexName);
    
    console.log('📊 Getting index stats...');
    const stats = await index.describeIndexStats();
    
    console.log('✅ Index stats retrieved:');
    console.log('   Total vectors:', stats.totalVectorCount || 0);
    console.log('   Namespaces:', Object.keys(stats.namespaces || {}).length);
    
    if (stats.namespaces) {
      console.log('   Namespace details:');
      for (const [namespace, details] of Object.entries(stats.namespaces)) {
        console.log(`     ${namespace}: ${details.vectorCount || 0} vectors`);
      }
    }
    
    console.log('');
    
    if (stats.totalVectorCount === 0) {
      console.log('⚠️  Index is empty - this explains why no documents are found');
      console.log('💡 The GitHub Actions deployment should populate this index');
      console.log('🔄 Check deployment logs or wait for reprocessing to complete');
    } else {
      console.log('✅ Index contains vectors - embeddings should work');
      
      // Test a simple query
      console.log('🧪 Testing vector query...');
      
      // Create a simple embedding for testing
      const { OpenAIEmbeddings } = require('@langchain/openai');
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      
      const queryText = 'ai module eventstorm';
      const queryVector = await embeddings.embedQuery(queryText);
      
      const queryResponse = await index.query({
        vector: queryVector,
        topK: 5,
        includeMetadata: true
      });
      
      console.log(`📋 Query results for "${queryText}":`, queryResponse.matches?.length || 0, 'matches');
      
      if (queryResponse.matches && queryResponse.matches.length > 0) {
        console.log('✅ Vector search working!');
        queryResponse.matches.slice(0, 3).forEach((match, i) => {
          console.log(`   ${i + 1}. Score: ${match.score?.toFixed(3)} - ${match.metadata?.file_path || 'Unknown'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Pinecone test failed:', error.message);
    
    if (error.message.includes('not found') || error.message.includes('404')) {
      console.log('');
      console.log('🚨 Index not found! This could be the issue:');
      console.log('   1. Index name mismatch');
      console.log('   2. Index was deleted but not recreated');
      console.log('   3. Wrong environment configuration');
    }
  }
}

testPineconeIndex();