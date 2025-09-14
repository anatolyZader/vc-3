#!/usr/bin/env node

/**
 * Pinecone Environment Discovery
 * Help find the correct environment for the new index
 */

// Load environment variables
require('dotenv').config();

async function discoverPineconeEnvironment() {
  console.log('🔍 PINECONE ENVIRONMENT DISCOVERY');
  console.log('=================================');
  
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    
    const apiKey = process.env.PINECONE_API_KEY;
    const currentEnv = process.env.PINECONE_ENVIRONMENT;
    const indexName = process.env.PINECONE_INDEX_NAME;
    
    console.log('📋 Current configuration:');
    console.log(`   API Key: ${apiKey ? 'Set' : 'Missing'}`);
    console.log(`   Environment: ${currentEnv}`);
    console.log(`   Index Name: ${indexName}`);
    console.log('');
    
    if (!apiKey) {
      console.log('❌ PINECONE_API_KEY not set');
      return;
    }
    
    console.log('🔄 Testing current environment...');
    
    try {
      const pinecone = new Pinecone({
        apiKey: apiKey,
        environment: currentEnv
      });
      
      const index = pinecone.index(indexName);
      const stats = await index.describeIndexStats();
      
      console.log('✅ Current environment works!');
      console.log('   Total vectors:', stats.totalVectorCount || 0);
      console.log('   This might be the correct environment');
      
      if (stats.totalVectorCount === 0) {
        console.log('⚠️  Index is empty - this explains the RAG issue');
        console.log('💡 The index exists but hasn\'t been populated yet');
      }
      
    } catch (error) {
      console.log('❌ Current environment failed:', error.message);
      
      if (error.message.includes('not found') || error.message.includes('404')) {
        console.log('🚨 Index not found in current environment!');
        console.log('');
        console.log('📝 Steps to fix this:');
        console.log('1. Go to https://app.pinecone.io/');
        console.log('2. Find your "eventstorm-index"');
        console.log('3. Look at the "Environment" column');
        console.log('4. Update PINECONE_ENVIRONMENT in your .env file');
        console.log('');
        console.log('🔍 Common new environments:');
        console.log('   - gcp-starter (for free tier)');
        console.log('   - us-east-1-aws');
        console.log('   - us-west1-gcp');
        console.log('   - europe-west1-gcp');
        console.log('   - asia-northeast1-gcp');
      }
    }
    
    console.log('');
    console.log('🎯 Alternative: Check Pinecone console');
    console.log('   1. Login to https://app.pinecone.io/');
    console.log('   2. Go to "Indexes" tab');
    console.log('   3. Find "eventstorm-index"');
    console.log('   4. Note the "Environment" value');
    console.log('   5. Update PINECONE_ENVIRONMENT in .env');
    
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  }
}

discoverPineconeEnvironment();