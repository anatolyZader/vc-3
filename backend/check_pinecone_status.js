#!/usr/bin/env node

/**
 * Check Pinecone Index Status
 * Verifies if EventStorm repository content has been indexed
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function checkPineconeStatus() {
  console.log('🔍 PINECONE STATUS CHECK');
  console.log('=' .repeat(50));
  
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    
    console.log('📊 Checking index statistics...');
    const stats = await index.describeIndexStats();
    
    console.log('\n📈 INDEX STATISTICS:');
    console.log(`Total vectors: ${stats.totalVectorCount}`);
    console.log(`Index fullness: ${(stats.indexFullness * 100).toFixed(2)}%`);
    console.log(`Namespaces: ${Object.keys(stats.namespaces || {}).length}`);
    
    if (stats.namespaces) {
      console.log('\n🏷️  NAMESPACES:');
      for (const [namespace, info] of Object.entries(stats.namespaces)) {
        console.log(`  ${namespace}: ${info.vectorCount} vectors`);
      }
    }
    
    // Test query for EventStorm content
    console.log('\n🔍 Testing for EventStorm content...');
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0.1), // Dummy vector for testing
      topK: 5,
      includeMetadata: true,
      filter: {
        repoId: 'anatolyZader/vc-3'
      }
    });
    
    console.log(`\n📋 EVENTSTORM CONTENT CHECK:`);
    console.log(`Found ${queryResponse.matches.length} EventStorm documents`);
    
    if (queryResponse.matches.length > 0) {
      console.log('\n📄 SAMPLE DOCUMENTS:');
      queryResponse.matches.slice(0, 3).forEach((match, idx) => {
        console.log(`${idx + 1}. Source: ${match.metadata?.source || 'Unknown'}`);
        console.log(`   Type: ${match.metadata?.type || 'Unknown'}`);
        console.log(`   Score: ${match.score?.toFixed(3) || 'N/A'}`);
      });
    } else {
      console.log('❌ No EventStorm repository content found in index');
      console.log('💡 This indicates repository processing is not complete');
    }
    
  } catch (error) {
    console.error('❌ Error checking Pinecone status:', error.message);
  }
}

if (require.main === module) {
  checkPineconeStatus();
}

module.exports = checkPineconeStatus;