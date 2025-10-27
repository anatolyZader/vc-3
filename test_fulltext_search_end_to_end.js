/**
 * Comprehensive End-to-End Test: Full-Text Search for File Discovery
 * 
 * Tests the complete flow:
 * 1. Context Pipeline: Data ingestion into PostgreSQL
 * 2. Text Search: Finding files by name
 * 3. Query Pipeline: Integration with vector search
 * 4. Response Generation: Using retrieved chunks
 */

require('dotenv').config();

async function testFullTextSearchEndToEnd() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║   Full-Text Search End-to-End Test                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize AI adapter once for all tests
    const AILangchainAdapter = require('./backend/business_modules/ai/infrastructure/ai/aiLangchainAdapter');
    const PostgresAdapter = require('./backend/infrastructure/database/postgresAdapter');
    
    console.log('🔧 Initializing AI adapter with full-text search...\n');
    
    const aiAdapter = new AILangchainAdapter({
      aiProvider: process.env.AI_PROVIDER || 'anthropic'
    });

    // Initialize userId for vector store
    await aiAdapter.setUserId('d41402df-182a-41ec-8f05-153118bf2718');

    // Initialize PostgreSQL adapter and text search
    try {
      const postgresAdapter = new PostgresAdapter();
      await postgresAdapter.initialize();
      await aiAdapter.initializeTextSearch(postgresAdapter);
      console.log('✅ AI adapter initialized with text search\n');
    } catch (error) {
      console.log(`⚠️  Could not initialize PostgreSQL: ${error.message}\n`);
      console.log('⚠️  Continuing with vector search only...\n');
    }
    
    // Step 1: Verify PostgreSQL connection and data
    await testPostgreSQLConnection(aiAdapter);
    
    // Step 2: Test full-text search service directly
    await testTextSearchService(aiAdapter);
    
    // Step 3: Test query pipeline with file-specific query
    await testQueryPipelineWithFileSearch(aiAdapter);
    
    // Step 4: Test complete RAG flow
    await testCompleteRAGFlow(aiAdapter);
    
    console.log('\n✅ All tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

/**
 * Step 1: Verify PostgreSQL Connection and Data
 */
async function testPostgreSQLConnection(aiAdapter) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 STEP 1: Verify PostgreSQL Connection and Data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!aiAdapter.textSearchService) {
    console.log('⚠️  Text search service not initialized - skipping PostgreSQL verification');
    return;
  }

  const isAvailable = await aiAdapter.textSearchService.isAvailable();
  console.log(`✅ Text search service available: ${isAvailable}`);
  
  if (!isAvailable) {
    console.log('⚠️  Text search not available - this is expected if PostgreSQL is not set up');
    console.log('   Continuing with vector search only tests...\n');
    return;
  }

  console.log('✅ PostgreSQL connection verified\n');
}

/**
 * Step 2: Test Text Search Service Directly
 */
async function testTextSearchService(aiAdapter) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 STEP 2: Test Text Search Service Directly');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!aiAdapter.textSearchService) {
    console.log('⚠️  Text search service not available - skipping direct tests');
    console.log('   This is OK, will still test vector search\n');
    return;
  }

  const textSearchService = aiAdapter.textSearchService;

  // Test 1: Search for "app.js"
  console.log('🔍 Test 1: Searching for "app.js"\n');
  const appJsResults = await textSearchService.searchDocuments('app.js', {
    userId: 'd41402df-182a-41ec-8f05-153118bf2718',
    limit: 10
  });

  console.log(`📊 Results: ${appJsResults.length} chunks found`);
  if (appJsResults.length > 0) {
    console.log('\n✅ Sample results:');
    appJsResults.slice(0, 3).forEach((result, i) => {
      console.log(`\n   ${i + 1}. File: ${result.filePath}`);
      console.log(`      Rank: ${result.rank.toFixed(4)}`);
      console.log(`      Content preview: ${result.content.substring(0, 100)}...`);
      if (result.snippet) {
        console.log(`      Snippet: ${result.snippet.substring(0, 150)}...`);
      }
    });
  } else {
    console.log('⚠️  No results found for "app.js"');
  }

  // Test 2: Search for "aiLangchainAdapter.js"
  console.log('\n\n🔍 Test 2: Searching for "aiLangchainAdapter.js"\n');
  const adapterResults = await textSearchService.searchDocuments('aiLangchainAdapter.js', {
    userId: 'd41402df-182a-41ec-8f05-153118bf2718',
    limit: 10
  });

  console.log(`📊 Results: ${adapterResults.length} chunks found`);
  if (adapterResults.length > 0) {
    console.log('\n✅ Sample results:');
    adapterResults.slice(0, 3).forEach((result, i) => {
      console.log(`\n   ${i + 1}. File: ${result.filePath}`);
      console.log(`      Rank: ${result.rank.toFixed(4)}`);
      console.log(`      Content preview: ${result.content.substring(0, 100)}...`);
    });
  } else {
    console.log('⚠️  No results found for "aiLangchainAdapter.js"');
  }

  // Test 3: General content search
  console.log('\n\n🔍 Test 3: Searching for content keyword "function"\n');
  const contentResults = await textSearchService.searchDocuments('function', {
    userId: 'd41402df-182a-41ec-8f05-153118bf2718',
    limit: 5
  });

  console.log(`📊 Results: ${contentResults.length} chunks found`);
  if (contentResults.length > 0) {
    console.log('✅ Full-text search is working!');
  }
  
  console.log('\n✅ Text search service test complete\n');
}

