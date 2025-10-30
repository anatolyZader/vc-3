#!/usr/bin/env node
/**
 * Clean Test Files and Config Files from Vector Database
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function cleanTestAndConfigFiles() {
  console.log('🧹 Cleaning test files and config files from vector database...');
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
  const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
  
  const index = pinecone.index(indexName);
  const dummyVector = new Array(3072).fill(0);
  
  try {
    console.log('📊 Scanning vectors for test files and config files...');
    
    // Get all vectors in batches
    let allProblematicVectors = [];
    let processedCount = 0;
    
    // We'll do multiple queries to get more vectors
    for (let i = 0; i < 10; i++) {
      const queryResponse = await index.namespace(namespace).query({
        vector: dummyVector,
        topK: 1000,
        includeMetadata: true,
        includeValues: false
      });
      
      if (queryResponse.matches) {
        for (const match of queryResponse.matches) {
          processedCount++;
          const source = match.metadata?.source || '';
          
          // Patterns to remove
          const shouldRemove = 
            // Test files
            source.includes('/_tests_/') ||
            source.includes('/test/') ||
            source.includes('/tests/') ||
            source.includes('/__tests__/') ||
            source.endsWith('.test.js') ||
            source.endsWith('.spec.js') ||
            source.endsWith('.test.ts') ||
            source.endsWith('.spec.ts') ||
            
            // Config files that don't help with understanding code
            source.endsWith('.gitignore') ||
            source.endsWith('.dockerignore') ||
            source.endsWith('.eslintignore') ||
            source.endsWith('package-lock.json') ||
            source.endsWith('yarn.lock') ||
            
            // Debug and problematic files
            source.includes('debug_') ||
            source.includes('test_') ||
            source.includes('chunking_') ||
            source.includes('langsmith') ||
            source.includes('trace-') ||
            
            // Specific files you mentioned
            source === '.gitignore' ||
            source.includes('domainExports.test.js') ||
            source.includes('httpApiSpec.test.js') ||
            source.includes('wiki.test.js') ||
            source.includes('wikiPage.test.js');
          
          if (shouldRemove) {
            allProblematicVectors.push({
              id: match.id,
              source: source,
              reason: getRemovalReason(source)
            });
          }
        }
      }
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Remove duplicates
    const uniqueVectors = allProblematicVectors.filter((vector, index, self) => 
      index === self.findIndex(v => v.id === vector.id)
    );
    
    console.log(`\n📊 SCAN RESULTS:`);
    console.log(`Total vectors scanned: ${processedCount}`);
    console.log(`Problematic vectors found: ${uniqueVectors.length}`);
    
    if (uniqueVectors.length === 0) {
      console.log('✅ No problematic vectors found!');
      return;
    }
    
    // Group by reason
    const byReason = {};
    uniqueVectors.forEach(v => {
      if (!byReason[v.reason]) byReason[v.reason] = [];
      byReason[v.reason].push(v);
    });
    
    console.log('\n🗂️ BREAKDOWN BY TYPE:');
    Object.entries(byReason).forEach(([reason, vectors]) => {
      console.log(`📁 ${reason}: ${vectors.length} vectors`);
      vectors.slice(0, 5).forEach(v => console.log(`   - ${v.source}`));
      if (vectors.length > 5) {
        console.log(`   ... and ${vectors.length - 5} more`);
      }
    });
    
    // Delete in batches
    console.log(`\n🗑️ DELETING ${uniqueVectors.length} problematic vectors...`);
    
    const batchSize = 100;
    for (let i = 0; i < uniqueVectors.length; i += batchSize) {
      const batch = uniqueVectors.slice(i, i + batchSize);
      const ids = batch.map(v => v.id);
      
      console.log(`🗑️ Batch ${Math.floor(i/batchSize) + 1}: Deleting ${ids.length} vectors`);
      
      try {
        await index.namespace(namespace).deleteMany(ids);
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} deleted successfully`);
      } catch (error) {
        console.error(`❌ Error deleting batch:`, error.message);
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n✅ CLEANUP COMPLETED!`);
    console.log(`🗑️ Removed ${uniqueVectors.length} problematic vectors`);
    console.log(`💡 These files should not appear in future vector searches`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function getRemovalReason(source) {
  if (source.includes('/_tests_/') || source.includes('/test/') || source.endsWith('.test.js')) {
    return 'Test files';
  }
  if (source.endsWith('.gitignore') || source.endsWith('package-lock.json')) {
    return 'Config files';
  }
  if (source.includes('debug_') || source.includes('test_')) {
    return 'Debug files';
  }
  if (source.includes('langsmith') || source.includes('trace-')) {
    return 'Trace files';
  }
  return 'Other problematic';
}

cleanTestAndConfigFiles();