#!/usr/bin/env node

// Force reprocessing of repository to activate cloud-native backend loader
require('dotenv').config();

async function forceRepoReprocessing() {
  console.log('🔄 FORCE REPROCESSING: Triggering repository reprocessing to activate cloud-native loader');
  console.log('=' .repeat(70));
  
  const baseUrl = process.env.BASE_URL || 'https://vibeswitch.me';
  const userId = 'anatolyzader'; // Use consistent owner identifier  
  const repoId = 'vc-3'; // Remove owner prefix to match expected pattern
  
  // Repository data to trigger reprocessing
  const repoData = {
    url: 'https://github.com/anatolyZader/vc-3',
    branch: 'main',
    force_reprocess: true,
    trigger_reason: 'activate_cloud_native_backend_loader'
  };
  
  try {
    console.log('🚀 Sending reprocess request...');
    console.log(`📡 URL: ${baseUrl}/api/ai/process-pushed-repo`);
    console.log(`👤 User: ${userId}`);
    console.log(`📦 Repo: ${repoId}`);
    
    // Create mock request to the internal API
    const requestPayload = {
      method: 'POST',
      url: '/api/ai/process-pushed-repo',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.JWT_TOKEN || 'internal-trigger'}`
      },
      body: JSON.stringify({
        repoId: repoId,
        repoData: repoData
      })
    };
    
    console.log('📋 Request payload:', JSON.stringify(requestPayload, null, 2));
    
    console.log('\n🔧 ALTERNATIVE: Manual trigger via internal function call');
    
    // Try to trigger via internal API if available
    try {
      const ContextPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline');
      const { OpenAIEmbeddings } = require('@langchain/openai');
      const PineconePlugin = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin');
      const PineconeService = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService');
      const EmbeddingManager = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/embeddingManager');
      const PineconeLimiter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeLimiter');
      
      console.log('🔌 Initializing AI processing dependencies...');
      
      // Initialize embeddings
      const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-large',
        apiKey: process.env.OPENAI_API_KEY
      });
      
      // Initialize Pinecone dependencies  
      const pineconePlugin = new PineconePlugin();
      const pineconeLimiter = new PineconeLimiter();
      const pineconeService = new PineconeService({
        pineconePlugin: pineconePlugin,
        rateLimiter: pineconeLimiter
      });
      
      // Initialize embedding manager with proper dependencies
      const embeddingManager = new EmbeddingManager({
        embeddings: embeddings,
        pineconeLimiter: pineconeLimiter,
        pineconeService: pineconeService
      });
      
      console.log('✅ AI dependencies initialized successfully');
      
      const pipeline = new ContextPipeline({
        embeddings: embeddings,
        embeddingManager: embeddingManager,
        pineconeManager: pineconePlugin,
        pineconeLimiter: pineconeLimiter
      });
      
      console.log('🎯 Calling internal processPushedRepo function...');
      const result = await pipeline.processPushedRepo(userId, repoId, repoData);
      
      console.log(`\n✅ REPROCESSING RESULT: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (result.success) {
        console.log(`📊 Processed: ${result.documentsProcessed || 0} docs, ${result.chunksGenerated || 0} chunks`);
      } else {
        console.log(`❌ Error: ${result.error || 'Unknown error'}`);
      }
      
      if (result.success) {
        console.log('\n🎉 SUCCESS! Repository has been reprocessed with cloud-native loader');
        console.log('💡 Backend files should now be accessible to AI responses');
        console.log('🧪 Test by asking: "How is dependency injection implemented in VibeSwitch modules?"');
      } else {
        console.log('\n❌ FAILED: Repository reprocessing failed');
        console.log('🔧 Check the logs above for error details');
      }
      
    } catch (internalError) {
      console.error('❌ Internal function call failed:', internalError.message);
      console.log('\n💡 You may need to manually trigger this via the web interface or API endpoint');
    }
    
  } catch (error) {
    console.error('❌ Force reprocessing failed:', error.message);
    console.log('\n🔧 Alternative options:');
    console.log('1. Push a small change to the repository (like updating README)');
    console.log('2. Use the web interface to manually trigger reprocessing');
    console.log('3. Wait for the next scheduled reprocessing cycle');
  }
}

if (require.main === module) {
  forceRepoReprocessing();
}

module.exports = { forceRepoReprocessing };