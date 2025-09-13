#!/usr/bin/env node

/**
 * Local Repository Vector Store Refresh
 * Processes the current local repository state to update vector embeddings
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function refreshLocalVectorStore() {
  console.log('🔄 LOCAL VECTOR STORE REFRESH');
  console.log('================================');
  console.log('🎯 Processing current local repository state');
  console.log('🌿 Branch: main (replacing amber branch chunks)');
  console.log('');

  try {
    // Verify we're on main branch
    const currentBranch = execSync('git branch --show-current', { 
      cwd: process.cwd(), 
      encoding: 'utf8' 
    }).trim();
    
    const commitHash = execSync('git rev-parse HEAD', { 
      cwd: process.cwd(), 
      encoding: 'utf8' 
    }).trim();

    console.log(`📋 Current branch: ${currentBranch}`);
    console.log(`🔑 Current commit: ${commitHash.substring(0, 8)}`);
    
    if (currentBranch !== 'main') {
      console.log(`⚠️  WARNING: You're on '${currentBranch}' branch, not 'main'`);
      console.log('💡 Switch to main branch with: git checkout main');
      return;
    }

    console.log('');
    console.log('🔍 ANALYSIS: Why amber branch chunks are still showing');
    console.log('- Vector database contains cached embeddings from amber branch');
    console.log('- These were created on 2025-07-14 (4 months ago)');
    console.log('- Current RAG queries retrieve these stale embeddings');
    console.log('- Solution: Need to regenerate embeddings from current main branch');
    console.log('');

    // Check if DataPreparationPipeline is available locally
    const pipelinePath = path.join(__dirname, 'business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/dataPreparationPipeline.js');
    
    if (fs.existsSync(pipelinePath)) {
      console.log('✅ Found DataPreparationPipeline locally');
      console.log('🚀 Attempting local processing...');
      
      // Import the pipeline
      const DataPreparationPipeline = require(pipelinePath);
      const pipeline = new DataPreparationPipeline();
      
      // Process current repository state
      const repoData = {
        url: `file://${process.cwd()}`,
        branch: 'main',
        githubOwner: 'anatolyZader',
        repoName: 'vc-3',
        description: 'Local main branch refresh - replacing amber chunks',
        timestamp: new Date().toISOString(),
        forceBranch: 'main',
        localPath: process.cwd(),
        isLocal: true
      };

      console.log('📦 Processing local repository...');
      const result = await pipeline.processPushedRepo('local-main-refresh', 'anatolyZader/vc-3', repoData);
      
      if (result.success) {
        console.log('');
        console.log('✅ LOCAL REFRESH COMPLETED!');
        console.log('============================');
        console.log(`📊 Result: ${JSON.stringify(result, null, 2)}`);
      } else {
        console.log('❌ Local refresh failed:', result.error);
      }
      
    } else {
      console.log('⚠️  DataPreparationPipeline not found locally');
      console.log('');
      console.log('🛠️  ALTERNATIVE SOLUTIONS:');
      console.log('');
      console.log('1. **Wait for Natural Refresh**:');
      console.log('   - Make a small commit and push to trigger auto-refresh');
      console.log('   - This should regenerate embeddings from main branch');
      console.log('');
      console.log('2. **Manual Service Restart**:');
      console.log('   - Restart the EventStorm server');
      console.log('   - Clear any in-memory caches');
      console.log('');
      console.log('3. **Verify Current Behavior**:');
      console.log('   - Ask another question in chat');
      console.log('   - Check if trace still shows "branch": "amber"');
      console.log('   - Monitor for automatic updates');
      console.log('');
      console.log('4. **Check Vector Store Configuration**:');
      console.log('   - Verify Pinecone or vector store settings');
      console.log('   - Ensure embeddings are properly updated');
    }

    console.log('');
    console.log('🎯 VERIFICATION STEPS:');
    console.log('1. Ask a new question in the chat interface');
    console.log('2. Check the trace analysis file for branch metadata');
    console.log('3. Look for "branch": "main" instead of "branch": "amber"');
    console.log('4. Verify processedAt timestamp is recent');

  } catch (error) {
    console.error('❌ Error during local refresh:', error.message);
    console.log('');
    console.log('📊 SUMMARY OF ISSUE:');
    console.log('- Problem: RAG system serving amber branch content from July 2025');
    console.log('- Current: Working on main branch but getting amber branch results');
    console.log('- Root cause: Vector store contains stale embeddings');
    console.log('- Solution needed: Refresh embeddings with main branch content');
  }
}

refreshLocalVectorStore();
