#!/usr/bin/env node

/**
 * Vector Store Refresh Script - Main Branch Only
 * 
 * Ensures repository processing uses MAIN branch (not amber branch)
 * to replace old cached chunks in the vector store
 */

const DataPreparationPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/dataPreparationPipeline');

async function refreshVectorStoreMainBranch() {
  console.log('🚀 REFRESHING VECTOR STORE - MAIN BRANCH ONLY');
  console.log('==============================================');
  console.log('📌 ENSURING MAIN BRANCH (NOT AMBER) IS PROCESSED');
  console.log('');
  
  try {
    // Initialize the data preparation pipeline
    const pipeline = new DataPreparationPipeline();
    
    // Repository information - EXPLICITLY SET TO MAIN BRANCH
    const userId = 'main-branch-refresh';
    const repoId = 'anatolyZader/vc-3';
    const repoData = {
      url: 'https://github.com/anatolyZader/vc-3.git',
      branch: 'main', // EXPLICITLY SET TO MAIN BRANCH
      githubOwner: 'anatolyZader',
      repoName: 'vc-3', 
      description: 'EventStorm repository refresh - MAIN branch with enhanced chunking',
      timestamp: new Date().toISOString(),
      forceBranch: 'main' // Additional safety parameter
    };
    
    console.log(`📦 Processing repository: ${repoId}`);
    console.log(`🌿 Branch: ${repoData.branch} (MAIN - NOT AMBER)`);
    console.log(`🔧 Enhanced chunking: ENABLED`);
    console.log(`🚫 Client code exclusion: ENABLED`);
    console.log('');
    
    // Verify current git branch
    console.log('🔍 VERIFYING CURRENT REPOSITORY BRANCH:');
    const { execSync } = require('child_process');
    try {
      const currentBranch = execSync('git branch --show-current', { cwd: __dirname, encoding: 'utf8' }).trim();
      console.log(`📋 Local repository branch: ${currentBranch}`);
      if (currentBranch !== 'main') {
        console.log(`⚠️  WARNING: Local repo is on '${currentBranch}' branch, but processing 'main' branch from GitHub`);
      } else {
        console.log(`✅ CONFIRMED: Processing main branch`);
      }
    } catch (error) {
      console.log(`⚠️  Could not determine local branch: ${error.message}`);
    }
    console.log('');
    
    // Process the repository - this will use enhanced chunking on MAIN branch
    console.log('🔄 STARTING MAIN BRANCH PROCESSING...');
    const result = await pipeline.processPushedRepo(userId, repoId, repoData);
    
    if (result.success) {
      console.log('');
      console.log('✅ MAIN BRANCH VECTOR STORE REFRESH COMPLETED!');
      console.log('==============================================');
      console.log(`📊 Documents processed: ${result.documentsProcessed || result.data?.documentsProcessed || 'N/A'}`);
      console.log(`🧩 Chunks generated: ${result.chunksGenerated || result.data?.chunksGenerated || 'N/A'}`);
      console.log(`🔄 Processing type: ${result.isIncremental ? 'Incremental' : 'Full'}`);
      console.log(`📅 Processed at: ${result.processedAt || new Date().toISOString()}`);
      console.log(`🌿 Branch processed: main (replacing amber branch chunks)`);
      
      if (result.commitHash) {
        console.log(`🔑 Commit hash: ${result.commitHash.substring(0, 8)}`);
      }
      
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('1. Run a RAG query to test main branch chunks');
      console.log('2. Check LangSmith trace - should show "branch": "main"');
      console.log('3. Verify no more "branch": "amber" chunks appear');
      console.log('4. Confirm enhanced chunking and client exclusion working');
      
    } else {
      console.error('❌ MAIN BRANCH REFRESH FAILED:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 ERROR during main branch vector store refresh:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the main branch refresh
refreshVectorStoreMainBranch();
