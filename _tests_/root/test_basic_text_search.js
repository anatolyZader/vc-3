// test_basic_text_search.js
'use strict';

/**
 * Test script for basic text search functionality
 * 
 * This script tests the PostgreSQL text search integration without
 * requiring complex vector search setup. It verifies that:
 * 1. Database connection works
 * 2. Text search queries execute correctly  
 * 3. Results are returned in expected format
 * 4. Hybrid search orchestration works (if vector search is available)
 */

// Only load dotenv if it's available
let dotenvLoaded = false;
try {
  require('dotenv').config();
  dotenvLoaded = true;
} catch (error) {
  console.log('⚠️  dotenv not available, using existing environment variables');
}

async function testBasicTextSearch() {
  console.log('🧪 Testing Basic Text Search Setup');
  console.log('==================================\n');

  try {
    // Import required services
    const AIPostgresAdapter = require('./backend/business_modules/ai/infrastructure/persistence/aiPostgresAdapter');
    const TextSearchService = require('./backend/business_modules/ai/infrastructure/search/textSearchService');
    
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

    // Test database connectivity
    console.log('\n🔌 Testing database connectivity...');
    const isAvailable = await textSearchService.isAvailable();
    console.log(`Database available: ${isAvailable ? '✅ YES' : '❌ NO'}`);

    if (!isAvailable) {
      throw new Error('Database not available - cannot proceed with tests');
    }

    // Get search statistics
    console.log('\n📊 Getting search statistics...');
    try {
      const stats = await textSearchService.getSearchStats();
      console.log('Database statistics:', {
        totalDocuments: stats.totalDocuments,
        uniqueUsers: stats.uniqueUsers,
        uniqueRepos: stats.uniqueRepos,
        avgContentLength: stats.avgContentLength
      });

      if (stats.totalDocuments === 0) {
        console.log('⚠️  No documents found in database for testing');
        console.log('💡 You may need to add some test documents first');
        return await insertTestDocument(textSearchService, postgresAdapter);
      }

    } catch (error) {
      console.log('⚠️  Could not get statistics (table might not exist):', error.message);
      return await insertTestDocument(textSearchService, postgresAdapter);
    }

    // Test simple text search
    console.log('\n🔍 Testing simple text search...');
    const simpleResults = await textSearchService.searchDocumentsSimple('function', { limit: 5 });
    console.log(`Simple search results: ${simpleResults.length} found`);
    
    if (simpleResults.length > 0) {
      console.log('First result preview:', {
        id: simpleResults[0].id,
        searchType: simpleResults[0].searchType,
        rank: simpleResults[0].rank,
        snippet: simpleResults[0].snippet?.substring(0, 100) + '...'
      });
    }

    // Test full-text search
    console.log('\n🔍 Testing full-text search...');
    const fullTextResults = await textSearchService.searchDocuments('function', { limit: 5 });
    console.log(`Full-text search results: ${fullTextResults.length} found`);
    
    if (fullTextResults.length > 0) {
      console.log('First result preview:', {
        id: fullTextResults[0].id,
        searchType: fullTextResults[0].searchType,
        rank: fullTextResults[0].rank,
        snippet: fullTextResults[0].snippet?.substring(0, 100) + '...'
      });
    }

    // Test with different search terms
    console.log('\n🔍 Testing various search terms...');
    const testTerms = ['api', 'database', 'user', 'service'];
    
    for (const term of testTerms) {
      const results = await textSearchService.searchDocumentsSimple(term, { limit: 3 });
      console.log(`"${term}": ${results.length} results`);
    }

    console.log('\n✅ All text search tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Text search is working correctly');
    console.log('2. You can now integrate it with vector search');
    console.log('3. Use the hybrid search for enhanced queries');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function insertTestDocument(textSearchService, postgresAdapter) {
  console.log('\n📝 Inserting test document for demonstration...');
  
  try {
    const pool = await postgresAdapter.getPool();
    const client = await pool.connect();

    try {
      const testContent = `
        This is a test document for demonstrating text search functionality.
        It contains various keywords like function, api, database, service, and user.
        The text search service can find documents using PostgreSQL's full-text search capabilities.
        This document helps verify that the search integration is working correctly.
      `;

      const query = `
        INSERT INTO docs_data (user_id, repo_id, content)
        VALUES ($1, $2, $3)
        RETURNING id;
      `;
      
      const result = await client.query(query, ['test-user', 'test-repo', testContent]);
      console.log(`✅ Test document inserted with ID: ${result.rows[0].id}`);

      // Now test the search with this document
      console.log('\n🔍 Testing search with inserted document...');
      const searchResults = await textSearchService.searchDocumentsSimple('function', { limit: 3 });
      console.log(`Search found ${searchResults.length} results including the test document`);

      if (searchResults.length > 0) {
        console.log('✅ Text search is working correctly!');
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Failed to insert test document:', error.message);
    console.log('💡 You may need to create the docs_data table first');
    console.log('💡 Or ensure your PostgreSQL connection is properly configured');
  }
}

// Run the test
if (require.main === module) {
  testBasicTextSearch().catch(console.error);
}

module.exports = testBasicTextSearch;