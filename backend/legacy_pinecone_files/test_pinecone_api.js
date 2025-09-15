#!/usr/bin/env node

/**
 * Test Pinecone API Methods
 * Check what methods are available in the current SDK
 */

require('dotenv').config();

async function testPineconeAPI() {
  console.log('🔧 TESTING PINECONE API METHODS');
  console.log('===============================');
  
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    console.log('✅ Pinecone client created');
    console.log('Available methods:', Object.getOwnPropertyNames(pinecone).filter(name => typeof pinecone[name] === 'function'));
    
    // Test old method
    console.log('\n🧪 Testing old API (pinecone.Index):');
    try {
      const oldIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
      console.log('✅ Old API works:', typeof oldIndex);
    } catch (error) {
      console.log('❌ Old API failed:', error.message);
    }
    
    // Test new method
    console.log('\n🧪 Testing new API (pinecone.index):');
    try {
      const newIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);
      console.log('✅ New API works:', typeof newIndex);
      
      // Test if it can get stats
      const stats = await newIndex.describeIndexStats();
      console.log('✅ Stats retrieved:', stats.totalVectorCount || 0, 'vectors');
      
    } catch (error) {
      console.log('❌ New API failed:', error.message);
    }
    
    console.log('\n🎯 RECOMMENDATION:');
    console.log('   If old API failed, update code to use pinecone.index() instead of pinecone.Index()');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPineconeAPI();