#!/usr/bin/env node

/**
 * Pinecone Index Discovery
 * 
 * This script checks what Pinecone indexes actually exist in your environment
 * and identifies configuration mismatches between the main RAG system and docs generation.
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function discoverPineconeIndexes() {
  console.log('🔍 PINECONE INDEX DISCOVERY');
  console.log('===========================');
  console.log('');
  
  try {
    // Check configuration
    console.log('📊 Current Configuration:');
    console.log(`  PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? 'Set' : 'Missing'}`);
    console.log(`  PINECONE_REGION: ${process.env.PINECONE_REGION || 'Not set'}`);
    console.log(`  PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME || 'Not set'}`);
    console.log('');
    
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required');
    }
    
    // Initialize Pinecone
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    console.log('🔄 Listing all indexes in your Pinecone environment...');
    console.log('');
    
    // List all indexes
    const indexes = await pc.listIndexes();
    
    if (indexes.indexes && indexes.indexes.length > 0) {
      console.log(`✅ Found ${indexes.indexes.length} index(es):`);
      console.log('');
      
      for (const index of indexes.indexes) {
        console.log(`📁 Index: ${index.name}`);
        console.log(`   Host: ${index.host}`);
        console.log(`   Metric: ${index.metric}`);
        console.log(`   Dimension: ${index.dimension}`);
        console.log(`   Status: ${index.status?.ready ? 'Ready' : 'Not Ready'}`);
        
        // Get index stats
        try {
          const indexConnection = pc.index(index.name);
          const stats = await indexConnection.describeIndexStats();
          console.log(`   Total Records: ${stats.totalRecordCount || 0}`);
          console.log(`   Namespaces: ${stats.namespaces ? Object.keys(stats.namespaces).length : 0}`);
          
          if (stats.namespaces && Object.keys(stats.namespaces).length > 0) {
            console.log(`   Namespace Details:`);
            for (const [nsName, nsStats] of Object.entries(stats.namespaces)) {
              console.log(`     - ${nsName}: ${nsStats.recordCount || 0} records`);
            }
          }
        } catch (error) {
          console.log(`   ⚠️  Could not get stats: ${error.message}`);
        }
        
        console.log('');
      }
      
      // Check for configuration issues
      console.log('🔧 CONFIGURATION ANALYSIS:');
      console.log('');
      
      const configuredMainIndex = process.env.PINECONE_INDEX_NAME;
      const docsIndex = 'eventstorm-docs'; // From deploy.yml
      
      const mainIndexExists = indexes.indexes.some(idx => idx.name === configuredMainIndex);
      const docsIndexExists = indexes.indexes.some(idx => idx.name === docsIndex);
      
      console.log(`Main RAG Index (${configuredMainIndex}): ${mainIndexExists ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`Docs Index (${docsIndex}): ${docsIndexExists ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log('');
      
      if (!mainIndexExists) {
        console.log('❌ ISSUE: Main RAG index is missing!');
        console.log(`   Expected: ${configuredMainIndex}`);
        console.log(`   Available: ${indexes.indexes.map(idx => idx.name).join(', ')}`);
        console.log('');
      }
      
      if (!docsIndexExists) {
        console.log('⚠️  ISSUE: Docs generation will fail!');
        console.log(`   deploy.yml expects docs index: ${docsIndex}`);
        console.log(`   But it doesn't exist in your Pinecone environment`);
        console.log('   This is likely why docs generation times out/fails during deployment');
        console.log('');
        console.log('💡 SOLUTIONS:');
        console.log(`   Option 1: Create ${docsIndex} index in Pinecone dashboard`);
        console.log(`   Option 2: Update deploy.yml to use existing index: ${configuredMainIndex}`);
        console.log(`   Option 3: Disable docs generation entirely`);
        console.log('');
      }
      
      if (mainIndexExists && docsIndexExists) {
        console.log('✅ Both indexes exist - configuration looks good!');
      }
      
    } else {
      console.log('❌ No indexes found in your Pinecone environment!');
      console.log('');
      console.log('🔧 TROUBLESHOOTING:');
      console.log('1. Check that PINECONE_API_KEY is correct');
      console.log('2. Verify you have access to the Pinecone organization');
      console.log('3. Create an index in the Pinecone dashboard');
    }
    
  } catch (error) {
    console.error('💥 ERROR:', error.message);
    console.error('📋 Stack:', error.stack);
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('1. Verify PINECONE_API_KEY is set and valid');
    console.log('2. Check network connectivity');
    console.log('3. Ensure Pinecone service is accessible');
  }
}

// Run the discovery
discoverPineconeIndexes();