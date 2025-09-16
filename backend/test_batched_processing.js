#!/usr/bin/env node
require('dotenv').config();

// Mock repository manager for testing
const mockRepositoryManager = {
  sanitizeId: (id) => id.replace(/[^a-zA-Z0-9_]/g, '_'),
  getFileType: (source) => {
    if (source.endsWith('.js') || source.endsWith('.ts')) return 'code';
    if (source.endsWith('.md')) return 'markdown';
    if (source.endsWith('.json')) return 'json';
    return 'other';
  },
  cloneRepository: async (url, branch) => '/tmp/test',
  getCommitHash: async (path) => 'abc123',
  getCommitInfo: async (path) => ({
    hash: 'abc123',
    timestamp: new Date().toISOString(),
    author: 'test'
  }),
  cleanupTempDir: async (path) => {}
};

const OptimizedRepositoryProcessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/optimizedRepositoryProcessor');

async function testBatchedProcessing() {
  console.log('🧪 Testing Batched Repository Processing...');
  
  const processor = new OptimizedRepositoryProcessor({
    repositoryManager: mockRepositoryManager
  });
  
  try {
    const repoUrl = 'https://github.com/anatolyZader/vc-3';
    const branch = 'main';
    const commitInfo = {
      hash: 'test123',
      timestamp: new Date().toISOString(),
      author: 'test'
    };
    
    console.log('🔄 Starting batched document loading...');
    const startTime = Date.now();
    
    const documents = await processor.loadDocumentsWithLangchain(
      repoUrl, 
      branch, 
      'anatolyZader', 
      'vc-3', 
      commitInfo
    );
    
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ BATCHED PROCESSING SUCCESS!`);
    console.log(`📊 Results:`);
    console.log(`   - Total documents: ${documents.length}`);
    console.log(`   - Processing time: ${loadTime}ms`);
    console.log(`   - Average time per doc: ${Math.round(loadTime / documents.length)}ms`);
    
    // Show batch distribution
    const batchStats = {};
    documents.forEach(doc => {
      const batchName = doc.metadata.batch_name || 'Unknown';
      batchStats[batchName] = (batchStats[batchName] || 0) + 1;
    });
    
    console.log(`📈 Batch Distribution:`);
    Object.entries(batchStats).forEach(([batch, count]) => {
      console.log(`   - ${batch}: ${count} documents`);
    });
    
    // Show file type distribution
    const typeStats = {};
    documents.forEach(doc => {
      const fileType = doc.metadata.file_type || 'Unknown';
      typeStats[fileType] = (typeStats[fileType] || 0) + 1;
    });
    
    console.log(`📁 File Type Distribution:`);
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} documents`);
    });
    
    // Show some sample documents
    console.log(`📄 Sample Documents:`);
    documents.slice(0, 5).forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.metadata.source} (${doc.pageContent.length} chars, batch: ${doc.metadata.batch_name})`);
    });
    
  } catch (error) {
    console.error('❌ Batched processing failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testBatchedProcessing();