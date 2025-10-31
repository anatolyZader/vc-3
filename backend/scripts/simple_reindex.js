/**
 * Simple Re-index Script - Direct Pipeline Approach
 * 
 * Bypasses the complex worker system and directly uses the context pipeline
 * for re-indexing the repository.
 */

require('dotenv').config();
const path = require('path');

async function simpleReindex() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄 SIMPLE REPOSITORY RE-INDEXING');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Configuration
  const config = {
    owner: 'anatolyZader',
    repo: 'vc-3',
    branch: 'main',
    userId: 'd41402df-182a-41ec-8f05-153118bf2718',
    repoId: 'anatolyzader_vc-3'
  };
  
  console.log('📋 Configuration:');
  console.log(`   Repository: ${config.owner}/${config.repo}`);
  console.log(`   Branch: ${config.branch}`);
  console.log(`   User ID: ${config.userId}\n`);
  
  // Verify environment
  const required = ['PINECONE_API_KEY', 'PINECONE_INDEX_NAME', 'OPENAI_API_KEY', 'GITHUB_TOKEN'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`❌ Missing: ${missing.join(', ')}\n`);
    process.exit(1);
  }
  console.log('✅ Environment verified\n');
  
  console.log('🤖 Initializing Context Pipeline directly...');
  const ContextPipeline = require('../business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline');
  const { OpenAIEmbeddings } = require('@langchain/openai');
  
  // Create embeddings instance
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: 'text-embedding-3-small'
  });
  
  // Create context pipeline with all required dependencies
  const contextPipeline = new ContextPipeline({
    userId: config.userId,
    embeddings: embeddings,  // CRITICAL: Pass embeddings instance
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeIndexName: process.env.PINECONE_INDEX_NAME,
    openaiApiKey: process.env.OPENAI_API_KEY
  });
  
  console.log('✅ Context Pipeline initialized\n');
  
  // Prepare repo data
  const repoData = {
    url: `https://github.com/${config.owner}/${config.repo}`,
    branch: config.branch,
    githubOwner: config.owner,
    repoName: config.repo,
    forceReindex: true,
    // Add GitHub token for API access
    githubToken: process.env.GITHUB_TOKEN
  };
  
  console.log('📦 Repository Data:');
  console.log(`   URL: ${repoData.url}`);
  console.log(`   Branch: ${repoData.branch}`);
  console.log(`   Force Reindex: ${repoData.forceReindex}\n`);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 STARTING RE-INDEXING');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const startTime = Date.now();
  
  try {
    // Process repository directly through context pipeline
    const result = await contextPipeline.processPushedRepo(
      config.userId,
      config.repoId,
      repoData
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Check result
    if (!result || !result.success) {
      console.error('\n❌ RE-INDEXING FAILED\n');
      console.error(`Duration: ${duration}s`);
      if (result) {
        console.error(`Mode: ${result.mode}`);
        console.error(`Reason: ${result.reason}`);
        console.error(`Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      process.exit(1);
    }
    
    console.log('\n✅ RE-INDEXING COMPLETED SUCCESSFULLY\n');
    console.log(`Duration: ${duration}s`);
    if (result.documentsProcessed) console.log(`Documents: ${result.documentsProcessed}`);
    if (result.chunksGenerated) console.log(`Chunks: ${result.chunksGenerated}`);
    if (result.chunksStored) console.log(`Stored: ${result.chunksStored}`);
    if (result.namespace) console.log(`Namespace: ${result.namespace}`);
    
    console.log('\n🎉 Success!\n');
    process.exit(0);
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('\n❌ ERROR\n');
    console.error(`Duration: ${duration}s`);
    console.error(`Message: ${error.message}`);
    console.error(`\nStack:\n${error.stack}`);
    process.exit(1);
  }
}

console.log('Starting simple re-indexing...\n');
simpleReindex();
