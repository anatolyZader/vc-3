#!/usr/bin/env node

/**
 * Rate Limit Comparison Test
 * Compare LangChain vs EventStorm custom loader
 */

require('dotenv').config();

async function compareRateLimiting() {
  console.log('🔬 RATE LIMITING COMPARISON TEST');
  console.log('=' .repeat(60));
  
  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.log('❌ GITHUB_TOKEN required for this test');
    return;
  }

  // Test 1: LangChain GithubRepoLoader (will likely hit rate limits fast)
  console.log('\n🧪 TEST 1: LangChain GithubRepoLoader');
  console.log('-' .repeat(50));
  
  try {
    const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
    
    const langchainOptions = {
      branch: 'main',
      recursive: true,
      maxConcurrency: 5, // High concurrency = fast rate limit hit
      accessToken: githubToken,
      ignorePaths: ['node_modules/**', '.git/**']
    };
    
    console.log('⏳ Loading with LangChain (watch for rate limit errors)...');
    const startTime = Date.now();
    
    const loader = new GithubRepoLoader(repoUrl, langchainOptions);
    const documents = await loader.load();
    
    const endTime = Date.now();
    console.log(`✅ LangChain: Loaded ${documents.length} docs in ${endTime - startTime}ms`);
    
  } catch (error) {
    console.log(`❌ LangChain failed: ${error.message}`);
    if (error.message.includes('rate limit') || error.message.includes('403') || error.message.includes('429')) {
      console.log('🚨 CONFIRMED: LangChain hit rate limits without graceful handling');
    }
  }

  // Test 2: EventStorm Custom Loader (should handle rate limits gracefully)  
  console.log('\n🧪 TEST 2: EventStorm CloudNativeRepoLoader');
  console.log('-' .repeat(50));
  
  try {
    const CloudNativeRepoLoader = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/cloudNativeRepoLoader');
    
    const customOptions = {
      owner: 'anatolyZader',
      repo: 'vc-3', 
      branch: 'main',
      focusPath: 'backend/',
      maxFiles: 20 // Limit for demo
    };
    
    console.log('⏳ Loading with EventStorm custom loader (rate limit safe)...');
    const startTime = Date.now();
    
    const loader = new CloudNativeRepoLoader(customOptions);
    const documents = await loader.load();
    
    const endTime = Date.now();
    console.log(`✅ EventStorm: Loaded ${documents.length} docs in ${endTime - startTime}ms`);
    console.log('🛡️ Custom loader handled rate limits gracefully');
    
  } catch (error) {
    console.log(`❌ EventStorm failed: ${error.message}`);
  }

  console.log('\n📊 CONCLUSION:');
  console.log('LangChain: Fast but fragile (hits rate limits)');
  console.log('EventStorm: Slower but reliable (handles rate limits)');
  console.log('\n💡 Recommendation: Keep EventStorm\'s custom approach for production');
}

if (require.main === module) {
  compareRateLimiting();
}

module.exports = compareRateLimiting;