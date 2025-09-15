/**
 * Modern Pinecone Integration Test
 * 
 * Tests the new PineconeService and related components to ensure
 * they work correctly with the latest Pinecone API patterns.
 */

const PineconeService = require('./business_modules/ai/infrastructure/ai/pinecone/PineconeService');
const ModernVectorStorageManager = require('./business_modules/ai/infrastructure/ai/vector/ModernVectorStorageManager');
const ModernVectorSearchOrchestrator = require('./business_modules/ai/infrastructure/ai/search/ModernVectorSearchOrchestrator');
const { OpenAIEmbeddings } = require('@langchain/openai');

require('dotenv').config();

class PineconeIntegrationTest {
  constructor() {
    this.testNamespace = `test_${Date.now()}`;
    this.cleanupIds = [];
    
    this.logger = {
      info: (msg) => console.log(`[TEST] ${msg}`),
      success: (msg) => console.log(`[TEST] ✅ ${msg}`),
      error: (msg) => console.error(`[TEST] ❌ ${msg}`),
      warn: (msg) => console.warn(`[TEST] ⚠️ ${msg}`)
    };
  }

  async runAllTests() {
    this.logger.info('🧪 Starting Modern Pinecone Integration Tests');
    
    try {
      // Test 1: PineconeService basic functionality
      await this.testPineconeService();
      
      // Test 2: Vector Storage Manager
      await this.testVectorStorageManager();
      
      // Test 3: Vector Search Orchestrator
      await this.testVectorSearchOrchestrator();
      
      // Test 4: End-to-end workflow
      await this.testEndToEndWorkflow();
      
      this.logger.success('All tests passed! 🎉');
      
    } catch (error) {
      this.logger.error(`Test failed: ${error.message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async testPineconeService() {
    this.logger.info('Testing PineconeService...');
    
    const service = new PineconeService();
    
    // Test connection
    const connected = await service.connect();
    if (!connected) {
      throw new Error('Failed to connect to Pinecone');
    }
    this.logger.success('PineconeService connected successfully');
    
    // Test index stats
    const stats = await service.getIndexStats();
    this.logger.info(`Index contains ${stats.totalVectorCount || 0} vectors`);
    this.logger.success('PineconeService stats retrieved');
    
    // Test namespace operations
    const namespaces = await service.listNamespaces();
    this.logger.info(`Found ${namespaces.length} existing namespaces`);
    this.logger.success('PineconeService namespace listing works');
    
    await service.disconnect();
    this.logger.success('PineconeService tests completed');
  }

  async testVectorStorageManager() {
    this.logger.info('Testing ModernVectorStorageManager...');
    
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const storageManager = new ModernVectorStorageManager({
      embeddings
    });
    
    // Create test documents
    const testDocs = [
      {
        pageContent: 'This is a test document about EventStorm architecture.',
        metadata: {
          source: 'test_file_1.md',
          fileType: 'markdown',
          repoName: 'test-repo'
        }
      },
      {
        pageContent: 'This document explains Pinecone vector database integration.',
        metadata: {
          source: 'test_file_2.md',
          fileType: 'markdown',
          repoName: 'test-repo'
        }
      }
    ];
    
    // Test storing documents
    const result = await storageManager.storeToPinecone(
      testDocs,
      this.testNamespace,
      'test-owner',
      'test-repo'
    );
    
    if (!result.success || result.chunksStored !== 2) {
      throw new Error('Failed to store test documents');
    }
    
    this.cleanupIds.push(...result.documentIds);
    this.logger.success(`Stored ${result.chunksStored} documents in namespace ${this.testNamespace}`);
    
    // Test namespace info
    const namespaceInfo = await storageManager.getNamespaceInfo(this.testNamespace);
    if (!namespaceInfo || namespaceInfo.vectorCount === 0) {
      throw new Error('Namespace should contain vectors after storage');
    }
    
    this.logger.success('ModernVectorStorageManager tests completed');
  }

  async testVectorSearchOrchestrator() {
    this.logger.info('Testing ModernVectorSearchOrchestrator...');
    
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY
    });
    
    const searchOrchestrator = new ModernVectorSearchOrchestrator({
      embeddings
    });
    
    // Test semantic search
    const searchResults = await searchOrchestrator.searchSimilar(
      'EventStorm architecture patterns',
      {
        namespace: this.testNamespace,
        topK: 5,
        threshold: 0.5
      }
    );
    
    if (searchResults.matches.length === 0) {
      throw new Error('Search should return results for test documents');
    }
    
    this.logger.success(`Found ${searchResults.matches.length} relevant documents`);
    
    // Test advanced search
    const advancedResults = await searchOrchestrator.advancedSearch(
      'Pinecone vector database',
      {
        namespace: this.testNamespace,
        strategies: ['semantic'],
        topK: 3
      }
    );
    
    if (!advancedResults.semantic || advancedResults.semantic.matches.length === 0) {
      throw new Error('Advanced search should return semantic results');
    }
    
    this.logger.success('ModernVectorSearchOrchestrator tests completed');
  }

  async testEndToEndWorkflow() {
    this.logger.info('Testing end-to-end workflow...');
    
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Initialize services
    const storageManager = new ModernVectorStorageManager({ embeddings });
    const searchOrchestrator = new ModernVectorSearchOrchestrator({ embeddings });
    
    // Create more comprehensive test data
    const repoDocuments = [
      {
        pageContent: 'class UserService { async createUser(userData) { return await this.userRepository.save(userData); } }',
        metadata: {
          source: 'services/UserService.js',
          fileType: 'javascript',
          repoName: 'eventstorm-test',
          semantic_role: 'service',
          layer: 'application',
          eventstorm_module: 'user_management'
        }
      },
      {
        pageContent: 'const express = require("express"); const router = express.Router(); router.get("/users", getUsersHandler);',
        metadata: {
          source: 'routes/userRoutes.js',
          fileType: 'javascript',
          repoName: 'eventstorm-test',
          semantic_role: 'controller',
          layer: 'interface',
          eventstorm_module: 'user_management'
        }
      },
      {
        pageContent: 'interface IUserRepository { save(user: User): Promise<User>; findById(id: string): Promise<User>; }',
        metadata: {
          source: 'domain/IUserRepository.ts',
          fileType: 'typescript',
          repoName: 'eventstorm-test',
          semantic_role: 'port',
          layer: 'domain',
          eventstorm_module: 'user_management'
        }
      }
    ];
    
    const testUserId = `test-user-${Date.now()}`;
    const testRepoId = 'eventstorm-test';
    
    // Store repository documents
    const storeResult = await storageManager.storeRepositoryDocuments(
      repoDocuments,
      testUserId,
      testRepoId,
      'test-owner',
      'eventstorm-test'
    );
    
    if (!storeResult.success || storeResult.chunksStored !== 3) {
      throw new Error('Failed to store repository documents');
    }
    
    this.logger.success(`Stored ${storeResult.chunksStored} repository documents`);
    
    // Search within the repository
    const repoSearchResults = await searchOrchestrator.searchInRepository(
      'user service implementation',
      testUserId,
      testRepoId,
      {
        topK: 5,
        threshold: 0.3,
        semanticRoles: ['service', 'controller']
      }
    );
    
    if (repoSearchResults.matches.length === 0) {
      throw new Error('Repository search should return results');
    }
    
    this.logger.success(`Repository search found ${repoSearchResults.matches.length} relevant documents`);
    
    // Test filtering by file type
    const jsResults = await searchOrchestrator.searchInRepository(
      'express router',
      testUserId,
      testRepoId,
      {
        fileTypes: ['javascript'],
        topK: 3
      }
    );
    
    this.logger.success(`JavaScript-specific search found ${jsResults.matches.length} documents`);
    
    // Cleanup test namespace
    await storageManager.deleteNamespaceDocuments(testUserId);
    this.logger.success('End-to-end workflow test completed');
  }

  async cleanup() {
    this.logger.info('Cleaning up test data...');
    
    try {
      if (this.cleanupIds.length > 0) {
        const service = new PineconeService();
        await service.connect();
        
        // Delete test vectors
        await service.deleteVectors(this.cleanupIds, this.testNamespace);
        this.logger.success(`Deleted ${this.cleanupIds.length} test vectors`);
        
        // Delete test namespace if it exists
        try {
          await service.deleteNamespace(this.testNamespace);
          this.logger.success(`Deleted test namespace: ${this.testNamespace}`);
        } catch (error) {
          this.logger.warn(`Could not delete namespace (it may be empty): ${error.message}`);
        }
        
        await service.disconnect();
      }
    } catch (error) {
      this.logger.warn(`Cleanup failed: ${error.message}`);
    }
    
    this.logger.info('Cleanup completed');
  }
}

// Configuration validation
function validateEnvironment() {
  const required = ['PINECONE_API_KEY', 'PINECONE_INDEX_NAME', 'OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please ensure your .env file contains all required variables.');
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

// Run tests
async function main() {
  console.log('🚀 Modern Pinecone Integration Test Suite');
  console.log('=========================================');
  
  try {
    validateEnvironment();
    
    const test = new PineconeIntegrationTest();
    await test.runAllTests();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('The new Pinecone implementation is working correctly.');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = PineconeIntegrationTest;