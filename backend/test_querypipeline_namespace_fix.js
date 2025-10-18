#!/usr/bin/env node
/**
 * Test QueryPipeline Namespace Fix
 * Tests if the hardcoded namespace fix in QueryPipeline works
 */

require('dotenv').config();

async function testQueryPipelineNamespaceFix() {
  console.log('🧪 Testing QueryPipeline namespace fix...');
  
  try {
    // Import the classes we need to test
    const QueryPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline');
    const { OpenAIEmbeddings } = require('@langchain/openai');
    const LLMProviderManager = require('./business_modules/ai/infrastructure/ai/providers/lLMProviderManager');
    const RequestQueue = require('./business_modules/ai/infrastructure/ai/requestQueue');
    const PineconePlugin = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin');
    const PineconeService = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService');
    
    // Initialize components
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const llmProviderManager = new LLMProviderManager('openai');
    const llm = llmProviderManager.getLLM();
    
    const requestQueue = new RequestQueue({
      maxRequestsPerMinute: 20,
      retryDelay: 5000,
      maxRetries: 3
    });
    
    const pineconePlugin = new PineconePlugin();
    
    // Create QueryPipeline
    const queryPipeline = new QueryPipeline({
      embeddings: embeddings,
      llm: llm,
      requestQueue: requestQueue,
      pineconePlugin: pineconePlugin,
      userId: 'test-user'
    });
    
    // Create a mock vector store (similar to what aiLangchainAdapter creates)
    const pineconeService = new PineconeService({
      pineconePlugin: pineconePlugin,
      rateLimiter: requestQueue.pineconeLimiter
    });
    
    // This simulates the vectorStore created by aiLangchainAdapter with the correct namespace
    const vectorStore = await pineconeService.createVectorStore(embeddings, 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3');
    
    console.log('✅ Components initialized successfully');
    console.log(`📝 VectorStore created: ${!!vectorStore}`);
    
    // Test the performVectorSearch method directly
    console.log('\n🔍 Testing vector search...');
    
    const searchResults = await queryPipeline.performVectorSearch(
      'What is dependency injection in eventstorm.me app?',
      vectorStore,
      null, // traceData
      'test-user',
      null, // repoId
      null  // repoDescriptor
    );
    
    console.log(`📊 Search results count: ${searchResults.length}`);
    
    if (searchResults.length > 0) {
      console.log('✅ SUCCESS: Vector search returned results!');
      console.log('📄 First few results:');
      searchResults.slice(0, 3).forEach((result, index) => {
        console.log(`  ${index + 1}. Source: ${result.metadata?.source || 'Unknown'}`);
        console.log(`     Content preview: ${result.pageContent.substring(0, 100)}...`);
        console.log(`     Score: ${result.metadata?.score || 'N/A'}`);
      });
    } else {
      console.log('❌ ISSUE: Vector search returned 0 results');
      console.log('This suggests the namespace fix may not be working correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testQueryPipelineNamespaceFix();