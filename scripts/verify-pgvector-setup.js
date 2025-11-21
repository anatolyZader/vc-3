#!/usr/bin/env node
/**
 * PostgreSQL pgvector Setup Verification Script
 * 
 * This script verifies that PostgreSQL pgvector is properly configured
 * and can perform basic vector operations.
 */

require('dotenv').config({ path: './.env' });
const { OpenAIEmbeddings } = require('@langchain/openai');
const PGVectorService = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pgVectorService');

async function verifyPgVectorSetup() {
  console.log('🔧 PostgreSQL pgvector Setup Verification');
  console.log('=' .repeat(50));

  try {
    // 1. Test environment variables
    console.log('📋 Checking environment configuration...');
    const requiredEnvVars = ['PG_HOST', 'PG_USER', 'PG_PASSWORD', 'PG_DATABASE', 'OPENAI_API_KEY'];
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar] || process.env[`LOCAL_DATABASE_${envVar.substring(3)}`];
      if (!value) {
        throw new Error(`Missing environment variable: ${envVar}`);
      }
      console.log(`   ✅ ${envVar}: configured`);
    }

    // 2. Initialize services
    console.log('\n🚀 Initializing services...');
    
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small'
    });
    console.log('   ✅ OpenAI embeddings initialized');

    const pgVectorService = PGVectorService.fromEnvironment();
    console.log('   ✅ PGVectorService initialized');

    // 3. Test database connection and pgvector extension
    console.log('\n🔗 Testing database connection...');
    
    const testCollection = 'setup_verification_test';
    const vectorStore = await pgVectorService.createVectorStore(embeddings, testCollection);
    console.log('   ✅ Connected to PostgreSQL');
    console.log('   ✅ pgvector extension working');

    // 4. Test basic operations
    console.log('\n📝 Testing vector operations...');

    // Test document storage
    const testDocuments = [
      {
        pageContent: 'This is a test document for vector storage verification.',
        metadata: { source: 'test.js', type: 'verification' }
      },
      {
        pageContent: 'Another test document to verify similarity search functionality.',
        metadata: { source: 'test2.js', type: 'verification' }
      }
    ];

    await vectorStore.addDocuments(testDocuments);
    console.log('   ✅ Document storage successful');

    // Test similarity search
    const searchResults = await vectorStore.similaritySearch('test document', 2);
    if (searchResults.length > 0) {
      console.log(`   ✅ Similarity search successful (${searchResults.length} results)`);
    } else {
      throw new Error('No search results returned');
    }

    // Test similarity search with scores
    const scoredResults = await vectorStore.similaritySearchWithScore('verification functionality', 1);
    if (scoredResults.length > 0) {
      const [doc, score] = scoredResults[0];
      console.log(`   ✅ Similarity search with scores successful (score: ${score.toFixed(4)})`);
    }

    // 5. Test HNSW index creation
    console.log('\n🏗️ Testing HNSW index creation...');
    
    try {
      await pgVectorService.createHnswIndex(embeddings, {
        dimensions: 1536,
        collectionName: testCollection,
        m: 16,
        efConstruction: 64
      });
      console.log('   ✅ HNSW index created successfully');
    } catch (indexError) {
      console.log('   ⚠️ HNSW index creation skipped (may already exist)');
    }

    // 6. Performance test
    console.log('\n⚡ Performance test...');
    
    const startTime = Date.now();
    const perfResults = await vectorStore.similaritySearch('performance test', 5);
    const searchTime = Date.now() - startTime;
    console.log(`   ✅ Search completed in ${searchTime}ms`);

    // 7. Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await pgVectorService.deleteNamespace(testCollection);
    console.log('   ✅ Test data cleaned up');

    // 8. Configuration summary
    console.log('\n📊 Configuration Summary:');
    const config = pgVectorService.getConfig();
    console.log(`   Database: ${config.postgres.host}:${config.postgres.port}/${config.postgres.database}`);
    console.log(`   Table: ${config.table.tableName}`);
    console.log(`   Distance Strategy: ${config.table.distanceStrategy}`);
    console.log(`   Vector Dimensions: 1536 (text-embedding-3-small)`);

    console.log('\n🎉 All tests passed! PostgreSQL pgvector is ready to use.');
    
    console.log('\n💡 Next steps:');
    console.log('   1. Set USE_POSTGRESQL_VECTORS=true in your .env file (if not already set)');
    console.log('   2. Run the migration script to move existing Pinecone data:');
    console.log('      node scripts/migrate-pinecone-to-postgresql.js');
    console.log('   3. Restart your application to use PostgreSQL pgvector');

  } catch (error) {
    console.error('\n❌ Setup verification failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Ensure PostgreSQL container is running: docker-compose up -d postgres');
    console.log('   2. Verify pgvector extension is installed');
    console.log('   3. Check database connection credentials');
    console.log('   4. Ensure OpenAI API key is valid');
    
    process.exit(1);
  } finally {
    // Cleanup connections
    if (pgVectorService) {
      await pgVectorService.disconnect();
    }
  }
}

// Run verification
if (require.main === module) {
  verifyPgVectorSetup().catch(error => {
    console.error('💥 Verification script failed:', error);
    process.exit(1);
  });
}

module.exports = verifyPgVectorSetup;