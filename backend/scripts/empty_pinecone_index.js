#!/usr/bin/env node
/**
 * Empty Pinecone Index - Delete All Vectors
 * 
 * This script deletes all vectors from the Pinecone index.
 * Use this when you want to force a complete re-indexing.
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function emptyPineconeIndex() {
  try {
    console.log('🗑️  Starting Pinecone index cleanup...');
    
    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    console.log(`📊 Targeting index: ${indexName}`);
    
    const index = pinecone.index(indexName);
    
    // Get index stats before deletion
    const statsBefore = await index.describeIndexStats();
    console.log(`\n📈 Index stats BEFORE deletion:`);
    console.log(`   Total vectors: ${statsBefore.totalRecordCount || 0}`);
    console.log(`   Namespaces: ${Object.keys(statsBefore.namespaces || {}).length}`);
    
    if (statsBefore.namespaces) {
      console.log(`\n📋 Namespaces found:`);
      for (const [ns, data] of Object.entries(statsBefore.namespaces)) {
        console.log(`   - ${ns}: ${data.recordCount || 0} vectors`);
      }
    }
    
    // Ask for confirmation
    console.log(`\n⚠️  WARNING: This will delete ALL vectors from index "${indexName}"`);
    console.log(`   Total vectors to delete: ${statsBefore.totalRecordCount || 0}`);
    
    // In non-interactive mode, proceed directly
    if (process.argv.includes('--yes') || process.argv.includes('-y')) {
      console.log(`\n✅ --yes flag detected, proceeding with deletion...`);
    } else {
      console.log(`\n💡 Run with --yes flag to skip confirmation: node scripts/empty_pinecone_index.js --yes`);
      console.log(`\n🛑 Exiting without changes (add --yes to proceed)`);
      process.exit(0);
    }
    
    // Delete all vectors from all namespaces
    console.log(`\n🗑️  Deleting all vectors...`);
    
    if (statsBefore.namespaces && Object.keys(statsBefore.namespaces).length > 0) {
      for (const namespace of Object.keys(statsBefore.namespaces)) {
        console.log(`   Deleting namespace: ${namespace}`);
        await index.namespace(namespace).deleteAll();
      }
    } else {
      // Delete from default namespace if no namespaces found
      console.log(`   Deleting from default namespace`);
      await index.deleteAll();
    }
    
    // Wait a moment for deletions to propagate
    console.log(`\n⏳ Waiting for deletions to propagate...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get index stats after deletion
    const statsAfter = await index.describeIndexStats();
    console.log(`\n📈 Index stats AFTER deletion:`);
    console.log(`   Total vectors: ${statsAfter.totalRecordCount || 0}`);
    console.log(`   Namespaces: ${Object.keys(statsAfter.namespaces || {}).length}`);
    
    console.log(`\n✅ Pinecone index emptied successfully!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Make a query in the app - it will trigger auto-indexing`);
    console.log(`   2. Or manually trigger: node scripts/reindex_repository.js`);
    console.log(`   3. All new chunks will have UL tags and proper granularity`);
    
  } catch (error) {
    console.error(`\n❌ Error emptying Pinecone index:`, error);
    console.error(`\nStack trace:`, error.stack);
    process.exit(1);
  }
}

// Run the script
emptyPineconeIndex();
