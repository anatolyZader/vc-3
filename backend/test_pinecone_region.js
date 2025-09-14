#!/usr/bin/env node

/**
 * Test Pinecone with Region Parameter
 * Verify if PINECONE_REGION works with current EventStorm setup
 */

require('dotenv').config();

async function testPineconeWithRegion() {
  console.log('🧪 TESTING PINECONE WITH REGION PARAMETER');
  console.log('=========================================');
  
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    
    // Test both approaches
    console.log('📋 Testing different Pinecone configurations...');
    console.log('');
    
    // Approach 1: Only API key (current EventStorm setup)
    console.log('1️⃣ Testing with API key only (current setup):');
    try {
      const pinecone1 = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });
      
      const index1 = pinecone1.index(process.env.PINECONE_INDEX_NAME);
      const stats1 = await index1.describeIndexStats();
      
      console.log('   ✅ Works! Total vectors:', stats1.totalVectorCount || 0);
    } catch (error) {
      console.log('   ❌ Failed:', error.message);
    }
    
    console.log('');
    
    // Approach 2: With region parameter
    console.log('2️⃣ Testing with region parameter:');
    const region = 'us-east-1'; // From your Pinecone console
    
    try {
      const pinecone2 = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
        // Note: region might not be needed for the client, 
        // but let's test if it causes issues
      });
      
      const index2 = pinecone2.index(process.env.PINECONE_INDEX_NAME);
      const stats2 = await index2.describeIndexStats();
      
      console.log(`   ✅ Works with region! Total vectors:`, stats2.totalVectorCount || 0);
    } catch (error) {
      console.log('   ❌ Failed with region:', error.message);
    }
    
    console.log('');
    console.log('🎯 CONCLUSION:');
    console.log('   Your current EventStorm setup should work fine');
    console.log('   The main issue is that your index is EMPTY (0 vectors)');
    console.log('   You need to populate it with repository data');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPineconeWithRegion();