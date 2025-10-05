#!/usr/bin/env node

// Test the full repository processing pipeline
const path = require('path');

// Mock fastify app for testing
const mockFastify = {
  log: {
    info: console.log,
    error: console.error,
    warn: console.warn
  }
};

async function testRepositoryProcessing() {
  console.log('🚀 Starting repository processing pipeline test...');
  
  // Load environment variables
  require('dotenv').config();
  
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('❌ No GitHub token found');
    return { success: false, error: 'No GitHub token' };
  }

  try {
    console.log('📦 Loading RepoProcessor...');
    const RepoProcessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/repoProcessor');
    
    // Create mock options for the processor
    const mockOptions = {
      embeddings: null, // We'll skip embedding for this test
      pineconeLimiter: null,
      repositoryManager: {
        sanitizeId: (id) => id.replace(/[^a-zA-Z0-9_-]/g, '_'),
        getFileType: (filename) => {
          if (!filename) return 'unknown';
          const ext = filename.split('.').pop();
          return ext || 'unknown';
        }
      }
    };
    
    console.log('🔧 Initializing RepoProcessor...');
    const processor = new RepoProcessor(mockOptions);
    
    // Test repository details
    const repoUrl = 'https://github.com/anatolyZader/vc-3';
    const branch = 'main';
    const { githubOwner, repoName } = processor.parseRepoUrl(repoUrl);
    
    console.log(`📥 Testing repository: ${githubOwner}/${repoName}`);
    
    // Test 1: Parse repository URL
    console.log('\n🔍 Test 1: URL Parsing');
    console.log(`  Owner: ${githubOwner}`);
    console.log(`  Repository: ${repoName}`);
    
    // Test 2: Get commit info from GitHub API
    console.log('\n🔍 Test 2: GitHub API Commit Info');
    const commitInfo = await processor.getCommitInfoFromGitHubAPI(githubOwner, repoName, branch);
    if (commitInfo) {
      console.log(`  ✅ Commit hash: ${commitInfo.hash.substring(0, 8)}`);
      console.log(`  📝 Message: ${commitInfo.message}`);
      console.log(`  👤 Author: ${commitInfo.author}`);
      console.log(`  📅 Date: ${commitInfo.date}`);
    } else {
      console.log('  ⚠️ Could not get commit info');
    }
    
    // Test 3: Load documents with batched processing
    console.log('\n🔍 Test 3: Document Loading with Batched Processing');
    const documents = await processor.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
    
    console.log(`  ✅ Loaded ${documents.length} documents`);
    
    if (documents.length > 0) {
      console.log('  📄 Document breakdown by batch:');
      const batchCounts = {};
      documents.forEach(doc => {
        const batchName = doc.metadata.batch_name || 'unknown';
        batchCounts[batchName] = (batchCounts[batchName] || 0) + 1;
      });
      
      for (const [batch, count] of Object.entries(batchCounts)) {
        console.log(`    - ${batch}: ${count} documents`);
      }
      
      console.log('\n  📋 Sample documents:');
      documents.slice(0, 3).forEach((doc, index) => {
        console.log(`    ${index + 1}. ${doc.metadata.source} (${doc.pageContent.length} chars)`);
        console.log(`       Batch: ${doc.metadata.batch_name || 'unknown'}`);
        console.log(`       File type: ${doc.metadata.file_type || 'unknown'}`);
        console.log(`       Loading method: ${doc.metadata.loading_method || 'unknown'}`);
      });
    }
    
    // Test 4: Document processing (without Pinecone storage)
    console.log('\n🔍 Test 4: Document Processing (without storage)');
    const processedDocuments = await processor.intelligentProcessDocuments(documents);
    console.log(`  ✅ Processed ${processedDocuments.length} documents`);
    
    const splitDocuments = await processor.intelligentSplitDocuments(processedDocuments);
    console.log(`  ✅ Split into ${splitDocuments.length} chunks`);
    
    console.log('\n🎉 Repository processing pipeline test completed successfully!');
    
    return {
      success: true,
      results: {
        githubOwner,
        repoName,
        commitInfo,
        documentsLoaded: documents.length,
        chunksGenerated: splitDocuments.length,
        batches: documents.length > 0 ? [...new Set(documents.map(d => d.metadata.batch_name))] : []
      }
    };
    
  } catch (error) {
    console.error('\n❌ Repository processing test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testRepositoryProcessing()
    .then(result => {
      if (result.success) {
        console.log('\n✅ All tests passed successfully');
        console.log('📊 Results:', JSON.stringify(result.results, null, 2));
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

module.exports = { testRepositoryProcessing };