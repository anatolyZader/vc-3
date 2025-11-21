// Debug script to verify QueryPipeline configuration and connection
// This helps identify if the AI is connecting to different index/namespace

const PineconePlugin = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconePlugin');
const VectorSearchOrchestrator = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator');

async function debugQueryPipelineConfig() {
  console.log('🔍 QUERY PIPELINE CONFIGURATION DEBUG');
  console.log('=' .repeat(60));
  
  try {
    console.log('\n1️⃣ Environment Variables Check:');
    console.log(`PINECONE_API_KEY: ${process.env.PINECONE_API_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`PINECONE_INDEX_NAME: "${process.env.PINECONE_INDEX_NAME || 'NOT SET'}"`);
    console.log(`PINECONE_REGION: "${process.env.PINECONE_REGION || 'NOT SET'}"`);
    
    console.log('\n2️⃣ PineconePlugin Configuration:');
    const plugin = new PineconePlugin();
    const config = plugin.getConfig();
    console.log('Plugin config:', {
      indexName: config.indexName,
      region: config.region,
      cloud: config.cloud,
      hasApiKey: !!config.apiKey
    });
    
    console.log('\n3️⃣ Vector Search Orchestrator Initialization:');
    // Create the same way AILangchainAdapter does
    const orchestrator = new VectorSearchOrchestrator({
      embeddings: null, // Not needed for config check
      pineconePlugin: plugin,
      apiKey: process.env.PINECONE_API_KEY,
      indexName: process.env.PINECONE_INDEX_NAME,
      region: process.env.PINECONE_REGION,
      defaultTopK: 10,
      defaultThreshold: 0.3,
      maxResults: 50
    });
    
    console.log('\n4️⃣ Connecting to Index:');
    const index = await plugin.getIndex();
    console.log(`Connected to index: ${config.indexName}`);
    
    console.log('\n5️⃣ Index Statistics:');
    const stats = await index.describeIndexStats();
    console.log(`Total vectors: ${stats.totalVectorCount}`);
    console.log(`Namespaces count: ${Object.keys(stats.namespaces || {}).length}`);
    
    if (stats.namespaces) {
      console.log('\n📁 Available Namespaces:');
      for (const [namespace, info] of Object.entries(stats.namespaces)) {
        console.log(`  ${namespace}: ${info.vectorCount} vectors`);
      }
    }
    
    console.log('\n6️⃣ Testing Query with AI Namespace:');
    const aiNamespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
    console.log(`Testing namespace: ${aiNamespace}`);
    
    try {
      const queryResponse = await index.query({
        namespace: aiNamespace,
        vector: new Array(3072).fill(0.1), // Dummy vector
        topK: 3,
        includeMetadata: true
      });
      
      console.log(`✅ Query successful! Found ${queryResponse.matches?.length || 0} results`);
      if (queryResponse.matches && queryResponse.matches.length > 0) {
        console.log('Sample results:');
        queryResponse.matches.slice(0, 2).forEach((match, i) => {
          console.log(`  ${i + 1}. ID: ${match.id}`);
          console.log(`     Score: ${match.score}`);
          console.log(`     Source: ${match.metadata?.source || 'N/A'}`);
          console.log(`     Type: ${match.metadata?.type || 'N/A'}`);
          console.log(`     Content preview: ${(match.metadata?.text || '').substring(0, 100)}...`);
        });
      }
    } catch (queryError) {
      console.error(`❌ Query failed:`, queryError.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the debug
debugQueryPipelineConfig().catch(console.error);