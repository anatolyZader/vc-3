#!/usr/bin/env node

/**
 * Manual Repository Processing Trigger
 * 
 * This script manually triggers the repository processing that should happen
 * automatically via PubSub events from GitHub Actions deployment.
 * 
 * The issue: GitHub Actions publishes PubSub events to Google Cloud, but
 * local development environment doesn't listen to cloud PubSub events.
 */

require('dotenv').config();
const DataPreparationPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/dataPreparationPipeline');

async function manualRepositoryProcessing() {
  console.log('🔧 MANUAL REPOSITORY PROCESSING TRIGGER');
  console.log('==========================================');
  console.log('🎯 Simulating the automatic processing that should happen after deployment');
  console.log('');
  
  try {
    // Initialize the data preparation pipeline
    const pipeline = new DataPreparationPipeline();
    
    // Repository information - matches what GitHub Actions would send
    const userId = 'github-actions'; // Same as in deploy.yml
    const repoId = 'anatolyZader/vc-3'; // Same as in deploy.yml
    const repoData = {
      url: 'https://github.com/anatolyZader/vc-3',
      branch: 'main',
      githubOwner: 'anatolyZader',
      repoName: 'vc-3',
      description: 'EventStorm repository - automatic processing after deployment',
      timestamp: new Date().toISOString(),
      source: 'manual-trigger-post-deployment'
    };
    
    console.log(`📦 Processing repository: ${repoId}`);
    console.log(`🌿 Branch: ${repoData.branch}`);
    console.log(`🤖 User: ${userId} (simulating GitHub Actions)`);
    console.log(`🔧 Enhanced chunking: ENABLED`);
    console.log(`🚫 Client code exclusion: ENABLED`);
    console.log('');
    
    // Check current Pinecone configuration
    console.log('🔍 VERIFYING PINECONE CONFIGURATION:');
    console.log(`📊 PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? 'Set' : 'Missing'}`);
    console.log(`📊 PINECONE_REGION: ${process.env.PINECONE_REGION || 'Not set'}`);
    console.log(`📊 PINECONE_INDEX_NAME: ${process.env.PINECONE_INDEX_NAME || 'Not set'}`);
    console.log(`📊 OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}`);
    console.log('');
    
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required');
    }
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    
    // Process the repository
    console.log('🔄 STARTING REPOSITORY PROCESSING...');
    console.log('⏱️  This may take several minutes depending on repository size');
    console.log('');
    
    const startTime = Date.now();
    const result = await pipeline.processPushedRepo(userId, repoId, repoData);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (result.success) {
      console.log('');
      console.log('✅ REPOSITORY PROCESSING COMPLETED!');
      console.log('====================================');
      console.log(`📊 Documents processed: ${result.documentsProcessed || result.data?.documentsProcessed || 'N/A'}`);
      console.log(`🧩 Chunks generated: ${result.chunksGenerated || result.data?.chunksGenerated || 'N/A'}`);
      console.log(`🔄 Processing type: ${result.isIncremental ? 'Incremental' : 'Full'}`);
      console.log(`⏱️  Processing time: ${duration}s`);
      console.log(`📅 Processed at: ${result.processedAt || new Date().toISOString()}`);
      console.log(`🌿 Branch processed: ${repoData.branch}`);
      
      if (result.commitHash) {
        console.log(`🔑 Commit hash: ${result.commitHash.substring(0, 8)}`);
      }
      
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('1. ✅ Vector store should now be populated');
      console.log('2. 🧪 Test RAG queries in your chat interface');
      console.log('3. 🔍 Should get contextual responses instead of generic ones');
      console.log('4. 🚀 Try asking: "How does the git module work in eventstorm.me?"');
      
    } else {
      console.error('❌ REPOSITORY PROCESSING FAILED:', result.error);
      console.log('');
      console.log('🔧 TROUBLESHOOTING:');
      console.log('1. Check that all environment variables are set correctly');
      console.log('2. Verify Pinecone index exists and is accessible');
      console.log('3. Ensure OpenAI API key has sufficient credits');
      console.log('4. Check network connectivity to external services');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 ERROR during repository processing:', error.message);
    console.error('📋 Stack trace:', error.stack);
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('1. Ensure you are in the backend directory');
    console.log('2. Check that .env file contains all required variables');
    console.log('3. Verify all npm dependencies are installed');
    console.log('4. Check if local development server is running');
    process.exit(1);
  }
}

// Run the manual processing
console.log('🚀 Starting manual repository processing...');
console.log('This simulates what should happen automatically after GitHub deployment.');
console.log('');

manualRepositoryProcessing();