#!/usr/bin/env node
/**
 * Comprehensive PostgreSQL Vector Functionality Test
 * 
 * This script performs extensive testing of the pgvector functionality
 * and provides detailed diagnostics and benchmarks.
 */

require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');

class PostgreSQLVectorTester {
  constructor() {
    this.pool = new Pool({
      host: process.env.PG_HOST || process.env.LOCAL_DATABASE_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || process.env.LOCAL_DATABASE_PORT) || 5433,
      user: process.env.PG_USER || process.env.LOCAL_DATABASE_USER || 'eventstorm_user',
      password: process.env.PG_PASSWORD || process.env.LOCAL_DATABASE_PASSWORD || 'local_dev_password',
      database: process.env.PG_DATABASE || process.env.LOCAL_DATABASE_NAME || 'eventstorm_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.testResults = {
      connectionTest: null,
      extensionTest: null,
      tableCreationTest: null,
      vectorOperationsTest: null,
      performanceTest: null,
      langchainTest: null,
      errors: []
    };
  }

  async testDatabaseConnection() {
    console.log('🔗 Testing Database Connection...');
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT version();');
      console.log(`   ✅ Connected to PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
      
      // Test basic queries
      await client.query('SELECT NOW();');
      console.log('   ✅ Basic queries working');
      
      client.release();
      this.testResults.connectionTest = { success: true, message: 'Connection successful' };
      return true;
    } catch (error) {
      console.error('   ❌ Connection failed:', error.message);
      this.testResults.connectionTest = { success: false, error: error.message };
      return false;
    }
  }

  async testPgVectorExtension() {
    console.log('\n🧩 Testing pgvector Extension...');
    try {
      const client = await this.pool.connect();
      
      // Check if pgvector is available
      const extensionCheck = await client.query(
        "SELECT * FROM pg_available_extensions WHERE name = 'vector'"
      );
      
      if (extensionCheck.rows.length === 0) {
        console.log('   ⚠️ pgvector extension not available in this PostgreSQL installation');
        console.log('   💡 Consider installing pgvector or using Docker with pgvector/pgvector image');
        this.testResults.extensionTest = { success: false, error: 'pgvector not available' };
        client.release();
        return false;
      }

      // Try to install the extension
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('   ✅ pgvector extension created/verified');
      } catch (extError) {
        console.error('   ❌ Failed to create pgvector extension:', extError.message);
        this.testResults.extensionTest = { success: false, error: extError.message };
        client.release();
        return false;
      }

      // Check extension installation
      const installedExtensions = await client.query(
        "SELECT * FROM pg_extension WHERE extname = 'vector'"
      );
      
      if (installedExtensions.rows.length > 0) {
        console.log('   ✅ pgvector extension successfully installed');
        this.testResults.extensionTest = { success: true, message: 'Extension available and installed' };
      } else {
        console.log('   ❌ pgvector extension installation failed');
        this.testResults.extensionTest = { success: false, error: 'Extension installation failed' };
      }
      
      client.release();
      return installedExtensions.rows.length > 0;
    } catch (error) {
      console.error('   ❌ Extension test failed:', error.message);
      this.testResults.extensionTest = { success: false, error: error.message };
      return false;
    }
  }

  async testVectorTableCreation() {
    console.log('\n📊 Testing Vector Table Creation...');
    try {
      const client = await this.pool.connect();
      
      // Drop existing test table
      await client.query('DROP TABLE IF EXISTS vector_test_table CASCADE;');
      
      // Create test table with vector column
      await client.query(`
        CREATE TABLE vector_test_table (
          id SERIAL PRIMARY KEY,
          content TEXT,
          embedding VECTOR(1536),
          metadata JSONB
        );
      `);
      console.log('   ✅ Vector table created successfully');

      // Create index for vector similarity search
      await client.query(`
        CREATE INDEX ON vector_test_table USING hnsw (embedding vector_cosine_ops);
      `);
      console.log('   ✅ HNSW index created successfully');

      this.testResults.tableCreationTest = { success: true, message: 'Table and index created' };
      client.release();
      return true;
    } catch (error) {
      console.error('   ❌ Table creation failed:', error.message);
      this.testResults.tableCreationTest = { success: false, error: error.message };
      return false;
    }
  }

  async testBasicVectorOperations() {
    console.log('\n🧮 Testing Basic Vector Operations...');
    try {
      const client = await this.pool.connect();
      
      // Insert test vectors
      const testVectors = [
        {
          content: 'This is a test document about machine learning',
          embedding: Array(1536).fill(0).map(() => Math.random() - 0.5),
          metadata: { topic: 'ai', source: 'test1.txt' }
        },
        {
          content: 'A document about web development and JavaScript',
          embedding: Array(1536).fill(0).map(() => Math.random() - 0.5),
          metadata: { topic: 'web', source: 'test2.txt' }
        },
        {
          content: 'Database optimization and query performance',
          embedding: Array(1536).fill(0).map(() => Math.random() - 0.5),
          metadata: { topic: 'database', source: 'test3.txt' }
        }
      ];

      for (const [index, vector] of testVectors.entries()) {
        await client.query(
          'INSERT INTO vector_test_table (content, embedding, metadata) VALUES ($1, $2, $3)',
          [vector.content, JSON.stringify(vector.embedding), vector.metadata]
        );
      }
      console.log(`   ✅ Inserted ${testVectors.length} test vectors`);

      // Test vector similarity search
      const queryVector = Array(1536).fill(0).map(() => Math.random() - 0.5);
      const similarityResult = await client.query(`
        SELECT content, metadata, (embedding <=> $1::vector) as distance
        FROM vector_test_table 
        ORDER BY embedding <=> $1::vector 
        LIMIT 3
      `, [JSON.stringify(queryVector)]);

      console.log(`   ✅ Similarity search returned ${similarityResult.rows.length} results`);
      similarityResult.rows.forEach((row, i) => {
        console.log(`      ${i + 1}. Distance: ${row.distance.toFixed(4)}, Topic: ${row.metadata.topic}`);
      });

      // Test metadata filtering with vectors
      const filteredResult = await client.query(`
        SELECT content, metadata, (embedding <=> $1::vector) as distance
        FROM vector_test_table 
        WHERE metadata->>'topic' = 'ai'
        ORDER BY embedding <=> $1::vector 
        LIMIT 2
      `, [JSON.stringify(queryVector)]);

      console.log(`   ✅ Filtered search returned ${filteredResult.rows.length} AI-related results`);

      this.testResults.vectorOperationsTest = { 
        success: true, 
        message: `Operations successful, ${testVectors.length} vectors processed` 
      };
      
      client.release();
      return true;
    } catch (error) {
      console.error('   ❌ Vector operations failed:', error.message);
      this.testResults.vectorOperationsTest = { success: false, error: error.message };
      return false;
    }
  }

  async testPerformance() {
    console.log('\n⚡ Performance Testing...');
    try {
      const client = await this.pool.connect();
      
      // Insert more vectors for performance testing
      console.log('   📝 Inserting performance test vectors...');
      const batchSize = 100;
      const insertStart = Date.now();
      
      for (let batch = 0; batch < 5; batch++) {
        const values = [];
        const params = [];
        
        for (let i = 0; i < batchSize; i++) {
          const paramIndex = i * 3;
          values.push(`($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
          params.push(
            `Performance test document ${batch * batchSize + i}`,
            JSON.stringify(Array(1536).fill(0).map(() => Math.random() - 0.5)),
            JSON.stringify({ batch: batch, index: i, test: 'performance' })
          );
        }
        
        await client.query(
          `INSERT INTO vector_test_table (content, embedding, metadata) VALUES ${values.join(', ')}`,
          params
        );
      }
      
      const insertTime = Date.now() - insertStart;
      console.log(`   ✅ Inserted ${5 * batchSize} vectors in ${insertTime}ms (${(insertTime / (5 * batchSize)).toFixed(2)}ms per vector)`);

      // Performance test: Multiple similarity searches
      console.log('   🔍 Testing search performance...');
      const searchStart = Date.now();
      const searchCount = 10;
      
      for (let i = 0; i < searchCount; i++) {
        const queryVector = Array(1536).fill(0).map(() => Math.random() - 0.5);
        await client.query(`
          SELECT content, (embedding <=> $1::vector) as distance
          FROM vector_test_table 
          ORDER BY embedding <=> $1::vector 
          LIMIT 10
        `, [JSON.stringify(queryVector)]);
      }
      
      const searchTime = Date.now() - searchStart;
      console.log(`   ✅ Completed ${searchCount} searches in ${searchTime}ms (${(searchTime / searchCount).toFixed(2)}ms per search)`);

      // Get table statistics
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_vectors,
          pg_size_pretty(pg_total_relation_size('vector_test_table')) as table_size
        FROM vector_test_table
      `);
      
      console.log(`   📊 Table statistics: ${stats.rows[0].total_vectors} vectors, ${stats.rows[0].table_size} total size`);

      this.testResults.performanceTest = { 
        success: true, 
        insertTime: insertTime,
        searchTime: searchTime,
        vectorCount: stats.rows[0].total_vectors
      };
      
      client.release();
      return true;
    } catch (error) {
      console.error('   ❌ Performance test failed:', error.message);
      this.testResults.performanceTest = { success: false, error: error.message };
      return false;
    }
  }

  async testLangChainIntegration() {
    console.log('\n🦜 Testing LangChain Integration...');
    try {
      // Import LangChain components
      const { OpenAIEmbeddings } = require('@langchain/openai');
      const PGVectorService = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pgVectorService');

      if (!process.env.OPENAI_API_KEY) {
        console.log('   ⚠️ OpenAI API key not found, skipping LangChain test');
        this.testResults.langchainTest = { success: false, error: 'OpenAI API key missing' };
        return false;
      }

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        model: 'text-embedding-3-small'
      });

      const pgVectorService = PGVectorService.fromEnvironment();
      console.log('   ✅ LangChain services initialized');

      // Test vector store creation
      const testCollection = 'langchain_test_collection';
      const vectorStore = await pgVectorService.createVectorStore(embeddings, testCollection);
      console.log('   ✅ PGVectorStore created successfully');

      // Test document addition
      const testDocs = [
        {
          pageContent: 'LangChain is a framework for developing applications powered by language models.',
          metadata: { source: 'langchain_docs.md', topic: 'framework' }
        },
        {
          pageContent: 'Vector databases store high-dimensional vectors for similarity search.',
          metadata: { source: 'vector_guide.md', topic: 'vectors' }
        }
      ];

      await vectorStore.addDocuments(testDocs);
      console.log('   ✅ Documents added to vector store');

      // Test similarity search
      const searchResults = await vectorStore.similaritySearch('language models', 2);
      console.log(`   ✅ Similarity search returned ${searchResults.length} results`);
      
      searchResults.forEach((doc, i) => {
        console.log(`      ${i + 1}. ${doc.pageContent.substring(0, 50)}... [${doc.metadata.topic}]`);
      });

      // Test similarity search with scores
      const scoredResults = await vectorStore.similaritySearchWithScore('vector database', 1);
      if (scoredResults.length > 0) {
        const [doc, score] = scoredResults[0];
        console.log(`   ✅ Similarity search with score: ${score.toFixed(4)}`);
      }

      // Cleanup test collection
      await pgVectorService.deleteNamespace(testCollection);
      console.log('   🧹 Test collection cleaned up');

      this.testResults.langchainTest = { 
        success: true, 
        message: 'LangChain integration working correctly' 
      };
      return true;
    } catch (error) {
      console.error('   ❌ LangChain integration test failed:', error.message);
      this.testResults.langchainTest = { success: false, error: error.message };
      return false;
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    try {
      const client = await this.pool.connect();
      await client.query('DROP TABLE IF EXISTS vector_test_table CASCADE;');
      console.log('   ✅ Test tables cleaned up');
      client.release();
    } catch (error) {
      console.warn('   ⚠️ Cleanup warning:', error.message);
    }
  }

  generateReport() {
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(50));
    
    const tests = [
      { name: 'Database Connection', result: this.testResults.connectionTest },
      { name: 'pgvector Extension', result: this.testResults.extensionTest },
      { name: 'Vector Table Creation', result: this.testResults.tableCreationTest },
      { name: 'Vector Operations', result: this.testResults.vectorOperationsTest },
      { name: 'Performance Test', result: this.testResults.performanceTest },
      { name: 'LangChain Integration', result: this.testResults.langchainTest }
    ];

    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
      if (test.result) {
        if (test.result.success) {
          console.log(`✅ ${test.name}: PASSED`);
          passed++;
        } else {
          console.log(`❌ ${test.name}: FAILED - ${test.result.error}`);
          failed++;
        }
      } else {
        console.log(`⚪ ${test.name}: NOT RUN`);
      }
    });

    console.log(`\n📈 Overall Results: ${passed} passed, ${failed} failed`);
    
    if (passed === tests.length) {
      console.log('🎉 All tests passed! pgvector functionality is working correctly.');
    } else if (passed > 0) {
      console.log('⚠️ Some tests failed. Check the errors above for details.');
    } else {
      console.log('❌ All tests failed. There may be a configuration issue.');
    }

    return { passed, failed, total: tests.length };
  }

  async runAllTests() {
    console.log('🔧 PostgreSQL pgvector Comprehensive Testing');
    console.log('=' .repeat(60));

    try {
      // Test 1: Database Connection
      const connectionOk = await this.testDatabaseConnection();
      if (!connectionOk) {
        console.log('\n❌ Database connection failed. Cannot proceed with other tests.');
        return this.generateReport();
      }

      // Test 2: pgvector Extension
      const extensionOk = await this.testPgVectorExtension();
      
      // Test 3: Vector Table Creation (only if extension is available)
      let tableOk = false;
      if (extensionOk) {
        tableOk = await this.testVectorTableCreation();
      }

      // Test 4: Basic Vector Operations (only if table creation succeeded)
      if (tableOk) {
        await this.testBasicVectorOperations();
        await this.testPerformance();
      }

      // Test 5: LangChain Integration (independent of pgvector)
      await this.testLangChainIntegration();

      // Cleanup
      await this.cleanup();

      return this.generateReport();
    } catch (error) {
      console.error('\n💥 Test suite failed:', error.message);
      this.testResults.errors.push(error.message);
      return this.generateReport();
    } finally {
      await this.pool.end();
    }
  }
}

// Run comprehensive tests
async function main() {
  const tester = new PostgreSQLVectorTester();
  const results = await tester.runAllTests();
  
  if (results.failed > 0) {
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Ensure PostgreSQL is running on the correct port');
    console.log('   2. Install pgvector extension: apt install postgresql-XX-pgvector');
    console.log('   3. Or use Docker: docker run -d --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 pgvector/pgvector:pg16');
    console.log('   4. Verify database credentials in .env file');
    console.log('   5. Check OpenAI API key for LangChain tests');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = PostgreSQLVectorTester;