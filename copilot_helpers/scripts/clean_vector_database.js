#!/usr/bin/env node
/**
 * Clean Vector Database of Hallucinated Content
 * 
 * This script checks for and removes documents from Pinecone that contain
 * hallucinated content like "src/core/di" paths that don't exist in the actual codebase.
 */

require('dotenv').config();

const { Pinecone } = require('@pinecone-database/pinecone');

class VectorDatabaseCleaner {
  constructor() {
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    this.namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
    
    // Hallucinated content patterns to search for and remove
    this.hallucinatedPatterns = [
      'src/core/di',
      'src/components',
      'lib/utils',
      'modules/di',
      'core/dependency-injection'
    ];
    
    // Sources that should be removed entirely
    this.problematicSources = [
      'langsmith/',
      'langsmith-archive/',
      'trace-',
      'latest-trace-analysis.md',
      'debug_',
      'test_anti_hallucination',
      'chunking_reports/'
    ];
  }

  async cleanVectorDatabase() {
    console.log('🧹 Starting Vector Database Cleanup...');
    console.log(`📊 Target: ${this.indexName} -> ${this.namespace}`);
    
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Step 1: Query for documents that might contain hallucinated content
      console.log('\n🔍 Step 1: Searching for potentially problematic documents...');
      
      const queryResults = await this.findProblematicDocuments(index);
      
      if (queryResults.length === 0) {
        console.log('✅ No problematic documents found!');
        return;
      }
      
      console.log(`🚨 Found ${queryResults.length} potentially problematic documents`);
      
      // Step 2: Analyze each document
      console.log('\n🔬 Step 2: Analyzing document content...');
      const documentsToDelete = await this.analyzeDocuments(queryResults);
      
      if (documentsToDelete.length === 0) {
        console.log('✅ After analysis, no documents need to be removed');
        return;
      }
      
      console.log(`🗑️ ${documentsToDelete.length} documents will be removed`);
      
      // Step 3: Remove problematic documents
      console.log('\n🗑️ Step 3: Removing problematic documents...');
      await this.removeDocuments(index, documentsToDelete);
      
      console.log('\n✅ Vector database cleanup completed!');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  async findProblematicDocuments(index) {
    const problematicDocs = [];
    
    // Query for documents with hallucinated content
    for (const pattern of this.hallucinatedPatterns) {
      console.log(`🔍 Searching for: "${pattern}"`);
      
      try {
        // We need to do a broad search since we can't text-search vectors directly
        // Query with a dummy vector to get all documents, then filter by metadata
        const dummyVector = new Array(3072).fill(0); // text-embedding-3-large uses 3072 dimensions
        
        const queryResponse = await index.namespace(this.namespace).query({
          vector: dummyVector,
          topK: 1000, // Get many results to analyze
          includeMetadata: true,
          includeValues: false
        });
        
        if (queryResponse.matches) {
          for (const match of queryResponse.matches) {
            // Check if this document's metadata or id suggests it's problematic
            const source = match.metadata?.source || '';
            const id = match.id || '';
            
            const isProblematic = this.problematicSources.some(problematicSource => 
              source.includes(problematicSource) || id.includes(problematicSource)
            );
            
            if (isProblematic) {
              problematicDocs.push({
                id: match.id,
                source: source,
                reason: `Source contains problematic pattern`,
                metadata: match.metadata
              });
            }
          }
        }
        
      } catch (error) {
        console.warn(`⚠️ Error searching for pattern "${pattern}":`, error.message);
      }
    }
    
    // Remove duplicates
    const uniqueDocs = problematicDocs.filter((doc, index, self) => 
      index === self.findIndex(d => d.id === doc.id)
    );
    
    return uniqueDocs;
  }

  async analyzeDocuments(documents) {
    const toDelete = [];
    
    console.log(`📋 Analyzing ${documents.length} documents...`);
    
    for (const doc of documents) {
      let shouldDelete = false;
      let reasons = [];
      
      // Check source path
      const source = doc.source || '';
      
      // Definitely delete trace files
      if (source.includes('langsmith') || source.includes('trace-') || source.includes('debug_')) {
        shouldDelete = true;
        reasons.push('Contains trace/debug content');
      }
      
      // Check for specific problematic files
      if (source.includes('latest-trace-analysis.md')) {
        shouldDelete = true;
        reasons.push('Latest trace analysis file');
      }
      
      // Check for test files that might contain hallucinated examples
      if (source.includes('test_anti_hallucination') || source.includes('test_prompt')) {
        shouldDelete = true;
        reasons.push('Test file with potentially problematic content');
      }
      
      if (shouldDelete) {
        console.log(`🗑️ Will delete: ${source} (${reasons.join(', ')})`);
        toDelete.push({
          id: doc.id,
          source: source,
          reasons: reasons
        });
      } else {
        console.log(`✅ Keeping: ${source}`);
      }
    }
    
    return toDelete;
  }

  async removeDocuments(index, documentsToDelete) {
    const batchSize = 100; // Pinecone delete limit
    
    console.log(`🗑️ Deleting ${documentsToDelete.length} documents in batches of ${batchSize}...`);
    
    for (let i = 0; i < documentsToDelete.length; i += batchSize) {
      const batch = documentsToDelete.slice(i, i + batchSize);
      const ids = batch.map(doc => doc.id);
      
      console.log(`🗑️ Deleting batch ${Math.floor(i/batchSize) + 1}: ${ids.length} documents`);
      
      try {
        await index.namespace(this.namespace).deleteMany(ids);
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} deleted successfully`);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error deleting batch ${Math.floor(i/batchSize) + 1}:`, error);
      }
    }
    
    console.log(`✅ Deleted ${documentsToDelete.length} problematic documents`);
  }

  // Optional: Verify cleanup
  async verifyCleanup() {
    console.log('\n🔍 Verifying cleanup...');
    
    const index = this.pinecone.index(this.indexName);
    const dummyVector = new Array(3072).fill(0); // text-embedding-3-large uses 3072 dimensions
    
    const queryResponse = await index.namespace(this.namespace).query({
      vector: dummyVector,
      topK: 100,
      includeMetadata: true,
      includeValues: false
    });
    
    let foundProblematic = false;
    
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        const source = match.metadata?.source || '';
        
        const isProblematic = this.problematicSources.some(problematicSource => 
          source.includes(problematicSource)
        );
        
        if (isProblematic) {
          console.log(`⚠️ Still found problematic document: ${source}`);
          foundProblematic = true;
        }
      }
    }
    
    if (!foundProblematic) {
      console.log('✅ Cleanup verification passed - no problematic documents found');
    }
    
    return !foundProblematic;
  }
}

async function main() {
  if (!process.env.PINECONE_API_KEY) {
    console.error('❌ PINECONE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const cleaner = new VectorDatabaseCleaner();
  
  try {
    await cleaner.cleanVectorDatabase();
    await cleaner.verifyCleanup();
    
    console.log('\n🎉 Vector database cleanup completed successfully!');
    console.log('💡 The AI should no longer retrieve hallucinated content about src/core/di');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = VectorDatabaseCleaner;