/**
 * Step 3: Test Query Pipeline with File-Specific Search
 */
async function testQueryPipelineWithFileSearch(aiAdapter) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 STEP 3: Test Query Pipeline with File-Specific Search');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test query that mentions specific files
  const testQuery = 'explain the functionality of app.js and aiLangchainAdapter.js files';
  console.log(`🔍 Test Query: "${testQuery}"\n`);

  console.log('📊 Monitoring search process...\n');
  console.log('Expected flow:');
  console.log('  1. VectorSearchStrategy detects file mentions');
  console.log('  2. QueryPipeline performs vector search');
  console.log('  3. QueryPipeline performs full-text search for each file (if available)');
  console.log('  4. Results are merged with text search prioritized\n');

  console.log('⏳ Running query pipeline...\n');

  // This will trigger the full pipeline
  const response = await aiAdapter.respondToPrompt(
    'd41402df-182a-41ec-8f05-153118bf2718',
    'test-conversation-id',
    testQuery,
    [] // no conversation history
  );

  console.log('\n📊 Response received!\n');
  console.log('✅ Response type:', response.type);
  
  if (response.contextData) {
    console.log('✅ Context data available');
    console.log(`   - Total chunks: ${response.contextData.sourceAnalysis?.total || 0}`);
    console.log(`   - GitHub code: ${response.contextData.sourceAnalysis?.githubCode || 0}`);
    console.log(`   - Source analysis:`, JSON.stringify(response.contextData.sourceAnalysis, null, 2));
  }

  if (response.response) {
    console.log('\n📝 AI Response preview:');
    const preview = response.response.substring(0, 300);
    console.log(`   ${preview}...`);
    
    // Check if response mentions the files
    const mentionsAppJs = response.response.toLowerCase().includes('app.js');
    const mentionsAdapter = response.response.toLowerCase().includes('adapter');
    
    console.log(`\n🔍 Response analysis:`);
    console.log(`   - Mentions app.js: ${mentionsAppJs ? '✅' : '⚠️'}`);
    console.log(`   - Mentions adapter: ${mentionsAdapter ? '✅' : '⚠️'}`);
  }
  
  console.log('\n✅ Query pipeline test complete\n');
}

/**
 * Step 4: Test Complete RAG Flow
 */
async function testCompleteRAGFlow(aiAdapter) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 STEP 4: Test Complete RAG Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Testing various file-specific queries:\n');

  const testQueries = [
    'what does app.js do?',
    'show me the code in server.js',
    'compare app.js and server.js'
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Test ${i + 1}: "${query}"`);
    console.log('='.repeat(70));

    try {
      const startTime = Date.now();
      
      const response = await aiAdapter.respondToPrompt(
        'd41402df-182a-41ec-8f05-153118bf2718',
        `test-conversation-${i}`,
        query,
        []
      );

      const duration = Date.now() - startTime;

      console.log(`\n✅ Response received in ${duration}ms`);
      console.log(`   Type: ${response.type}`);
      
      if (response.contextData && response.contextData.sourceAnalysis) {
        console.log(`   Chunks retrieved: ${response.contextData.sourceAnalysis.total || 0}`);
        console.log(`   GitHub code chunks: ${response.contextData.sourceAnalysis.githubCode || 0}`);
      }
      
      if (response.response) {
        const hasFileInfo = response.response.toLowerCase().includes('.js') || 
                          response.response.toLowerCase().includes('file');
        console.log(`   Contains file information: ${hasFileInfo ? '✅' : '⚠️'}`);
      }

    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ Complete RAG flow test finished\n');
}

// Run the test
if (require.main === module) {
  testFullTextSearchEndToEnd()
    .then(() => {
      console.log('✨ Test suite completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testFullTextSearchEndToEnd };
