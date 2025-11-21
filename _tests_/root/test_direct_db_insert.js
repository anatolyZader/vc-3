// test_direct_db_insert.js
'use strict';

/**
 * Direct database test - manually insert documents into docs_data table
 * This bypasses the complex processing pipeline to test basic text search
 */

async function testDirectDBInsert() {
  console.log('🔧 Testing Direct Database Insert for Text Search');
  console.log('================================================\n');

  try {
    // Import the AI PostgresAdapter directly
    const AIPostgresAdapter = require('./backend/business_modules/ai/infrastructure/persistence/aiPostgresAdapter');
    
    console.log('📦 Services imported successfully');

    // Initialize PostgreSQL adapter
    const postgresAdapter = new AIPostgresAdapter({ cloudSqlConnector: null });
    await postgresAdapter.initPool();
    console.log('✅ PostgreSQL adapter initialized');

    // Get a database connection
    const pool = await postgresAdapter.getPool();
    const client = await pool.connect();
    
    try {
      console.log('✅ Database connection established');

      // Check if docs_data table exists
      console.log('\n🔍 Checking if docs_data table exists...');
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'docs_data'
        );
      `;
      
      const tableExists = await client.query(tableCheckQuery);
      console.log('📊 docs_data table exists:', tableExists.rows[0].exists);

      if (!tableExists.rows[0].exists) {
        console.log('\n🔨 Creating docs_data table...');
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS docs_data (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            repo_id VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `;
        await client.query(createTableQuery);
        console.log('✅ docs_data table created');
      }

      // Insert test documents
      console.log('\n📝 Inserting test documents...');
      const testDocuments = [
        {
          user_id: '8c81e450-6764-43c8-989f-74559c3143b5', // Our test user ID
          repo_id: 'test-repo-1',
          content: `
            // Authentication service with user login functionality
            class AuthService {
              async authenticateUser(email, password) {
                const user = await this.findUserByEmail(email);
                if (user && this.verifyPassword(password, user.hash)) {
                  return this.generateJWTToken(user);
                }
                throw new Error('Invalid credentials');
              }
              
              verifyPassword(password, hash) {
                return bcrypt.compare(password, hash);
              }
              
              generateJWTToken(user) {
                return jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY);
              }
            }
          `
        },
        {
          user_id: '8c81e450-6764-43c8-989f-74559c3143b5',
          repo_id: 'test-repo-2', 
          content: `
            # Database Operations Guide
            
            ## PostgreSQL Functions
            
            This document explains how to use PostgreSQL for data storage and retrieval.
            
            ### Text Search
            PostgreSQL provides powerful full-text search capabilities using:
            - tsvector for document indexing
            - tsquery for search queries
            - ts_rank for result ranking
            
            ### Example Usage
            
            Search for documents containing specific terms:
            SELECT * FROM documents WHERE to_tsvector('english', content) @@ plainto_tsquery('english', 'search term');
          `
        },
        {
          user_id: '8c81e450-6764-43c8-989f-74559c3143b5',
          repo_id: 'test-repo-3',
          content: `
            /**
             * API endpoint handlers for document management
             */
            const express = require('express');
            const router = express.Router();
            
            // Function to search documents by keyword
            router.get('/api/search', async (req, res) => {
              const { query } = req.query;
              
              if (!query) {
                return res.status(400).json({ error: 'Query parameter required' });
              }
              
              try {
                const results = await searchService.searchDocuments(query);
                res.json({ results, query });
              } catch (error) {
                res.status(500).json({ error: 'Search failed' });
              }
            });
            
            module.exports = router;
          `
        }
      ];

      for (let i = 0; i < testDocuments.length; i++) {
        const doc = testDocuments[i];
        const insertQuery = `
          INSERT INTO docs_data (user_id, repo_id, content)
          VALUES ($1, $2, $3)
          RETURNING id;
        `;
        
        const result = await client.query(insertQuery, [doc.user_id, doc.repo_id, doc.content]);
        console.log(`✅ Document ${i + 1} inserted with ID: ${result.rows[0].id}`);
      }

      // Test querying the data
      console.log('\n🔍 Testing data retrieval...');
      const countQuery = 'SELECT COUNT(*) FROM docs_data';
      const countResult = await client.query(countQuery);
      console.log(`📊 Total documents in database: ${countResult.rows[0].count}`);

      // Test a simple search
      console.log('\n🔍 Testing simple text search...');
      const searchQuery = `
        SELECT id, repo_id, 
               LENGTH(content) as content_length,
               SUBSTRING(content, 1, 100) as preview
        FROM docs_data 
        WHERE content ILIKE '%function%'
        LIMIT 3;
      `;
      
      const searchResult = await client.query(searchQuery);
      console.log(`📄 Found ${searchResult.rows.length} documents containing 'function':`);
      searchResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ID: ${row.id}, Repo: ${row.repo_id}, Length: ${row.content_length}`);
        console.log(`     Preview: ${row.preview.trim()}...`);
      });

      console.log('\n✅ Direct database operations successful!');
      console.log('💡 The docs_data table is working correctly');
      console.log('💡 Now test the API endpoints to see if they can access this data');

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDirectDBInsert().catch(console.error);