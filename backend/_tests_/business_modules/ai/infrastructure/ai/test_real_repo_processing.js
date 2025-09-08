// test_real_repo_processing.js
"use strict";

const path = require('path');
const fs = require('fs');
const DataPreparationPipeline = require('./rag_pipelines/data_preparation/DataPreparationPipeline');
const SemanticPreprocessor = require('./rag_pipelines/data_preparation/processors/SemanticPreprocessor');

/**
 * Test semantic preprocessing on real repository files
 */
async function testRealRepoProcessing() {
  console.log('🔬 Testing Semantic Preprocessing on Real Repository Files\n');
  
  const preprocessor = new SemanticPreprocessor();
  
  // Get some real files from your repository
  const testFiles = [
    '/home/myzader/eventstorm/backend/server.js',
    '/home/myzader/eventstorm/backend/business_modules/ai/application/services/aiService.js',
    '/home/myzader/eventstorm/backend/business_modules/chat/input/chatController.js',
    '/home/myzader/eventstorm/backend/business_modules/ai/infrastructure/ai/aiLangchainAdapter.js',
    '/home/myzader/eventstorm/backend/aop_modules/auth/index.js',
    '/home/myzader/eventstorm/backend/_tests_/business_modules/ai/aiService.test.js',
    '/home/myzader/eventstorm/backend/fastify.config.js'
  ];
  
  console.log(`Testing semantic preprocessing on ${testFiles.length} real files...\n`);
  
  for (const filePath of testFiles) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}\n`);
        continue;
      }
      
      // Read file content
      const content = await fs.promises.readFile(filePath, 'utf8');
      
      // Create a mock document
      const mockDocument = {
        pageContent: content,
        metadata: {
          source: filePath.replace('/home/myzader/eventstorm/', ''),
          userId: 'test-user',
          repoId: 'test-repo'
        }
      };
      
      // Apply semantic preprocessing
      const enhancedDoc = await preprocessor.preprocessChunk(mockDocument);
      
      // Display results
      console.log(`📄 File: ${mockDocument.metadata.source}`);
      console.log(`${'─'.repeat(60)}`);
      console.log(`🧠 Enhanced Metadata:`);
      console.log(`  • Semantic Role: ${enhancedDoc.metadata.semantic_role}`);
      console.log(`  • Architectural Layer: ${enhancedDoc.metadata.layer}`);
      console.log(`  • EventStorm Module: ${enhancedDoc.metadata.eventstorm_module}`);
      console.log(`  • Is Entry Point: ${enhancedDoc.metadata.is_entrypoint}`);
      console.log(`  • Complexity: ${enhancedDoc.metadata.complexity}`);
      console.log(`  • Enhanced: ${enhancedDoc.metadata.enhanced}`);
      
      // Show enhanced content preview (first 200 chars)
      const contentPreview = enhancedDoc.pageContent.substring(0, 300).replace(/\n/g, '\n');
      console.log(`\n📝 Enhanced Content Preview:`);
      console.log(contentPreview);
      if (enhancedDoc.pageContent.length > 300) {
        console.log('...');
      }
      
      console.log(`\n${'═'.repeat(60)}\n`);
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
}

/**
 * Test search strategy determination
 */
function testSearchStrategies() {
  console.log('🎯 Testing Search Strategy Determination\n');
  
  // We'll create a mock of the search strategy method
  const testQueries = [
    "How do I create a new user entity?",
    "What API endpoints are available for chat?",
    "I'm getting an error in the authentication module",
    "How does the git integration work?",
    "Show me the AI embedding pipeline",
    "How do I write tests for the chat service?",
    "What are the configuration options?",
    "How do fastify plugins work here?"
  ];
  
  // Mock the determineSearchStrategy method logic
  function mockDetermineSearchStrategy(prompt) {
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('entity') || promptLower.includes('domain')) {
      return {
        type: 'Domain/Business Logic Query',
        userResults: 8,
        coreResults: 3,
        userFilters: { layer: 'domain' },
        coreFilters: { type: 'module_documentation' }
      };
    }
    
    if (promptLower.includes('api') || promptLower.includes('endpoint')) {
      return {
        type: 'API/Endpoint Query',
        userResults: 6,
        coreResults: 5,
        userFilters: { semantic_role: 'controller' },
        coreFilters: { type: 'api_endpoint' }
      };
    }
    
    if (promptLower.includes('error') || promptLower.includes('getting')) {
      return {
        type: 'Error/Debugging Query',
        userResults: 10,
        coreResults: 2,
        userFilters: { is_entrypoint: true },
        coreFilters: {}
      };
    }
    
    if (promptLower.includes('git')) {
      return {
        type: 'Git Module Query',
        userResults: 8,
        coreResults: 3,
        userFilters: { eventstorm_module: 'gitModule' },
        coreFilters: { type: 'module_documentation' }
      };
    }
    
    if (promptLower.includes('ai') || promptLower.includes('embedding')) {
      return {
        type: 'AI Module Query',
        userResults: 8,
        coreResults: 3,
        userFilters: { eventstorm_module: 'aiModule' },
        coreFilters: { type: 'module_documentation' }
      };
    }
    
    if (promptLower.includes('test')) {
      return {
        type: 'Testing Query',
        userResults: 8,
        coreResults: 2,
        userFilters: { semantic_role: 'test' },
        coreFilters: {}
      };
    }
    
    if (promptLower.includes('config')) {
      return {
        type: 'Configuration Query',
        userResults: 6,
        coreResults: 4,
        userFilters: { semantic_role: 'config' },
        coreFilters: { type: 'configuration' }
      };
    }
    
    if (promptLower.includes('plugin') || promptLower.includes('fastify')) {
      return {
        type: 'Plugin/Middleware Query',
        userResults: 8,
        coreResults: 3,
        userFilters: { semantic_role: 'plugin' },
        coreFilters: {}
      };
    }
    
    return {
      type: 'General Query (default)',
      userResults: 8,
      coreResults: 4,
      userFilters: {},
      coreFilters: {}
    };
  }
  
  testQueries.forEach((query, index) => {
    const strategy = mockDetermineSearchStrategy(query);
    console.log(`${index + 1}. Query: "${query}"`);
    console.log(`   Strategy: ${strategy.type}`);
    console.log(`   User Results: ${strategy.userResults}, Core Results: ${strategy.coreResults}`);
    console.log(`   User Filters: ${JSON.stringify(strategy.userFilters)}`);
    console.log(`   Core Filters: ${JSON.stringify(strategy.coreFilters)}`);
    console.log('');
  });
}

// Run the tests
async function runAllTests() {
  try {
    await testRealRepoProcessing();
    testSearchStrategies();
    console.log('✅ All semantic preprocessing tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testRealRepoProcessing, testSearchStrategies };
