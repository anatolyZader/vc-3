/**
 * Purge Analysis Markdown Leakage from Pinecone
 * 
 * Problem: Internal analysis files (processing_report_*, *_analysis_*.md, test_*.md, debug_*.md)
 * were accidentally indexed into Pinecone and are polluting RAG retrieval.
 * 
 * This script:
 * 1. Queries Pinecone for all chunks from analysis/test/debug files
 * 2. Deletes them from the vector database
 * 3. Logs purge statistics
 * 
 * Usage: node scripts/purge_analysis_chunks.js
 */

const { PineconeClient } = require('../business_modules/ai/infrastructure/ai/vector/PineconeClient.js');
require('dotenv').config();

const ANALYSIS_PATTERNS = [
  'processing_report_',
  '_analysis_',
  '_analysis.md',
  'debug_',
  'test_',
  '_trace',
  '_report',
  'trace-analysis',
  'latest-trace-analysis',
  'forced_method_analysis_',
  'method_level_analysis_',
  '_chunks',
  'copilot_helpers/'
];

async function purgeAnalysisChunks() {
  console.log('🧹 Starting analysis markdown purge...\n');
  
  const pinecone = new PineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME;
  
  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME not set in environment');
  }
  
  console.log(`📊 Connected to Pinecone index: ${indexName}`);
  
  // Get all namespaces (repositories)
  const stats = await pinecone.getIndexStats();
  const namespaces = Object.keys(stats.namespaces || {});
  
  console.log(`📁 Found ${namespaces.length} namespaces\n`);
  
  let totalPurged = 0;
  const purgeLog = [];
  
  for (const namespace of namespaces) {
    console.log(`\n🔍 Scanning namespace: ${namespace}`);
    
    const toDelete = [];
    const matchedFiles = new Set();
    
    try {
      // Fetch all vectors with metadata (Pinecone list_paginated)
      console.log('  📥 Fetching all vectors in namespace...');
      let paginationToken = null;
      let totalScanned = 0;
      
      do {
        const listResult = await pinecone.listVectors({
          namespace,
          limit: 100,  // Pinecone max per page
          paginationToken
        });
        
        const vectors = listResult.vectors || [];
        totalScanned += vectors.length;
        
        // Check each vector's metadata
        for (const vector of vectors) {
          const filePath = vector.metadata?.filePath || '';
          const fileName = filePath.split('/').pop().toLowerCase();
          
          // Check if matches any analysis pattern
          const isAnalysis = ANALYSIS_PATTERNS.some(pattern => 
            fileName.includes(pattern.toLowerCase()) || 
            filePath.toLowerCase().includes(pattern.toLowerCase())
          );
          
          if (isAnalysis) {
            toDelete.push(vector.id);
            matchedFiles.add(filePath);
          }
        }
        
        paginationToken = listResult.pagination?.next;
        
        if (totalScanned % 500 === 0) {
          console.log(`    Scanned ${totalScanned} vectors, found ${toDelete.length} to delete...`);
        }
      } while (paginationToken);
      
      console.log(`  ✅ Scanned ${totalScanned} total vectors`);
      
      if (toDelete.length > 0) {
        console.log(`  ⚠️  Found ${toDelete.length} polluted chunks to delete`);
        console.log(`  📄 Sample files:`);
        [...matchedFiles].slice(0, 10).forEach(file => {
          console.log(`      ${file}`);
        });
        
        console.log(`\n  🗑️  Deleting ${toDelete.length} chunks...`);
        
        // Delete in batches of 1000 (Pinecone limit)
        const batchSize = 1000;
        for (let i = 0; i < toDelete.length; i += batchSize) {
          const batch = toDelete.slice(i, i + batchSize);
          await pinecone.deleteVectors(batch, namespace);
          console.log(`    ✅ Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(toDelete.length / batchSize)}`);
        }
        
        totalPurged += toDelete.length;
        purgeLog.push({
          namespace,
          count: toDelete.length,
          files: [...matchedFiles]
        });
        
        console.log(`  ✅ Successfully purged ${toDelete.length} chunks`);
      } else {
        console.log(`  ✅ No polluted chunks found`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${namespace}:`, error.message);
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PURGE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total chunks purged: ${totalPurged}`);
  console.log(`Namespaces affected: ${purgeLog.length}`);
  
  if (purgeLog.length > 0) {
    console.log('\n📋 Detailed purge log:');
    purgeLog.forEach(entry => {
      console.log(`\n  Namespace: ${entry.namespace}`);
      console.log(`  Chunks removed: ${entry.count}`);
      console.log(`  Unique files: ${entry.files.length}`);
      console.log(`  Sample files:`);
      entry.files.slice(0, 10).forEach(file => console.log(`    - ${file}`));
      if (entry.files.length > 10) {
        console.log(`    ... and ${entry.files.length - 10} more`);
      }
    });
  }
  
  console.log('\n✅ Purge complete!');
  console.log('💡 Next steps:');
  console.log('  1. Verify FileFilteringUtils.js excludes these patterns ✅');
  console.log('  2. Re-run embedding pipeline to ensure clean indexing');
  console.log('  3. Test RAG retrieval to confirm no analysis files appear');
}

// Run purge
purgeAnalysisChunks()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
