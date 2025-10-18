#!/usr/bin/env node
/**
 * Deep Clean Vector Database - Remove All Trace Files
 * 
 * This script performs a comprehensive cleanup by:
 * 1. Listing all vectors in the namespace
 * 2. Checking metadata for problematic sources
 * 3. Removing all LangSmith trace files and debug content
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

class DeepVectorCleaner {
  constructor() {
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    this.namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
  }

  async deepClean() {
    console.log('🔍 Starting DEEP vector database analysis...');
    console.log(`📊 Target: ${this.indexName} -> ${this.namespace}`);
    
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Get ALL vectors in the namespace
      console.log('📊 Fetching ALL vectors in namespace...');
      const allVectors = await this.getAllVectors(index);
      
      console.log(`📊 Found ${allVectors.length} total vectors in namespace`);
      
      // Analyze each vector's metadata
      const problematicVectors = this.identifyProblematicVectors(allVectors);
      
      if (problematicVectors.length === 0) {
        console.log('✅ No problematic vectors found!');
        return;
      }
      
      console.log(`🚨 Found ${problematicVectors.length} problematic vectors:`);
      problematicVectors.forEach(v => {
        console.log(`  🗑️ ${v.source} (${v.reason})`);
      });
      
      // Delete problematic vectors
      await this.deleteVectors(index, problematicVectors);
      
      console.log('✅ Deep cleanup completed!');
      
    } catch (error) {
      console.error('❌ Deep cleanup failed:', error);
      throw error;
    }
  }

  async getAllVectors(index) {
    const allVectors = [];
    let nextToken = null;
    const dummyVector = new Array(3072).fill(0);
    
    do {
      try {
        const queryResponse = await index.namespace(this.namespace).query({
          vector: dummyVector,
          topK: 10000, // Maximum allowed
          includeMetadata: true,
          includeValues: false
        });
        
        if (queryResponse.matches) {
          for (const match of queryResponse.matches) {
            allVectors.push({
              id: match.id,
              score: match.score,
              metadata: match.metadata
            });
          }
        }
        
        // For now, we'll just get the first batch
        // Pinecone's query doesn't support pagination in the same way
        break;
        
      } catch (error) {
        console.error('Error fetching vectors:', error);
        break;
      }
    } while (nextToken);
    
    return allVectors;
  }

  identifyProblematicVectors(vectors) {
    const problematic = [];
    
    // Patterns that indicate problematic content
    const problematicPatterns = [
      'langsmith',
      'trace-',
      'latest-trace-analysis',
      'debug_',
      'test_anti_hallucination',
      'test_prompt',
      'chunking_reports',
      'langsmith-archive'
    ];
    
    for (const vector of vectors) {
      const source = vector.metadata?.source || '';
      const sourceId = vector.id || '';
      
      let isProblematic = false;
      let reason = '';
      
      // Check source path
      for (const pattern of problematicPatterns) {
        if (source.toLowerCase().includes(pattern.toLowerCase()) || 
            sourceId.toLowerCase().includes(pattern.toLowerCase())) {
          isProblematic = true;
          reason = `Contains pattern: ${pattern}`;
          break;
        }
      }
      
      // Special check for files that definitely contain hallucinated content
      if (source.includes('latest-trace-analysis.md')) {
        isProblematic = true;
        reason = 'Known to contain hallucinated src/core/di references';
      }
      
      if (isProblematic) {
        problematic.push({
          id: vector.id,
          source: source,
          reason: reason,
          metadata: vector.metadata
        });
      }
    }
    
    return problematic;
  }

  async deleteVectors(index, vectors) {
    const batchSize = 100;
    
    console.log(`🗑️ Deleting ${vectors.length} vectors in batches...`);
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const ids = batch.map(v => v.id);
      
      console.log(`🗑️ Batch ${Math.floor(i/batchSize) + 1}: Deleting ${ids.length} vectors`);
      
      try {
        await index.namespace(this.namespace).deleteMany(ids);
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} deleted successfully`);
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error deleting batch:`, error);
      }
    }
  }

  // List all sources for inspection
  async listAllSources() {
    console.log('📋 Listing ALL sources in vector database...');
    
    const index = this.pinecone.index(this.indexName);
    const allVectors = await this.getAllVectors(index);
    
    const sources = new Set();
    
    for (const vector of allVectors) {
      const source = vector.metadata?.source || 'NO_SOURCE';
      sources.add(source);
    }
    
    const sortedSources = Array.from(sources).sort();
    
    console.log(`\n📊 Found ${sortedSources.length} unique sources:`);
    sortedSources.forEach((source, index) => {
      const isProblematic = ['langsmith', 'trace-', 'debug_', 'test_'].some(pattern => 
        source.toLowerCase().includes(pattern.toLowerCase())
      );
      
      const marker = isProblematic ? '🚨' : '✅';
      console.log(`${marker} ${index + 1}. ${source}`);
    });
    
    return sortedSources;
  }
}

async function main() {
  const cleaner = new DeepVectorCleaner();
  
  try {
    // First, list all sources to see what we have
    await cleaner.listAllSources();
    
    console.log('\n' + '='.repeat(60));
    
    // Then perform deep cleanup
    await cleaner.deepClean();
    
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DeepVectorCleaner;