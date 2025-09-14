#!/usr/bin/env node

/**
 * Test Pinecone Connection with New SDK
 * Figure out the correct way to connect to the new serverless index
 */

require('dotenv').config();

async function testNewPineconeConnection() {
  console.log('🔧 TESTING NEW PINECONE SDK CONNECTION');
  console.log('====================================');
  
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME;
    
    console.log('📋 Configuration:');
    console.log(`   API Key: ${apiKey ? 'Set' : 'Missing'}`);
    console.log(`   Index Name: ${indexName}`);
    console.log('');
    
    // For serverless indexes, we don't need environment
    console.log('🔗 Connecting to Pinecone (serverless mode)...');
    
    const pinecone = new Pinecone({
      apiKey: apiKey
    });
    
    console.log('📊 Getting index stats...');
    const index = pinecone.index(indexName);
    const stats = await index.describeIndexStats();
    
    console.log('✅ Connection successful!');
    console.log('   Total vectors:', stats.totalVectorCount || 0);
    console.log('   Namespaces:', Object.keys(stats.namespaces || {}).length);
    
    if (stats.namespaces) {
      console.log('   Namespace details:');
      for (const [namespace, details] of Object.entries(stats.namespaces)) {
        console.log(`     ${namespace}: ${details.vectorCount || 0} vectors`);
      }
    }
    
    if (stats.totalVectorCount === 0) {
      console.log('');
      console.log('⚠️  Index is empty - this explains why RAG isn\'t working');
      console.log('💡 You need to populate the index with repository data');
      console.log('🔄 The repository reprocessing should fill this index');
    } else {
      console.log('');
      console.log('✅ Index has vectors - RAG should work once app is updated');
    }
    
    console.log('');
    console.log('🎯 SOLUTION: Remove PINECONE_ENVIRONMENT from .env');
    console.log('   For serverless indexes, only PINECONE_API_KEY and PINECONE_INDEX_NAME are needed');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('not found')) {
      console.log('');
      console.log('🚨 Index not found! Possible issues:');
      console.log('   1. Index name mismatch');
      console.log('   2. API key doesn\'t have access to this index');
      console.log('   3. Index was deleted');
    }
  }
}

testNewPineconeConnection();