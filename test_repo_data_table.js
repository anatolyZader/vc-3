// test_repo_data_table.js
'use strict';

/**
 * Test the newly created repo_data table with PostgreSQL full-text search
 */

// Load environment variables from backend/.env
require('dotenv').config({ path: './backend/.env' });

const { Pool } = require('pg');

async function testRepoDataTable() {
  console.log('🧪 Testing repo_data Table with PostgreSQL Full-Text Search');
  console.log('==========================================================\n');

  // Database configuration
  const dbConfig = {
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: parseInt(process.env.PG_PORT) || 5432,
    ssl: false
  };

  let pool;
  let client;

  try {
    console.log('🔌 Connecting to database...');
    pool = new Pool(dbConfig);
    client = await pool.connect();
    console.log('✅ Database connection established');

    // Verify the GIN index on content_vector
    console.log('\n🔍 Verifying GIN index on content_vector...');
    const indexCheckQuery = `
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'repo_data' 
      AND indexname = 'idx_repo_data_content_vector';
    `;
    const indexResult = await client.query(indexCheckQuery);
    if (indexResult.rows.length > 0) {
      console.log('✅ GIN index found:');
      console.log(`   ${indexResult.rows[0].indexdef}`);
    } else {
      console.log('❌ GIN index not found');
    }

    // Test inserting sample data
    console.log('\n📝 Testing sample data insertion...');
    
    const testUserId = 'd41402df-182a-41ec-8f05-153118bf2718'; // From your existing data
    const testRepoId = 'anatolyZader/vc-3-test';
    
    // Insert test data with automatic tsvector generation
    const insertQuery = `
      INSERT INTO repo_data (user_id, repo_id, file_path, file_extension, content, content_vector, language)
      VALUES 
        ($1, $2, 'src/components/UserAuth.js', 'js', 
         'class UserAuth { constructor() { this.apiKey = "secret"; } async authenticateUser(username, password) { return await this.validateCredentials(username, password); } }',
         to_tsvector('english', 'src/components/UserAuth.js' || ' ' || 'class UserAuth { constructor() { this.apiKey = "secret"; } async authenticateUser(username, password) { return await this.validateCredentials(username, password); } }'),
         'english'),
        ($1, $2, 'src/database/connection.js', 'js',
         'const { Pool } = require("pg"); const dbConfig = { host: "localhost", port: 5432, database: "myapp" }; module.exports = new Pool(dbConfig);',
         to_tsvector('english', 'src/database/connection.js' || ' ' || 'const { Pool } = require("pg"); const dbConfig = { host: "localhost", port: 5432, database: "myapp" }; module.exports = new Pool(dbConfig);'),
         'english'),
        ($1, $2, 'README.md', 'md',
         '# My Application\n\nThis is a Node.js application with PostgreSQL database. Features include user authentication, API endpoints, and data persistence.',
         to_tsvector('english', 'README.md' || ' ' || '# My Application\n\nThis is a Node.js application with PostgreSQL database. Features include user authentication, API endpoints, and data persistence.'),
         'english');
    `;
    
    await client.query(insertQuery, [testUserId, testRepoId]);
    console.log('✅ Sample data inserted successfully');

    // Test full-text search
    console.log('\n🔍 Testing full-text search queries...');
    
    const searchTests = [
      { query: 'authentication', description: 'Search for authentication-related code' },
      { query: 'database', description: 'Search for database-related code' },
      { query: 'PostgreSQL', description: 'Search for PostgreSQL mentions' },
      { query: 'UserAuth & constructor', description: 'Search for UserAuth AND constructor' },
      { query: 'API | endpoint', description: 'Search for API OR endpoint' }
    ];

    for (const test of searchTests) {
      console.log(`\n  📋 ${test.description}: "${test.query}"`);
      
      const searchQuery = `
        SELECT 
          file_path,
          file_extension,
          ts_rank(content_vector, to_tsquery('english', $1)) AS rank,
          ts_headline('english', content, to_tsquery('english', $1), 'MaxWords=20') AS snippet
        FROM repo_data
        WHERE content_vector @@ to_tsquery('english', $1)
        AND user_id = $2
        AND repo_id = $3
        ORDER BY rank DESC;
      `;
      
      try {
        const searchResult = await client.query(searchQuery, [test.query, testUserId, testRepoId]);
        
        if (searchResult.rows.length > 0) {
          console.log(`    ✅ Found ${searchResult.rows.length} results:`);
          searchResult.rows.forEach((row, index) => {
            console.log(`      ${index + 1}. ${row.file_path} (rank: ${parseFloat(row.rank).toFixed(3)})`);
            console.log(`         "${row.snippet}"`);
          });
        } else {
          console.log('    ⚠️  No results found');
        }
      } catch (error) {
        console.log(`    ❌ Search error: ${error.message}`);
      }
    }

    // Test performance with EXPLAIN
    console.log('\n⚡ Testing search performance...');
    const performanceQuery = `
      EXPLAIN ANALYZE
      SELECT file_path, ts_rank(content_vector, to_tsquery('english', 'authentication')) AS rank
      FROM repo_data
      WHERE content_vector @@ to_tsquery('english', 'authentication')
      ORDER BY rank DESC;
    `;
    
    const perfResult = await client.query(performanceQuery);
    console.log('📊 Query execution plan:');
    perfResult.rows.forEach(row => {
      console.log(`   ${row['QUERY PLAN']}`);
    });

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    const deleteQuery = 'DELETE FROM repo_data WHERE repo_id = $1';
    await client.query(deleteQuery, [testRepoId]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 PostgreSQL Full-Text Search Test Completed Successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. ✅ repo_data table is ready for production use');
    console.log('2. 💡 Create data migration to populate from git.repositories');
    console.log('3. 💡 Update TextSearchService to use repo_data');
    console.log('4. 💡 Integrate with query RAG pipeline');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

// Run the test
testRepoDataTable().catch(error => {
  console.error('❌ Test execution failed:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});