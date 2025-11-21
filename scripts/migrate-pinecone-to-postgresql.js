#!/usr/bin/env node
/**
 * Pinecone to PostgreSQL Migration Script
 * 
 * This script migrates vector data from Pinecone to PostgreSQL pgvector.
 * It fetches all vectors from specified Pinecone namespaces and stores them 
 * in PostgreSQL using the PGVectorStore from LangChain.
 * 
 * Usage:
 *   node migrate-pinecone-to-postgresql.js [namespace1] [namespace2] ...
 *   
 * If no namespaces are specified, it will migrate all available namespaces.
 */

require('dotenv').config({ path: './backend/.env' });
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const PGVectorService = require('../backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pgVectorService');

class PineconeToPostgreSQLMigrator {
  constructor() {
    this.pinecone = null;
    this.pineconeIndex = null;
    this.pgVectorService = null;
    this.embeddings = null;
    this.stats = {
      totalNamespaces: 0,
      migratedNamespaces: 0,
      totalVectors: 0,
      migratedVectors: 0,
      errors: []
    };
  }

  async initialize() {
    console.log('🔧 Initializing migration services...\n');

    // Initialize OpenAI embeddings
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small'
    });

    // Initialize Pinecone
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    this.pineconeIndex = this.pinecone.index(indexName);

    console.log(`✅ Pinecone connected to index: ${indexName}`);

    // Initialize PostgreSQL Vector Service
    this.pgVectorService = PGVectorService.fromEnvironment();
    console.log('✅ PostgreSQL pgvector service initialized');

    // Test PostgreSQL connection
    try {
      const testVectorStore = await this.pgVectorService.createVectorStore(this.embeddings, 'migration_test');
      console.log('✅ PostgreSQL connection verified');
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
    }

    console.log('🎯 Migration services ready!\n');
  }

  async listPineconeNamespaces() {
    try {
      const stats = await this.pineconeIndex.describeIndexStats();
      const namespaces = Object.keys(stats.namespaces || {});
      
      console.log(`📊 Found ${namespaces.length} namespaces in Pinecone:`);
      namespaces.forEach(ns => {
        const vectorCount = stats.namespaces[ns]?.vectorCount || 0;
        console.log(`   • ${ns}: ${vectorCount} vectors`);
      });
      console.log();

      this.stats.totalNamespaces = namespaces.length;
      return namespaces;
    } catch (error) {
      console.error('❌ Failed to list Pinecone namespaces:', error.message);
      throw error;
    }
  }

  async migrateNamespace(namespace) {
    console.log(`🔄 Migrating namespace: ${namespace}`);

    try {
      // Get all vectors from the namespace
      const vectors = await this.fetchAllVectors(namespace);
      
      if (vectors.length === 0) {
        console.log(`   ⚠️ No vectors found in namespace: ${namespace}`);
        return;
      }

      console.log(`   📥 Retrieved ${vectors.length} vectors from Pinecone`);

      // Create PostgreSQL collection for this namespace
      const vectorStore = await this.pgVectorService.createVectorStore(this.embeddings, namespace);

      // Convert Pinecone vectors to LangChain documents
      const documents = vectors.map(vector => ({
        pageContent: vector.metadata?.text || vector.metadata?.content || '',
        metadata: {
          ...vector.metadata,
          pinecone_id: vector.id,
          migrated_at: new Date().toISOString()
        },
        id: vector.id
      }));

      // Store in PostgreSQL in batches
      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        try {
          await vectorStore.addDocuments(batch, {
            ids: batch.map(doc => doc.id)
          });
          
          processed += batch.length;
          console.log(`   📝 Migrated ${processed}/${documents.length} vectors`);
        } catch (batchError) {
          console.error(`   ❌ Failed to migrate batch ${Math.floor(i / batchSize) + 1}:`, batchError.message);
          this.stats.errors.push({
            namespace,
            batch: Math.floor(i / batchSize) + 1,
            error: batchError.message
          });
        }
      }

      console.log(`   ✅ Successfully migrated ${processed} vectors to PostgreSQL collection: ${namespace}\n`);
      
      this.stats.migratedNamespaces++;
      this.stats.migratedVectors += processed;

    } catch (error) {
      console.error(`   ❌ Failed to migrate namespace ${namespace}:`, error.message);
      this.stats.errors.push({
        namespace,
        error: error.message
      });
    }
  }

  async fetchAllVectors(namespace) {
    const vectors = [];
    let paginationToken = null;
    
    try {
      do {
        const response = await this.pineconeIndex.namespace(namespace).listPaginated({
          limit: 100,
          paginationToken
        });
        
        if (response.vectors && response.vectors.length > 0) {
          // Fetch full vector data with metadata
          const vectorIds = response.vectors.map(v => v.id);
          const fetchResponse = await this.pineconeIndex.namespace(namespace).fetch(vectorIds);
          
          Object.values(fetchResponse.vectors || {}).forEach(vector => {
            if (vector) {
              vectors.push(vector);
            }
          });
        }
        
        paginationToken = response.pagination?.next;
      } while (paginationToken);

    } catch (error) {
      console.error(`Failed to fetch vectors from namespace ${namespace}:`, error.message);
      throw error;
    }

    return vectors;
  }

  async createHnswIndexes(namespaces) {
    console.log('🔧 Creating HNSW indexes for optimal performance...\n');

    for (const namespace of namespaces) {
      try {
        await this.pgVectorService.createHnswIndex(this.embeddings, {
          dimensions: 1536, // OpenAI text-embedding-3-small dimensions
          collectionName: namespace,
          m: 16,
          efConstruction: 64
        });
        
        console.log(`   ✅ Created HNSW index for collection: ${namespace}`);
      } catch (error) {
        console.warn(`   ⚠️ Failed to create HNSW index for ${namespace}:`, error.message);
      }
    }
    console.log();
  }

  async verifyMigration(namespaces) {
    console.log('🔍 Verifying migration...\n');

    for (const namespace of namespaces) {
      try {
        const vectorStore = await this.pgVectorService.createVectorStore(this.embeddings, namespace);
        
        // Perform a test similarity search
        const testResults = await vectorStore.similaritySearch('test query', 1);
        
        if (testResults && testResults.length > 0) {
          console.log(`   ✅ ${namespace}: Migration verified - ${testResults.length} documents accessible`);
        } else {
          console.log(`   ⚠️ ${namespace}: No documents found in PostgreSQL`);
        }
      } catch (error) {
        console.error(`   ❌ ${namespace}: Verification failed - ${error.message}`);
      }
    }
    console.log();
  }

  printStatistics() {
    console.log('📊 Migration Statistics:');
    console.log('=' .repeat(50));
    console.log(`Total Namespaces: ${this.stats.totalNamespaces}`);
    console.log(`Migrated Namespaces: ${this.stats.migratedNamespaces}`);
    console.log(`Total Vectors: ${this.stats.totalVectors}`);
    console.log(`Migrated Vectors: ${this.stats.migratedVectors}`);
    console.log(`Success Rate: ${((this.stats.migratedNamespaces / this.stats.totalNamespaces) * 100).toFixed(1)}%`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors (${this.stats.errors.length}):`);
      this.stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.namespace}${error.batch ? ` (batch ${error.batch})` : ''}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 Migration completed!');
  }

  async migrate(targetNamespaces = []) {
    try {
      await this.initialize();

      // Get list of namespaces to migrate
      const allNamespaces = await this.listPineconeNamespaces();
      const namespacesToMigrate = targetNamespaces.length > 0 
        ? targetNamespaces.filter(ns => allNamespaces.includes(ns))
        : allNamespaces;

      if (namespacesToMigrate.length === 0) {
        console.log('⚠️ No valid namespaces found to migrate.');
        return;
      }

      console.log(`🎯 Migrating ${namespacesToMigrate.length} namespaces...\n`);

      // Migrate each namespace
      for (const namespace of namespacesToMigrate) {
        await this.migrateNamespace(namespace);
      }

      // Create HNSW indexes for performance
      await this.createHnswIndexes(namespacesToMigrate);

      // Verify migration
      await this.verifyMigration(namespacesToMigrate);

      // Print final statistics
      this.printStatistics();

    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    } finally {
      // Close connections
      if (this.pgVectorService) {
        await this.pgVectorService.disconnect();
      }
    }
  }
}

// Main execution
async function main() {
  const migrator = new PineconeToPostgreSQLMigrator();
  
  // Get target namespaces from command line arguments
  const targetNamespaces = process.argv.slice(2);
  
  if (targetNamespaces.length > 0) {
    console.log(`🎯 Target namespaces: ${targetNamespaces.join(', ')}\n`);
  } else {
    console.log('🎯 Migrating all available namespaces\n');
  }
  
  await migrator.migrate(targetNamespaces);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run migration
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
}

module.exports = PineconeToPostgreSQLMigrator;