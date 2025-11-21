#!/usr/bin/env node

// Test GitHub API integration for repository processing
const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');

async function testGitHubAPI() {
  console.log('🚀 Starting GitHub API test...');
  
  // Load environment variables
  require('dotenv').config();
  
  const githubToken = process.env.GITHUB_TOKEN;
  console.log(`🔑 GitHub token available: ${githubToken ? 'YES' : 'NO'}`);
  console.log(`🔑 Token length: ${githubToken ? githubToken.length : 0}`);
  
  if (!githubToken) {
    console.error('❌ No GitHub token found. Please set GITHUB_TOKEN in .env file');
    process.exit(1);
  }

  // Test repository URL
  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  const branch = 'main';
  
  console.log(`📥 Testing with repository: ${repoUrl}`);
  console.log(`🌿 Branch: ${branch}`);

  try {
    // Test basic GitHub API access first
    console.log('\n🔍 Testing basic GitHub API access...');
    const response = await fetch('https://api.github.com/repos/anatolyZader/vc-3/branches/main', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'eventstorm-test-script'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }
    
    const branchData = await response.json();
    console.log('✅ GitHub API access successful');
    console.log(`📝 Latest commit: ${branchData.commit.sha.substring(0, 8)} by ${branchData.commit.commit.author.name}`);
    
    // Now test LangChain GithubRepoLoader
    console.log('\n📥 Testing LangChain GitHub loader...');
    
    const loaderOptions = {
      branch: branch,
      recursive: false, // Start with non-recursive for faster testing
      maxConcurrency: 1, // Conservative concurrency for testing
      accessToken: githubToken,
      ignorePaths: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        'coverage/**'
      ]
    };
    
    console.log('🔧 Loader options:', JSON.stringify(loaderOptions, null, 2));
    
    const loader = new GithubRepoLoader(repoUrl, loaderOptions);
    console.log('⏳ Loading documents (this may take a moment)...');
    
    const startTime = Date.now();
    const documents = await loader.load();
    const endTime = Date.now();
    
    console.log(`✅ Successfully loaded ${documents.length} documents in ${endTime - startTime}ms`);
    
    // Display sample of loaded documents
    if (documents.length > 0) {
      console.log('\n📄 Sample of loaded documents:');
      documents.slice(0, 5).forEach((doc, index) => {
        const preview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ');
        console.log(`  ${index + 1}. ${doc.metadata.source} (${doc.pageContent.length} chars)`);
        console.log(`     Preview: ${preview}${doc.pageContent.length > 100 ? '...' : ''}`);
      });
      
      if (documents.length > 5) {
        console.log(`     ... and ${documents.length - 5} more documents`);
      }
    }
    
    console.log('\n🎉 GitHub API test completed successfully!');
    return { success: true, documents };
    
  } catch (error) {
    console.error('\n❌ GitHub API test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error };
  }
}

// Run the test
if (require.main === module) {
  testGitHubAPI()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Test completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Test failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testGitHubAPI };