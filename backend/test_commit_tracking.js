#!/usr/bin/env node

/**
 * test_commit_tracking.js - Test the enhanced commit hash tracking and incremental processing
 * 
 * This test demonstrates:
 * 1. Commit hash detection for duplicate checking
 * 2. Incremental processing when commits differ
 * 3. Changed file detection between commits
 * 4. Repository tracking metadata storage
 */

const DataPreparationPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/DataPreparationPipeline');

async function testCommitTracking() {
  console.log('\n🧪 TESTING ENHANCED REPOSITORY DUPLICATE DETECTION WITH COMMIT TRACKING');
  console.log('=' .repeat(80));
  
  try {
    // Mock dependencies for testing
    const mockEmbeddings = {
      embedQuery: async (text) => new Array(1536).fill(0.1) // Mock embedding
    };
    
    const mockPinecone = {
      Index: () => ({
        namespace: () => ({
          query: async (params) => {
            // Mock query response - simulate finding existing repository
            if (params.filter?.source === 'repository_tracking') {
              return {
                matches: [{
                  id: 'test_repo_tracking_123',
                  metadata: {
                    userId: 'test-user',
                    githubOwner: 'testowner',
                    repoName: 'testrepo',
                    commitHash: 'abc123def456', // Mock old commit
                    lastProcessed: '2025-01-01T10:00:00.000Z'
                  }
                }]
              };
            }
            return { matches: [] };
          },
          upsert: async (records) => {
            console.log(`📝 MOCK: Would store ${records.length} tracking records`);
          }
        })
      })
    };
    
    const mockEventBus = {
      emit: (event, data) => {
        console.log(`📡 EVENT: ${event}`, JSON.stringify(data, null, 2));
      }
    };

    // Initialize pipeline with mocks
    const pipeline = new DataPreparationPipeline({
      embeddings: mockEmbeddings,
      pinecone: mockPinecone,
      eventBus: mockEventBus
    });
    
    console.log('✅ DataPreparationPipeline initialized with mocks\n');

    // Test Scenario 1: Same commit hash (should skip)
    console.log('📋 TEST SCENARIO 1: Repository with same commit hash');
    console.log('-'.repeat(50));
    
    const sameCommitResult = await testRepositoryProcessing(
      pipeline,
      'test-user',
      'repo-123',
      {
        url: 'https://github.com/testowner/testrepo.git',
        branch: 'main'
      },
      'abc123def456' // Same as mock existing commit
    );
    
    console.log('📊 RESULT 1:', JSON.stringify(sameCommitResult, null, 2));
    console.log('Expected: Should skip processing due to same commit\n');

    // Test Scenario 2: Different commit hash (should process incrementally)
    console.log('📋 TEST SCENARIO 2: Repository with different commit hash');
    console.log('-'.repeat(50));
    
    const differentCommitResult = await testRepositoryProcessing(
      pipeline,
      'test-user', 
      'repo-123',
      {
        url: 'https://github.com/testowner/testrepo.git',
        branch: 'main'
      },
      'xyz789abc123' // Different from mock existing commit
    );
    
    console.log('📊 RESULT 2:', JSON.stringify(differentCommitResult, null, 2));
    console.log('Expected: Should trigger incremental processing\n');

    // Test Scenario 3: New repository (no existing commit)
    console.log('📋 TEST SCENARIO 3: New repository (no previous processing)');
    console.log('-'.repeat(50));
    
    const newRepoResult = await testRepositoryProcessing(
      pipeline,
      'new-user',
      'new-repo-456',
      {
        url: 'https://github.com/newowner/newrepo.git',
        branch: 'main'
      },
      'new123commit456'
    );
    
    console.log('📊 RESULT 3:', JSON.stringify(newRepoResult, null, 2));
    console.log('Expected: Should process fully as new repository\n');

    console.log('🎉 COMMIT TRACKING TESTS COMPLETED');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Mock the repository processing to test duplicate detection logic
 */
async function testRepositoryProcessing(pipeline, userId, repoId, repoData, mockCommitHash) {
  console.log(`🔍 Testing repository processing for ${userId}/${repoId}`);
  console.log(`🔑 Mock commit hash: ${mockCommitHash}`);
  
  // Mock the repository manager methods
  pipeline.repositoryManager.cloneRepository = async (url, branch) => {
    const mockTempDir = `/tmp/mock_repo_${Date.now()}`;
    console.log(`📁 MOCK: Cloned repository to ${mockTempDir}`);
    return mockTempDir;
  };
  
  pipeline.repositoryManager.getCommitHash = async (repoPath) => {
    console.log(`🔑 MOCK: Retrieved commit hash from ${repoPath}`);
    return mockCommitHash;
  };
  
  pipeline.repositoryManager.getCommitInfo = async (repoPath) => {
    console.log(`📝 MOCK: Retrieved commit info from ${repoPath}`);
    return {
      hash: mockCommitHash,
      timestamp: Math.floor(Date.now() / 1000),
      author: 'Test Author',
      subject: 'Test commit message',
      date: new Date().toISOString()
    };
  };
  
  pipeline.repositoryManager.getChangedFiles = async (repoPath, fromCommit, toCommit) => {
    // Mock changed files for different commit scenario
    if (fromCommit === 'abc123def456' && toCommit !== fromCommit) {
      const changedFiles = ['src/main.js', 'README.md', 'package.json'];
      console.log(`📋 MOCK: Found ${changedFiles.length} changed files`);
      return changedFiles;
    }
    console.log(`📋 MOCK: No changed files found`);
    return [];
  };
  
  pipeline.repositoryManager.cleanupTempDir = async (tempDir) => {
    console.log(`🧹 MOCK: Cleaned up ${tempDir}`);
  };
  
  pipeline.repositoryManager.storeRepositoryTrackingInfo = async (...args) => {
    console.log(`📝 MOCK: Stored repository tracking info`);
  };
  
  // Mock the incremental processing method
  pipeline.processIncrementalChanges = async (userId, repoId, repoData, tempDir, githubOwner, repoName, branch, oldCommit, newCommit, commitInfo) => {
    console.log(`🔄 MOCK: Processing incremental changes`);
    console.log(`   From: ${oldCommit.substring(0, 8)} → To: ${newCommit.substring(0, 8)}`);
    
    return {
      success: true,
      message: `Mock incremental processing completed`,
      incrementalProcessing: true,
      changedFiles: ['src/main.js', 'README.md', 'package.json'],
      documentsProcessed: 3,
      chunksGenerated: 8,
      oldCommitHash: oldCommit,
      newCommitHash: newCommit,
      userId, repoId, githubOwner: 'testowner', repoName: 'testrepo'
    };
  };
  
  // Mock the full processing method  
  pipeline.processFullRepository = async (userId, repoId, repoData, tempDir, githubOwner, repoName, branch, commitInfo) => {
    console.log(`🆕 MOCK: Processing full repository`);
    
    return {
      success: true,
      message: 'Mock full repository processing completed',
      totalDocuments: 15,
      totalChunks: 42,
      commitHash: commitInfo.hash,
      commitInfo,
      userId, repoId, githubOwner, repoName,
      processedAt: new Date().toISOString()
    };
  };
  
  // Call the actual processPushedRepo method
  try {
    const result = await pipeline.processPushedRepo(userId, repoId, repoData);
    return result;
  } catch (error) {
    console.error(`❌ Error in mock processing:`, error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
if (require.main === module) {
  testCommitTracking().catch(console.error);
}

module.exports = { testCommitTracking };
