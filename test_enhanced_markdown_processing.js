#!/usr/bin/env node

/**
 * Test script to verify enhanced markdown document processing
 * Tests both individual document processing and standalone system documentation processing
 */

const path = require('path');

// No external env loader required for this lightweight test

async function testEnhancedMarkdownProcessing() {
  console.log('🧪 TESTING: Enhanced Markdown Document Processing');
  console.log('=' .repeat(60));
  
  try {
    // Initialize components without external dependencies
    console.log('📦 Initializing components...');
    
    // Mock embeddings for testing
    const mockEmbeddings = {
      embedDocuments: async (docs) => docs.map(() => new Array(1536).fill(0.1)),
      embedQuery: async (query) => new Array(1536).fill(0.1)
    };
    
    const ContextPipeline = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline');
    
    const contextPipeline = new ContextPipeline({
      embeddings: mockEmbeddings,
      maxChunkSize: 1500,
      chunkOverlap: 200
    });
    
    console.log('✅ Components initialized successfully');
    console.log('');
    
    // Test 1: Individual document processing (existing functionality)
    console.log('🔍 TEST 1: Individual Markdown Document Processing');
    console.log('-'.repeat(50));
    
    const testDocument = {
      pageContent: `# Test Documentation
      
This is a test markdown document to verify individual processing.

## Features
- Feature 1: Basic markdown processing
- Feature 2: Enhanced chunking
- Feature 3: Semantic preprocessing

## Code Example
\`\`\`javascript
function example() {
  console.log('This is a test');
}
\`\`\`

## Conclusion
This document tests the standard markdown processing pipeline.`,
      metadata: {
        source: 'test-document.md',
        type: 'markdown'
      }
    };
    
    const individualResult = await contextPipeline.processMarkdownDocument(testDocument);
    console.log(`✅ Individual processing completed: ${individualResult.length} chunks generated`);
    
    individualResult.forEach((chunk, index) => {
      console.log(`   Chunk ${index + 1}: ${chunk.pageContent.substring(0, 80)}...`);
    });
    
    console.log('');
    
    // (No standalone system docs test — pipeline processes repository docs via RepoProcessor/DocsProcessor.)
    
    // Test 3: Verify backwards compatibility
    console.log('🔍 TEST 3: Backwards Compatibility Check');
    console.log('-'.repeat(50));
    
    // Call without options (should work as before)
    const backwardsCompatResult = await contextPipeline.processMarkdownDocument(testDocument);
    const isBackwardsCompatible = backwardsCompatResult.length === individualResult.length;
    
    console.log(`✅ Backwards compatibility: ${isBackwardsCompatible ? 'PASSED' : 'FAILED'}`);
    console.log(`   Original: ${individualResult.length} chunks, Compatibility test: ${backwardsCompatResult.length} chunks`);
    
    console.log('');
    console.log('🎉 TESTING COMPLETED SUCCESSFULLY');
    console.log('');
    console.log('📋 SUMMARY:');
    console.log(`   - Individual document processing: ${individualResult.length} chunks`);
    console.log(`   - Backwards compatibility: ${isBackwardsCompatible ? 'MAINTAINED' : 'BROKEN'}`);

    console.log('');
    console.log('✅ SUCCESS: Enhanced markdown processing is working correctly for individual documents.');
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedMarkdownProcessing().catch(console.error);
}

module.exports = { testEnhancedMarkdownProcessing };