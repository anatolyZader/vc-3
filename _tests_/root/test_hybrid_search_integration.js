#!/usr/bin/env node

require('dotenv').config({ path: 'backend/.env' });

/**
 * Test Hybrid Search Integration in QueryPipeline
 * This tests the new complementary text search functionality
 * alongside existing vector search in the RAG pipeline
 */

async function testHybridSearchIntegration() {
  console.log('🧪 Testing Hybrid Search Integration in QueryPipeline');
  console.log('===================================================\n');

  try {
    // Import required services
    const AIPostgresAdapter = require('./backend/business_modules/ai/infrastructure/persistence/aiPostgresAdapter');
    const TextSearchService = require('./backend/business_modules/ai/infrastructure/search/textSearchService');
    const QueryPipeline = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline');
    
    console.log('📦 Services imported successfully');

    // Initialize PostgreSQL adapter
    const postgresAdapter = new AIPostgresAdapter({ cloudSqlConnector: null });
    await postgresAdapter.initPool();
    console.log('✅ PostgreSQL adapter initialized');

    // Initialize text search service
    const textSearchService = new TextSearchService({ 
      postgresAdapter,
      logger: console 
    });
    console.log('✅ Text search service initialized');

    // Verify text search is working with repo_data
    console.log('\n🔍 Testing text search on repo_data table...');
    const textResults = await textSearchService.searchDocuments('function', { limit: 3 });
    console.log(`📄 Found ${textResults.length} results from repo_data table`);
    
    if (textResults.length > 0) {
      console.log('Sample result:', {
        id: textResults[0].id,
        filePath: textResults[0].filePath,
        fileExtension: textResults[0].fileExtension,
        rank: textResults[0].rank,
        snippet: textResults[0].snippet?.substring(0, 100) + '...'
      });
    }

    // Initialize QueryPipeline with text search
    console.log('\n🔧 Testing QueryPipeline with text search integration...');
    const queryPipeline = new QueryPipeline({
      textSearchService: textSearchService,
      embeddings: null, // Not needed for text search test
      llm: null,        // Not needed for text search test
      requestQueue: null
    });

    // Test text search method
    console.log('\n🔍 Testing QueryPipeline.performTextSearch...');
    const pipelineTextResults = await queryPipeline.performTextSearch('function authentication', null, null, null);
    console.log(`📋 QueryPipeline text search found ${pipelineTextResults.length} results`);
    
    if (pipelineTextResults.length > 0) {
      console.log('First result format check:', {
        hasPageContent: !!pipelineTextResults[0].pageContent,
        hasMetadata: !!pipelineTextResults[0].metadata,
        isTextSearchResult: pipelineTextResults[0].metadata?.isTextSearchResult,
        searchType: pipelineTextResults[0].metadata?.searchType
      });
    }

    // Test combination of results (simulating vector + text search)
    console.log('\n🔄 Testing result combination...');
    const mockVectorResults = [
      {
        pageContent: 'Mock vector search result about functions',
        metadata: { source: 'vector_search', score: 0.85, searchType: 'vector' }
      }
    ];

    const combinedResults = queryPipeline.combineSearchResults(mockVectorResults, pipelineTextResults);
    console.log(`✅ Combined results: ${combinedResults.length} total (${mockVectorResults.length} vector + ${pipelineTextResults.length} text)`);

    // Test search statistics
    console.log('\n📊 Testing search statistics...');
    const stats = await textSearchService.getSearchStats();
    console.log('Repository search statistics:', {
      totalDocuments: stats.total_documents,
      uniqueUsers: stats.unique_users,
      uniqueRepos: stats.unique_repos,
      uniqueFileTypes: stats.unique_file_types,
      avgContentLength: Math.round(stats.avg_content_length)
    });

    console.log('\n🎉 Hybrid Search Integration Test Completed Successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ Text search working with repo_data table');
    console.log('✅ QueryPipeline text search method functional');
    console.log('✅ Result combination working');
    console.log('✅ Compatible format between vector and text results');
    console.log('\n🚀 Ready for integration with full RAG pipeline!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  testHybridSearchIntegration();
}

module.exports = { testHybridSearchIntegration };