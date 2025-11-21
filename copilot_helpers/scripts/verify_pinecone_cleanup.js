#!/usr/bin/env node

/**
 * Pinecone Vector Store Verification Script
 * Checks if manual cleanup was successful
 */

async function verifyPineconeCleanup() {
  console.log('🔍 PINECONE CLEANUP VERIFICATION');
  console.log('================================');
  console.log('');
  
  console.log('📋 STEPS TO VERIFY MANUAL PINECONE CLEANUP:');
  console.log('');
  console.log('1. **In Pinecone Console**:');
  console.log('   - Check if amber branch vectors are deleted');
  console.log('   - Verify vector count has decreased');
  console.log('   - Look for any remaining "branch": "amber" metadata');
  console.log('');
  console.log('2. **Test RAG System**:');
  console.log('   - Ask a question in EventStorm chat');
  console.log('   - Check trace analysis for branch metadata');
  console.log('   - Should see "branch": "main" or no old amber chunks');
  console.log('');
  console.log('3. **Force Re-indexing** (if needed):');
  console.log('   - Make a small commit to main branch');
  console.log('   - Push to trigger automatic re-processing');
  console.log('   - System will create fresh embeddings');
  console.log('');
  
  console.log('🎯 EXPECTED RESULTS AFTER CLEANUP:');
  console.log('- No more "branch": "amber" in trace logs');
  console.log('- Fresh "processedAt" timestamps (today)');
  console.log('- "branch": "main" in new embeddings');
  console.log('- Consistent main branch content in RAG responses');
  console.log('');
  
  console.log('⚠️  IF ISSUES PERSIST:');
  console.log('- Clear browser cache');
  console.log('- Restart EventStorm server');
  console.log('- Check for local vector store caches');
  console.log('- Verify Pinecone API key and project settings');
  console.log('');
  
  console.log('🚀 NEXT STEPS:');
  console.log('1. Go to Pinecone Console now');
  console.log('2. Delete vectors with "branch": "amber"');
  console.log('3. Test with a new chat question');
  console.log('4. Verify trace shows main branch content');
}

verifyPineconeCleanup();
