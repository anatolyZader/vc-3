#!/usr/bin/env node
/**
 * Quick Vector Cleanup - Remove Known Problematic Files
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function quickClean() {
  console.log('🧹 Quick cleanup of known problematic vectors...');
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
  const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
  
  const index = pinecone.index(indexName);
  const dummyVector = new Array(3072).fill(0);
  
  try {
    // Get all vectors
    const queryResponse = await index.namespace(namespace).query({
      vector: dummyVector,
      topK: 1000,
      includeMetadata: true,
      includeValues: false
    });
    
    const toDelete = [];
    
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        const source = match.metadata?.source || '';
        
        // Target specific problematic files
        if (source.includes('debug_') || 
            source.includes('test_change_analyzer') ||
            source.includes('latest-trace-analysis') ||
            source.includes('trace-2025') ||
            source.includes('langsmith') ||
            (source.includes('.js') && (source.includes('test_') || source.includes('debug_')))) {
          
          toDelete.push({
            id: match.id,
            source: source
          });
        }
      }
    }
    
    if (toDelete.length > 0) {
      console.log(`🗑️ Deleting ${toDelete.length} problematic vectors:`);
      toDelete.forEach(v => console.log(`  - ${v.source}`));
      
      const ids = toDelete.map(v => v.id);
      await index.namespace(namespace).deleteMany(ids);
      
      console.log('✅ Cleanup completed!');
    } else {
      console.log('✅ No problematic vectors found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickClean();