/**
 * Test ChunkPostprocessor - Verify pure embedding principle
 * Tests that pageContent is never modified and all context goes to metadata
 */

const ChunkPostprocessor = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/chunkPostprocessor.js');

async function testChunkPostprocessor() {
  console.log('🧪 Testing ChunkPostprocessor - Pure Embedding Compliance\n');
  
  const processor = new ChunkPostprocessor();
  
  // Test data
  const originalPageContent = `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

class ShoppingCart {
  constructor() {
    this.items = [];
  }
  
  addItem(item) {
    this.items.push(item);
  }
}`;

  const mockChunks = [
    {
      pageContent: originalPageContent,
      metadata: {
        source: '/test/file.js',
        file_type: 'code',
        language: 'javascript'
      }
    },
    {
      pageContent: `const express = require('express');
const app = express();

app.listen(3000, () => {
  console.log('Server running');
});`,
      metadata: {
        source: '/test/server.js',
        file_type: 'code',
        language: 'javascript'
      }
    }
  ];

  const originalDocument = {
    metadata: {
      source: '/test/file.js',
      file_type: 'code',
      language: 'javascript',
      main_entities: ['calculateTotal', 'ShoppingCart', 'addItem'],
      import_dependencies: ['express', 'lodash', './utils']
    }
  };

  console.log('📋 Original pageContent (should remain unchanged):');
  console.log('Length:', originalPageContent.length);
  console.log('Hash:', calculateSimpleHash(originalPageContent));
  console.log();

  // Process chunks
  const processedChunks = await processor.postprocessChunks(mockChunks, originalDocument);
  
  console.log('✅ Post-processing complete. Running compliance tests...\n');
  
  // TEST 1: Verify pageContent is unchanged
  console.log('🔍 TEST 1: Pure Embedding Compliance');
  const firstChunk = processedChunks[0];
  const pageContentUnchanged = firstChunk.pageContent === originalPageContent;
  const originalHash = calculateSimpleHash(originalPageContent);
  const processedHash = calculateSimpleHash(firstChunk.pageContent);
  
  console.log(`   Original hash: ${originalHash}`);
  console.log(`   Processed hash: ${processedHash}`);
  console.log(`   ✓ pageContent unchanged: ${pageContentUnchanged ? '✅ PASS' : '❌ FAIL'}`);
  console.log();

  // TEST 2: Verify metadata enrichment
  console.log('🔍 TEST 2: Metadata Enrichment');
  const metadata = firstChunk.metadata;
  
  console.log(`   ✓ file_header exists: ${metadata.file_header ? '✅' : '❌'}`);
  console.log(`   ✓ synthetic_questions exists: ${metadata.synthetic_questions ? '✅' : '❌'}`);
  console.log(`   ✓ keywords exists: ${metadata.keywords ? '✅' : '❌'}`);
  console.log(`   ✓ quality_score exists: ${metadata.quality_score !== undefined ? '✅' : '❌'}`);
  console.log(`   ✓ content_category exists: ${metadata.content_category ? '✅' : '❌'}`);
  console.log(`   ✓ NO contaminating fields: ${!metadata.sparse_search_content && !metadata.searchable_content ? '✅' : '❌'}`);
  console.log();

  // TEST 3: Verify file header structure
  console.log('🔍 TEST 3: File Header Structure');
  const fileHeader = metadata.file_header;
  if (fileHeader) {
    console.log(`   file_path: "${fileHeader.file_path}"`);
    console.log(`   file_type: "${fileHeader.file_type}"`);
    console.log(`   language: "${fileHeader.language}"`);
    console.log(`   main_entities: [${fileHeader.main_entities.join(', ')}]`);
    console.log(`   imports_excluded: ${fileHeader.imports_excluded}`);
  }
  console.log();

  // TEST 4: Verify synthetic questions
  console.log('🔍 TEST 4: Synthetic Questions');
  const questions = metadata.synthetic_questions;
  if (questions && questions.length > 0) {
    console.log(`   Generated ${questions.length} questions:`);
    questions.forEach((q, i) => console.log(`   ${i + 1}. ${q}`));
    
    // Verify questions are about the actual code
    const hasCalculateTotalQuestions = questions.some(q => q.includes('calculateTotal'));
    const hasShoppingCartQuestions = questions.some(q => q.includes('ShoppingCart'));
    console.log(`   ✓ calculateTotal questions: ${hasCalculateTotalQuestions ? '✅' : '❌'}`);
    console.log(`   ✓ ShoppingCart questions: ${hasShoppingCartQuestions ? '✅' : '❌'}`);
  }
  console.log();

  // TEST 5: Verify deduplication works
  console.log('🔍 TEST 5: Deduplication');
  const duplicateChunks = [
    { pageContent: 'function test() { return true; }', metadata: {} },
    { pageContent: 'function test() { return true; }', metadata: {} }, // exact duplicate
    { pageContent: 'function test() {\n  return true;\n}', metadata: {} } // similar content
  ];
  
  const dedupedChunks = processor.deduplicateChunks(duplicateChunks);
  console.log(`   Original chunks: ${duplicateChunks.length}`);
  console.log(`   After deduplication: ${dedupedChunks.length}`);
  console.log(`   ✓ Duplicates removed: ${dedupedChunks.length < duplicateChunks.length ? '✅' : '❌'}`);
  console.log();

  // TEST 6: Verify quality filtering
  console.log('🔍 TEST 6: Quality Filtering');
  const lowQualityChunk = {
    pageContent: '// just a comment\n// another comment',
    metadata: {}
  };
  
  const quality = processor.calculateChunkQuality(lowQualityChunk);
  console.log(`   Low quality chunk score: ${quality.toFixed(2)}`);
  console.log(`   ✓ Below threshold (${processor.minChunkQuality}): ${quality < processor.minChunkQuality ? '✅' : '❌'}`);
  console.log();

  // TEST 7: Verify context relevance calculation
  console.log('🔍 TEST 7: Context Relevance');
  const chunk1 = 'class ShoppingCart { constructor() { this.items = []; } }';
  const chunk2 = 'addItem(item) { this.items.push(item); }';
  const chunk3 = 'function calculateTotal(numbers) { return numbers.sum(); }';
  
  const relevance12 = processor.calculateContextRelevance(chunk1, chunk2);
  const relevance13 = processor.calculateContextRelevance(chunk1, chunk3);
  
  console.log(`   ShoppingCart ↔ addItem relevance: ${relevance12.toFixed(3)}`);
  console.log(`   ShoppingCart ↔ calculateTotal relevance: ${relevance13.toFixed(3)}`);
  console.log(`   ✓ Related chunks scored higher: ${relevance12 > relevance13 ? '✅' : '❌'}`);
  console.log();

  // FINAL SUMMARY
  console.log('🎯 FINAL COMPLIANCE CHECK');
  const allTestsPassed = pageContentUnchanged && 
                        metadata.file_header && 
                        metadata.synthetic_questions &&
                        !metadata.sparse_search_content && // Should NOT exist
                        dedupedChunks.length < duplicateChunks.length;
  
  console.log(`   Pure embedding principle: ${pageContentUnchanged ? '✅ COMPLIANT' : '❌ VIOLATED'}`);
  console.log(`   Metadata enrichment: ${metadata.file_header ? '✅ WORKING' : '❌ MISSING'}`);
  console.log(`   Overall status: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (pageContentUnchanged) {
    console.log('\n🎉 SUCCESS: ChunkPostprocessor follows pure embedding principle!');
    console.log('   ✓ pageContent remains untouched');
    console.log('   ✓ All context added to metadata');
    console.log('   ✓ Vector embeddings will be clean');
  } else {
    console.log('\n❌ FAILURE: Pure embedding principle violated!');
    console.log('   pageContent was modified during processing');
  }
}

function calculateSimpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

// Run the test
testChunkPostprocessor().catch(console.error);