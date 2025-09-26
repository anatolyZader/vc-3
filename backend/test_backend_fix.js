#!/usr/bin/env node

// Test the backend file loading fix
require('dotenv').config();

const RepoProcessorUtils = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessorUtils');

async function testBackendFix() {
  console.log('🔧 TESTING: Backend files loading fix');
  console.log('=' .repeat(50));
  
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return;
  }

  const repoProcessor = new RepoProcessorUtils();
  
  try {
    console.log('🚀 Testing processBatch method directly...');
    
    // Test backend batch specifically
    const backendBatch = {
      name: 'Backend Directory (Targeted)',
      recursive: true,
      priority: 2,
      maxConcurrency: 1,
      ignorePaths: [
        // Exclude everything at root level except backend/
        'package.json', 'README.md', 'bfg.jar', '*.txt', '*.log',
        'test_*.js', 'cookie.txt', 'logs_*.txt', 'cloud_*.txt',
        // Exclude other top-level directories entirely
        'client/**', '.github/**', '.vscode/**',
        // Standard ignore patterns  
        'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**',
        'temp/**', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store',
        // Exclude backend test and build artifacts but keep source
        'backend/node_modules/**', 'backend/dist/**', 'backend/build/**', 
        'backend/coverage/**', 'backend/_tests_/**',
        'backend/**/*.test.js', 'backend/**/*.spec.js', 'backend/**/*.test.ts',
        'backend/package-lock.json', 'backend/*.log', 'backend/jest.*.config.js',
        // Exclude specific backend files that aren't source code
        'backend/bfg.jar', 'backend/cookie*.txt', 'backend/logs_*.txt',
        'backend/cloud-sql-proxy', 'backend/user-oauth2-credentials.json',
        'backend/service-account-credentials.json'
      ]
    };
    
    const repoUrl = 'https://github.com/anatolyZader/vc-3';
    const branch = 'main';
    
    console.log('⏳ Loading backend batch...');
    const backendDocs = await repoProcessor.processBatch(repoUrl, branch, backendBatch);
    
    console.log(`\n📊 RESULTS:`);
    console.log(`Backend files loaded: ${backendDocs.length}`);
    
    if (backendDocs.length > 0) {
      console.log(`✅ SUCCESS! Backend files are now being loaded properly`);
      console.log(`\n🔍 Sample backend files:`);
      backendDocs.slice(0, 10).forEach((doc, index) => {
        const preview = doc.pageContent.substring(0, 50).replace(/\n/g, ' ');
        console.log(`  ${index + 1}. ${doc.metadata.source} (${doc.pageContent.length} chars)`);
        console.log(`     Preview: "${preview}..."`);
      });
    } else {
      console.log(`❌ Still getting 0 backend files - need further debugging`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  testBackendFix();
}

module.exports = { testBackendFix };