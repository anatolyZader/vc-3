#!/usr/bin/env node
require('dotenv').config();
const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

console.log('🔍 Testing GitHub Repository Loader with Authentication...');

async function testGithubLoader() {
  try {
    const repoUrl = 'https://github.com/anatolyZader/vc-3';
    const githubToken = process.env.GITHUB_TOKEN;
    
    if (!githubToken) {
      console.log('❌ No GitHub token found');
      return;
    }
    
    console.log(`✅ Token found: ${githubToken.substring(0, 20)}...`);
    
    const loaderOptions = {
      branch: 'main',
      recursive: true,
      unknown: 'warn',
      maxConcurrency: 2, // Lower concurrency to avoid rate limits
      accessToken: githubToken,
      ignoreFiles: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.log',
        '*.lock'
      ]
    };
    
    console.log('🔄 Creating GitHub loader...');
    const loader = new GithubRepoLoader(repoUrl, loaderOptions);
    
    console.log('📥 Loading documents (this may take a moment)...');
    const startTime = Date.now();
    
    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.log('⏰ Timeout after 30 seconds - this suggests the loader is hanging');
      process.exit(1);
    }, 30000);
    
    const documents = await loader.load();
    clearTimeout(timeout);
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ SUCCESS! Loaded ${documents.length} documents in ${loadTime}ms`);
    
    if (documents.length > 0) {
      console.log(`📄 First document: ${documents[0].metadata.source}`);
      console.log(`📏 Content length: ${documents[0].pageContent.length} chars`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('rate limit')) {
      console.log('💡 Rate limit hit - authentication is working but too many requests');
    }
  }
}

testGithubLoader();