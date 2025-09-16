#!/usr/bin/env node
require('dotenv').config();
const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

console.log('🔍 Testing GitHub Repository Loader with limited scope...');

async function testSmallRepo() {
  try {
    // Test with a smaller, simpler repository first
    const repoUrl = 'https://github.com/anatolyZader/vc-3';
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.log('❌ No GitHub token found');
      return;
    }
    
    console.log(`✅ Token found: ${githubToken.substring(0, 20)}...`);
    
    const loaderOptions = {
      branch: 'main',
      recursive: false, // Only root files
      unknown: 'warn',
      maxConcurrency: 1, // Very low concurrency
      accessToken: githubToken,
      ignoreFiles: [
        'node_modules/**',
        '.git/**',
        'backend/**', // Skip backend directory to reduce load
        'client/**',  // Skip client directory
        'temp/**',
        'tools/**',
        '*.log',
        '*.lock',
        '*.json',     // Skip JSON files
        '*.md'        // Skip markdown for this test
      ]
    };
    
    console.log('🔄 Creating GitHub loader with minimal scope...');
    const loader = new GithubRepoLoader(repoUrl, loaderOptions);
    
    console.log('📥 Loading root-level documents only...');
    const startTime = Date.now();
    
    // Shorter timeout for this test
    const timeout = setTimeout(() => {
      console.log('⏰ Timeout after 15 seconds - even minimal loading hangs');
      process.exit(1);
    }, 15000);
    
    const documents = await loader.load();
    clearTimeout(timeout);
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ SUCCESS! Loaded ${documents.length} documents in ${loadTime}ms`);
    
    if (documents.length > 0) {
      console.log(`📄 Documents found:`);
      documents.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.metadata.source} (${doc.pageContent.length} chars)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('rate limit')) {
      console.log('💡 Rate limit hit - authentication is working but too many requests');
    }
  }
}

testSmallRepo();