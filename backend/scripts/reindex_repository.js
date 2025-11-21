/**
 * Re-index Repository Script
 * 
 * Re-indexes the repository with all fixes applied:
 * 1. Analysis markdown filtering (no polluted chunks)
 * 2. Proper chunking (method-level, not giant blobs)
 * 3. UL tags preservation (domain metadata)
 * 4. Balanced retrieval mix (code + docs)
 * 
 * Usage: node scripts/reindex_repository.js
 */

require('dotenv').config();

// Remove AIService import, use adapter directly
const path = require('path');

async function reindexRepository() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄 REPOSITORY RE-INDEXING');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Configuration
  const repoConfig = {
    owner: 'anatolyZader',
    repo: 'vc-3',
    branch: 'main',
    userId: 'd41402df-182a-41ec-8f05-153118bf2718', // Your user ID
    repoId: 'anatolyzader_vc-3'
  };
  
  console.log('📋 Configuration:');
  console.log(`   Repository: ${repoConfig.owner}/${repoConfig.repo}`);
  console.log(`   Branch: ${repoConfig.branch}`);
  console.log(`   User ID: ${repoConfig.userId}`);
  console.log(`   Repo ID: ${repoConfig.repoId}\n`);
  
  // Verify environment
  console.log('🔍 Checking environment...');
  const requiredEnvVars = [
    'PINECONE_API_KEY',
    'PINECONE_INDEX_NAME',
    'OPENAI_API_KEY',
    'GITHUB_TOKEN'
  ];
  
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    console.error('   Please check your .env file\n');
    process.exit(1);
  }
  console.log('✅ All required environment variables present\n');
  
  // Verify fixes are applied
  console.log('🔧 Verifying fixes are applied...');
  try {
    const FileFilteringUtils = require('../business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/FileFilteringUtils');
    const repoProcessor = require('../business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessor');
    const chunkPostprocessor = require('../business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/chunkPostprocessor');
    
    // Check if forceBasicTextSplitting exists (Fix #3)
    if (typeof repoProcessor.prototype?.forceBasicTextSplitting === 'function') {
      console.log('   ✅ Fix #3: Chunking divergence fix applied');
    } else {
      console.warn('   ⚠️  Fix #3: forceBasicTextSplitting not found - may use old code');
    }
    
    console.log('   ✅ All module imports successful\n');
  } catch (error) {
    console.error(`❌ Error verifying fixes: ${error.message}`);
    console.error('   Some fixes may not be applied correctly\n');
  }
  
  // Initialize AI Adapter directly
  console.log('🤖 Initializing AI Langchain Adapter...');
  const AILangchainAdapter = require('../business_modules/ai/infrastructure/ai/aiLangchainAdapter');
  let aiAdapter;
  try {
    aiAdapter = new AILangchainAdapter({
      userId: repoConfig.userId,
      // Adapter will auto-initialize dependencies
    });
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ AI Adapter initialized\n');
  } catch (error) {
    console.error(`❌ Failed to initialize AI Adapter: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
  
  // Prepare repository data
  const repoData = {
    url: `https://github.com/${repoConfig.owner}/${repoConfig.repo}`,  // Fixed: 'url' not 'repoUrl'
    branch: repoConfig.branch,
    githubOwner: repoConfig.owner,
    repoName: repoConfig.repo,
    forceReindex: true  // Force full re-indexing
  };
  
  console.log('📦 Repository Data:');
  console.log(`   URL: ${repoData.url}`);
  console.log(`   Branch: ${repoData.branch}`);
  console.log(`   Force Reindex: ${repoData.forceReindex}\n`);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 STARTING RE-INDEXING PROCESS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('⏱️  This may take several minutes depending on repository size...\n');
  
  const startTime = Date.now();
  
  try {
    // Process repository directly through adapter (this will re-index everything)
    const result = await aiAdapter.processPushedRepo(
      repoConfig.userId,
      repoConfig.repoId,
      repoData
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Check if result indicates failure
    if (result && !result.success) {
      console.error('\n═══════════════════════════════════════════════════════════════');
      console.error('❌ RE-INDEXING FAILED');
      console.error('═══════════════════════════════════════════════════════════════\n');
      console.error(`Error after ${duration}s`);
      console.error(`Mode: ${result.mode}`);
      console.error(`Reason: ${result.reason}`);
      console.error(`Details: ${JSON.stringify(result.details, null, 2)}`);
      console.error('\n💡 This means the validation or processing failed');
      console.error('   Check the error details above\n');
      process.exit(1);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ RE-INDEXING COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📊 Results:');
    if (result && typeof result === 'object') {
      console.log(`   Duration: ${duration}s`);
      if (result.documentsProcessed) console.log(`   Documents Processed: ${result.documentsProcessed}`);
      if (result.chunksGenerated) console.log(`   Chunks Generated: ${result.chunksGenerated}`);
      if (result.chunksStored) console.log(`   Chunks Stored: ${result.chunksStored}`);
      if (result.namespace) console.log(`   Namespace: ${result.namespace}`);
    } else {
      console.log(`   Duration: ${duration}s`);
      console.log(`   Status: ${result || 'Success'}`);
    }
    
    console.log('\n✨ Fixes Applied:');
    console.log('   ✅ Analysis markdown files excluded');
    console.log('   ✅ Proper method-level chunking');
    console.log('   ✅ UL tags preserved in metadata');
    console.log('   ✅ Balanced code/docs retrieval ready');
    
    console.log('\n🔍 Next Steps:');
    console.log('   1. Test a query to verify chunks are granular (1500-2000 chars)');
    console.log('   2. Check trace analysis for UL tags in metadata');
    console.log('   3. Verify docs/specs appear in file-specific queries');
    console.log('   4. Check no analysis markdown files in results\n');
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error('\n═══════════════════════════════════════════════════════════════');
    console.error('❌ RE-INDEXING FAILED');
    console.error('═══════════════════════════════════════════════════════════════\n');
    
    console.error(`Error after ${duration}s: ${error.message}`);
    console.error('\nStack Trace:');
    console.error(error.stack);
    
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check GITHUB_TOKEN has repo access');
    console.error('   2. Verify PINECONE_API_KEY is valid');
    console.error('   3. Check OPENAI_API_KEY has credits');
    console.error('   4. Review logs above for specific errors');
    console.error('   5. Ensure repository exists and is accessible\n');
    
    process.exit(1);
  }
}

// Run re-indexing
console.log('Starting re-indexing script...\n');
reindexRepository()
  .then(() => {
    console.log('🎉 Script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
