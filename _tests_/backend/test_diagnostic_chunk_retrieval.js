#!/usr/bin/env node

/**
 * Diagnostic test to understand why no chunks are being retrieved
 */

require('dotenv').config();

const QueryPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline');
const VectorSearchOrchestrator = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator');
const { OpenAIEmbeddings } = require('@langchain/openai');

async function diagnoseChunkRetrieval() {
  console.log(`[${new Date().toISOString()}] 🔍 Diagnosing chunk retrieval issues...`);
  
  try {
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY
    });

    const vectorSearchOrchestrator = new VectorSearchOrchestrator({
      embeddings: embeddings,
      apiKey: process.env.PINECONE_API_KEY,
      indexName: process.env.PINECONE_INDEX_NAME,
      region: process.env.PINECONE_REGION,
      defaultTopK: 10,
      defaultThreshold: 0.1, // MUCH lower threshold
      maxResults: 50
    });

    const queryPipeline = new QueryPipeline({
      vectorSearchOrchestrator: vectorSearchOrchestrator,
      userId: 'd41402df-182a-41ec-8f05-153118bf2718',
      embeddings: embeddings
    });

    const vectorStore = await queryPipeline.getVectorStore();
    console.log(`[${new Date().toISOString()}] 📍 Using namespace: ${vectorStore.namespace}`);

    // Test 1: Very simple query with no filters and low threshold
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST 1: Simple query with NO filters, low threshold (0.1)`);
    console.log(`${'='.repeat(60)}`);

    try {
      const simpleResults = await vectorSearchOrchestrator.searchSimilar("test", {
        namespace: vectorStore.namespace,
        topK: 10,
        threshold: 0.1,
        includeMetadata: true,
        filter: undefined // NO FILTERS
      });

      console.log(`📊 Simple search results: ${simpleResults.matches?.length || 0} matches`);
      
      if (simpleResults.matches && simpleResults.matches.length > 0) {
        console.log(`✅ Found content in namespace!`);
        simpleResults.matches.slice(0, 3).forEach((match, index) => {
          console.log(`\n--- Match ${index + 1} ---`);
          console.log(`ID: ${match.id}`);
          console.log(`Score: ${match.score}`);
          console.log(`Type: ${match.metadata?.type || 'Unknown'}`);
          console.log(`Source: ${match.metadata?.source || 'Unknown'}`);
          console.log(`Content: ${(match.metadata?.text || match.metadata?.content || '').substring(0, 200)}...`);
        });
      } else {
        console.log(`❌ No content found in namespace even with no filters!`);
      }
    } catch (error) {
      console.error(`❌ Simple search failed: ${error.message}`);
    }

    // Test 2: Check what happens with API-related query but no filters
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST 2: "API" query with NO filters, low threshold`);
    console.log(`${'='.repeat(60)}`);

    try {
      const apiResults = await vectorSearchOrchestrator.searchSimilar("API", {
        namespace: vectorStore.namespace,
        topK: 10,
        threshold: 0.1,
        includeMetadata: true,
        filter: undefined
      });

      console.log(`📊 API search results: ${apiResults.matches?.length || 0} matches`);
      
      if (apiResults.matches && apiResults.matches.length > 0) {
        console.log(`✅ Found API-related content!`);
        
        // Show source type distribution
        const types = {};
        apiResults.matches.forEach(match => {
          const type = match.metadata?.type || 'Unknown';
          types[type] = (types[type] || 0) + 1;
        });
        
        console.log(`🏷️ Source types found:`);
        Object.entries(types).forEach(([type, count]) => {
          console.log(`  - ${type}: ${count} matches`);
        });
        
        console.log(`\n📋 First few matches:`);
        apiResults.matches.slice(0, 3).forEach((match, index) => {
          console.log(`\n--- Match ${index + 1} ---`);
          console.log(`Score: ${match.score}`);
          console.log(`Type: ${match.metadata?.type || 'Unknown'}`);
          console.log(`Source: ${match.metadata?.source || 'Unknown'}`);
        });
      }
    } catch (error) {
      console.error(`❌ API search failed: ${error.message}`);
    }

    // Test 3: Test with strategy filters to see what gets filtered out
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST 3: Check what strategy filters are doing`);
    console.log(`${'='.repeat(60)}`);

    const VectorSearchStrategy = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchStrategy');
    const strategy = VectorSearchStrategy.determineSearchStrategy("API endpoints");
    
    console.log(`🎯 Strategy determined:`, strategy);
    
    const combinedFilter = queryPipeline.combineFilters(strategy.codeFilters, strategy.docsFilters);
    console.log(`🔍 Combined filter:`, JSON.stringify(combinedFilter, null, 2));

    if (combinedFilter) {
      try {
        const filteredResults = await vectorSearchOrchestrator.searchSimilar("API", {
          namespace: vectorStore.namespace,
          topK: 10,
          threshold: 0.1,
          includeMetadata: true,
          filter: combinedFilter
        });

        console.log(`📊 Filtered search results: ${filteredResults.matches?.length || 0} matches`);
        console.log(`📊 This shows the impact of strategy filters`);
      } catch (error) {
        console.error(`❌ Filtered search failed: ${error.message}`);
        console.log(`🔍 This might be why you're getting no results - filter syntax issue`);
      }
    } else {
      console.log(`📊 No filters applied - should return unfiltered results`);
    }

    // Test 4: Let's try a very broad search
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST 4: Broad search with different queries`);
    console.log(`${'='.repeat(60)}`);

    const testQueries = ["authentication", "user", "database", "server", "function"];
    
    for (const query of testQueries) {
      try {
        const results = await vectorSearchOrchestrator.searchSimilar(query, {
          namespace: vectorStore.namespace,
          topK: 5,
          threshold: 0.1,
          includeMetadata: true,
          filter: undefined
        });
        
        console.log(`📝 Query "${query}": ${results.matches?.length || 0} matches`);
      } catch (error) {
        console.log(`❌ Query "${query}" failed: ${error.message}`);
      }
    }

    console.log(`\n✅ Diagnostic complete!`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Diagnostic failed:`, error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the diagnostic
diagnoseChunkRetrieval().catch(error => {
  console.error(`[${new Date().toISOString()}] ❌ Diagnostic execution failed:`, error);
  process.exit(1);
});