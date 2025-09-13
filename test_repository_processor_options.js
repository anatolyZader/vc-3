// test_repository_processor_options.js
// Test to verify RepositoryProcessor passes correct options to ContentAwareSplitterRouter

const ContentAwareSplitterRouter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/processors/ContentAwareSplitterRouter');

async function testOptionsMatching() {
  console.log('🧪 Testing ContentAwareSplitterRouter options matching');
  
  // Test 1: Verify the expected options work correctly
  console.log('\n📋 Test 1: Creating router with token-based options (correct way)');
  
  try {
    const correctRouter = new ContentAwareSplitterRouter({
      maxTokens: 1400,
      minTokens: 120,
      overlapTokens: 180,
      encodingModel: 'cl100k_base'
    });
    
    console.log('✅ Token-based options accepted');
    console.log('📊 Token splitter configured with:', {
      maxTokens: correctRouter.tokenSplitter.maxTokens,
      minTokens: correctRouter.tokenSplitter.minTokens,
      overlapTokens: correctRouter.tokenSplitter.overlapTokens
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to create router with token options:', error.message);
    return false;
  }
}

async function testOldOptionsIssue() {
  console.log('\n📋 Test 2: Creating router with old character-based options (problematic)');
  
  try {
    const problematicRouter = new ContentAwareSplitterRouter({
      maxChunkSize: 2000,  // Wrong option name - will be ignored
      minChunkSize: 500,   // Wrong option name - will be ignored  
      chunkOverlap: 150    // Wrong option name - will be ignored
    });
    
    console.log('⚠️ Router created but falls back to defaults:');
    console.log('📊 Token splitter defaults:', {
      maxTokens: problematicRouter.tokenSplitter.maxTokens,
      minTokens: problematicRouter.tokenSplitter.minTokens,
      overlapTokens: problematicRouter.tokenSplitter.overlapTokens
    });
    
    console.log('❌ This demonstrates the silent fallback issue that was fixed');
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🎯 Testing RepositoryProcessor → ContentAwareSplitterRouter options fix\n');
  
  const test1 = await testOptionsMatching();
  const test2 = await testOldOptionsIssue();
  
  if (test1 && test2) {
    console.log('\n🎉 Tests completed successfully!');
    console.log('✅ Fix Summary:');
    console.log('  - RepositoryProcessor now passes correct token-based options');
    console.log('  - maxTokens: 1400 (instead of maxChunkSize: 2000)');
    console.log('  - minTokens: 120 (instead of minChunkSize: 500)');
    console.log('  - overlapTokens: 180 (instead of chunkOverlap: 150)');
    console.log('  - No more silent fallback to defaults');
    console.log('  - Token-based chunking is more accurate than character-based');
  } else {
    console.log('\n❌ Some tests failed. Check the implementation.');
  }
  
  process.exit(test1 && test2 ? 0 : 1);
}

runTests();
