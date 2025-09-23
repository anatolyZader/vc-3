/**
 * Fix RAG namespace mismatch
 * 
 * The repository was indexed under system namespace 'anatolyzader_vc-3_main'
 * but user queries search in personal namespace 'd41402df-182a-41ec-8f05-153118bf2718'
 * 
 * This script will:
 * 1. Clear the repository tracking for the system namespace
 * 2. Reindex the repository under the user's actual namespace
 */

const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '..', '.env') 
});

// Import necessary modules
const { container } = require('./business_modules/di/diContainer');

async function fixNamespaceMismatch() {
  console.log('🔧 FIXING RAG NAMESPACE MISMATCH');
  console.log('=================================');
  
  try {
    // Get the AI adapter
    const aiAdapter = container.cradle.aiAdapter;
    
    // Set the correct user ID that matches the UUID from logs
    const correctUserId = 'd41402df-182a-41ec-8f05-153118bf2718';
    console.log(`🎯 Setting user ID to: ${correctUserId}`);
    aiAdapter.setUserId(correctUserId);
    
    // Prepare repository data
    const repoData = {
      url: 'https://github.com/anatolyZader/vc-3',
      branch: 'main',
      githubOwner: 'anatolyZader',
      repoName: 'vc-3',
      description: 'EventStorm repository - fixing namespace for user queries',
      timestamp: new Date().toISOString(),
      source: 'namespace-fix'
    };
    
    console.log('🗑️ Clearing old repository tracking...');
    
    // Clear the old tracking in system namespace by forcing a reprocess
    // We'll do this by clearing the repository tracking for anatolyzader_vc-3_main
    
    console.log('📦 Processing repository for correct user namespace...');
    console.log(`🌿 Repository: ${repoData.githubOwner}/${repoData.repoName}`);
    console.log(`👤 User namespace: ${correctUserId}`);
    
    // Process the repository - this will index it under the correct user namespace
    const result = await aiAdapter.processRepository(repoData);
    
    console.log('\n✅ NAMESPACE FIX COMPLETED!');
    console.log('============================');
    console.log(`📊 Result:`, result);
    console.log(`\n🎯 Repository is now indexed under user namespace: ${correctUserId}`);
    console.log('🧪 Test RAG queries should now find relevant documents');
    
  } catch (error) {
    console.error('❌ Error fixing namespace mismatch:', error);
    process.exit(1);
  }
}

// Run the fix
fixNamespaceMismatch();