/**
 * Test ChunkPostprocessor - Embedding Contamination Safety
 * Verifies NO concatenated fields exist that could pollute embeddings
 */

const ChunkPostprocessor = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/chunkPostprocessor.js');

async function testEmbeddingContaminationSafety() {
  console.log('🛡️  Testing Embedding Contamination Safety\n');
  
  const processor = new ChunkPostprocessor();
  
  const testChunk = {
    pageContent: `function calculatePrice(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`,
    metadata: {
      source: '/test/pricing.js',
      file_type: 'code',
      language: 'javascript'
    }
  };

  const originalDocument = {
    metadata: {
      source: '/test/pricing.js',
      file_type: 'code',
      language: 'javascript',
      main_entities: ['calculatePrice']
    }
  };

  // Process the chunk
  const processedChunks = await processor.postprocessChunks([testChunk], originalDocument);
  const chunk = processedChunks[0];
  
  console.log('🔍 SAFETY CHECK 1: pageContent Purity');
  const originalContent = testChunk.pageContent;
  const processedContent = chunk.pageContent;
  
  console.log(`   Original: "${originalContent.substring(0, 50)}..."`);
  console.log(`   Processed: "${processedContent.substring(0, 50)}..."`);
  console.log(`   ✓ Identical: ${originalContent === processedContent ? '✅ SAFE' : '❌ CONTAMINATED'}`);
  console.log();

  console.log('🔍 SAFETY CHECK 2: No Concatenated Fields in Metadata');
  const metadata = chunk.metadata;
  const dangerousFields = [];
  
  // Check for any field that might contain concatenated content
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string' && value.includes(originalContent.substring(0, 20))) {
      dangerousFields.push(key);
    }
  }
  
  console.log(`   Dangerous concatenated fields found: ${dangerousFields.length}`);
  if (dangerousFields.length > 0) {
    console.log(`   ❌ CONTAMINATION RISK: ${dangerousFields.join(', ')}`);
  } else {
    console.log(`   ✅ NO CONTAMINATION: No fields mix content with synthetic data`);
  }
  console.log();

  console.log('🔍 SAFETY CHECK 3: Synthetic Questions Isolation');
  const questions = metadata.synthetic_questions;
  console.log(`   Synthetic questions generated: ${questions?.length || 0}`);
  if (questions && questions.length > 0) {
    console.log(`   Sample: "${questions[0]}"`);
    console.log(`   ✓ Stored as pure array: ${Array.isArray(questions) ? '✅' : '❌'}`);
    console.log(`   ✓ Not concatenated anywhere: ${!JSON.stringify(metadata).includes(questions[0] + ' ') ? '✅' : '❌'}`);
  }
  console.log();

  console.log('🔍 SAFETY CHECK 4: Sparse Terms Extraction');
  const sparseData = processor.extractSparseTerms(chunk);
  console.log(`   Sparse terms count: ${sparseData.sparse_terms.length}`);
  console.log(`   Warning present: ${sparseData.warning ? '✅' : '❌'}`);
  console.log(`   Sample sparse terms: ${sparseData.sparse_terms.slice(0, 3).join(', ')}`);
  console.log(`   ✓ Separate from embeddings: ${sparseData.warning.includes('NOT_FOR_EMBEDDINGS') ? '✅' : '❌'}`);
  console.log();

  console.log('🔍 SAFETY CHECK 5: Metadata Field Audit');
  const safeMetadataFields = [
    'file_header', 'context_prev', 'context_next', 'related_imports',
    'synthetic_questions', 'keywords', 'quality_score', 'content_category',
    'complexity_level', 'estimated_tokens', 'postprocessed_at'
  ];
  
  const actualFields = Object.keys(metadata).filter(key => !key.startsWith('_'));
  const unexpectedFields = actualFields.filter(field => !safeMetadataFields.includes(field));
  
  console.log(`   Expected safe fields: ${safeMetadataFields.length}`);
  console.log(`   Actual fields: ${actualFields.length}`);
  console.log(`   Unexpected fields: ${unexpectedFields.length}`);
  
  if (unexpectedFields.length > 0) {
    console.log(`   ⚠️  Review needed: ${unexpectedFields.join(', ')}`);
  } else {
    console.log(`   ✅ All fields recognized as safe`);
  }
  console.log();

  console.log('🔍 SAFETY CHECK 6: Embedding Contract Compliance');
  const embeddingContract = {
    embeddable_field: 'pageContent',
    forbidden_fields: ['searchable_content', 'sparse_search_content', 'combined_content', 'enhanced_content'],
    metadata_only: ['synthetic_questions', 'keywords', 'file_header']
  };
  
  // Check no forbidden fields exist
  const forbiddenFound = embeddingContract.forbidden_fields.filter(field => 
    metadata.hasOwnProperty(field) || chunk.hasOwnProperty(field)
  );
  
  console.log(`   Embeddable field exists: ${chunk.hasOwnProperty(embeddingContract.embeddable_field) ? '✅' : '❌'}`);
  console.log(`   Forbidden fields found: ${forbiddenFound.length}`);
  console.log(`   Metadata-only fields present: ${embeddingContract.metadata_only.every(f => metadata.hasOwnProperty(f)) ? '✅' : '❌'}`);
  
  if (forbiddenFound.length > 0) {
    console.log(`   ❌ CONTRACT VIOLATION: ${forbiddenFound.join(', ')}`);
  } else {
    console.log(`   ✅ CONTRACT COMPLIANT: Safe for embedding`);
  }
  console.log();

  // FINAL VERDICT
  const allSafetyChecks = [
    originalContent === processedContent,
    dangerousFields.length === 0,
    Array.isArray(questions),
    sparseData.warning.includes('NOT_FOR_EMBEDDINGS'),
    forbiddenFound.length === 0
  ];
  
  const allPassed = allSafetyChecks.every(check => check);
  
  console.log('🎯 FINAL SAFETY VERDICT');
  console.log(`   pageContent purity: ${allSafetyChecks[0] ? '✅' : '❌'}`);
  console.log(`   No concatenation: ${allSafetyChecks[1] ? '✅' : '❌'}`);
  console.log(`   Questions isolated: ${allSafetyChecks[2] ? '✅' : '❌'}`);
  console.log(`   Sparse terms safe: ${allSafetyChecks[3] ? '✅' : '❌'}`);
  console.log(`   Contract compliant: ${allSafetyChecks[4] ? '✅' : '❌'}`);
  console.log();
  
  if (allPassed) {
    console.log('🎉 EMBEDDING SAFETY CONFIRMED');
    console.log('   ✓ Zero contamination risk');
    console.log('   ✓ Pure embeddings guaranteed');
    console.log('   ✓ Hybrid search data properly separated');
  } else {
    console.log('❌ EMBEDDING SAFETY FAILED');
    console.log('   Risk of vector contamination detected!');
  }
}

// Run the safety test
testEmbeddingContaminationSafety().catch(console.error);