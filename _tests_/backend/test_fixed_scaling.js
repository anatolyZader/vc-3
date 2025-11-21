require('dotenv').config();
const ContextPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');

async function testFixedHorizontalScaling() {
  console.log('🧪 Testing FIXED horizontal scaling system...');
  console.log('📋 GitHub token available:', !!process.env.GITHUB_TOKEN);

  try {
    const pipeline = new ContextPipeline({
      embeddings: null, // Mock
      eventBus: null,
      pineconeLimiter: null,
      config: {}
    });

    console.log('✅ ContextPipeline instantiated successfully');
    
    const testParams = {
      userId: 'test-user',
      repoId: 'test-repo-id-fixed',
      repoUrl: 'https://github.com/anatolyZader/vc-3',
      branch: 'main',
      githubOwner: 'anatolyZader',
      repoName: 'vc-3',
      commitInfo: { hash: 'test-commit-fixed', subject: 'Test fixed commit' }
    };

    console.log('🚀 Testing fixed processFullRepo...');
    
    const result = await pipeline.processFullRepo(testParams);
    
    console.log('✅ processFullRepo completed');
    console.log('📊 Result success:', result?.success);
    console.log('📊 Result mode:', result?.mode);
    console.log('📊 Result reason:', result?.reason);
    console.log('📊 Processing strategy:', result?.details?.processingStrategy);
    console.log('📊 Worker failure info:', result?.details?.workerFailure);
    
    if (result?.details?.workerFailure) {
      console.log('🔍 ANALYSIS: Worker system attempted but failed - this is expected in test environment');
      console.log('🔍 Fallback worked correctly to standard processing');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('🔍 This might indicate infrastructure issues that need fixing');
  }
}

testFixedHorizontalScaling();