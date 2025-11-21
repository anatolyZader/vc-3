#!/usr/bin/env node
/**
 * Analyze Vector Chunking - See how files are split into chunks
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function analyzeChunking() {
  console.log('📊 Analyzing vector chunking patterns...');
  
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
  const namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
  
  const index = pinecone.index(indexName);
  const dummyVector = new Array(3072).fill(0);
  
  try {
    // Get sample of vectors to analyze chunking
    const queryResponse = await index.namespace(namespace).query({
      vector: dummyVector,
      topK: 200, // Get a good sample
      includeMetadata: true,
      includeValues: false
    });
    
    const sourceStats = {};
    let totalVectors = 0;
    
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        totalVectors++;
        const source = match.metadata?.source || 'NO_SOURCE';
        const chunkIndex = match.metadata?.chunkIndex;
        const chunkSize = match.metadata?.chunkSize;
        const text = match.metadata?.text || '';
        
        if (!sourceStats[source]) {
          sourceStats[source] = {
            chunks: [],
            totalChunks: 0,
            avgChunkSize: 0,
            totalSize: 0
          };
        }
        
        sourceStats[source].chunks.push({
          id: match.id,
          chunkIndex: chunkIndex || 'unknown',
          size: text.length,
          preview: text.substring(0, 100) + '...'
        });
        
        sourceStats[source].totalChunks++;
        sourceStats[source].totalSize += text.length;
      }
    }
    
    // Calculate averages and sort by chunk count
    for (const source in sourceStats) {
      const stats = sourceStats[source];
      stats.avgChunkSize = Math.round(stats.totalSize / stats.totalChunks);
    }
    
    const sortedSources = Object.entries(sourceStats)
      .sort(([,a], [,b]) => b.totalChunks - a.totalChunks)
      .slice(0, 20); // Top 20 most chunked files
    
    console.log(`\n📊 CHUNKING ANALYSIS (Top 20 files by chunk count):`);
    console.log(`Total vectors analyzed: ${totalVectors}`);
    console.log(`Unique source files: ${Object.keys(sourceStats).length}`);
    console.log('\n' + '='.repeat(80));
    
    sortedSources.forEach(([source, stats], index) => {
      console.log(`\n${index + 1}. 📄 ${source}`);
      console.log(`   📦 Chunks: ${stats.totalChunks}`);
      console.log(`   📏 Avg chunk size: ${stats.avgChunkSize} chars`);
      console.log(`   📊 Total content: ${stats.totalSize} chars`);
      
      // Show first few chunks
      if (stats.chunks.length > 0) {
        console.log(`   🔍 Sample chunks:`);
        stats.chunks.slice(0, 3).forEach((chunk, i) => {
          console.log(`      ${i + 1}. [${chunk.chunkIndex}] ${chunk.size} chars: "${chunk.preview}"`);
        });
        if (stats.chunks.length > 3) {
          console.log(`      ... and ${stats.chunks.length - 3} more chunks`);
        }
      }
    });
    
    // Check for problematic chunks
    console.log('\n' + '='.repeat(80));
    console.log('🚨 PROBLEMATIC CONTENT ANALYSIS:');
    
    let hallucinationChunks = 0;
    let debugChunks = 0;
    
    for (const [source, stats] of Object.entries(sourceStats)) {
      for (const chunk of stats.chunks) {
        if (chunk.preview.toLowerCase().includes('src/core/di')) {
          hallucinationChunks++;
          console.log(`⚠️ HALLUCINATION: ${source} chunk [${chunk.chunkIndex}]`);
          console.log(`   Content: "${chunk.preview}"`);
        }
        
        if (source.includes('debug_') || source.includes('trace-') || source.includes('langsmith')) {
          debugChunks++;
        }
      }
    }
    
    console.log(`\n📊 PROBLEMATIC CONTENT SUMMARY:`);
    console.log(`🚨 Chunks containing 'src/core/di': ${hallucinationChunks}`);
    console.log(`🐛 Debug/trace file chunks: ${debugChunks}`);
    
    if (hallucinationChunks > 0) {
      console.log(`\n💡 RECOMMENDATION: These ${hallucinationChunks} chunks contain hallucinated content`);
      console.log(`   and should be removed from the vector database.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeChunking();