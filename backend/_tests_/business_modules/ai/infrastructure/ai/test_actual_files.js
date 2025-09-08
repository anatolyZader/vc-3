// test_actual_files.js
"use strict";

const path = require('path');
const fs = require('fs');
const SemanticPreprocessor = require('./rag_pipelines/data_preparation/processors/SemanticPreprocessor');

/**
 * Test semantic preprocessing on actual files found in the repository
 */
async function testActualFiles() {
  console.log('🔬 Testing Semantic Preprocessing on Actual Repository Files\n');
  
  const preprocessor = new SemanticPreprocessor();
  
  // Test with actual files we found
  const actualFiles = [
    '/home/myzader/eventstorm/backend/server.js',
    '/home/myzader/eventstorm/backend/app.js',
    '/home/myzader/eventstorm/backend/envPlugin.js',
    '/home/myzader/eventstorm/backend/pubsubSubscriber.js',
    '/home/myzader/eventstorm/backend/loggerConfig.js',
    '/home/myzader/eventstorm/backend/_tests_/business_modules/api/application/services/apiService.test.js',
    '/home/myzader/eventstorm/backend/business_modules/ai/application/services/aiService.js'
  ];
  
  let processedCount = 0;
  let skippedCount = 0;
  
  for (const filePath of actualFiles) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipped (not found): ${filePath.replace('/home/myzader/eventstorm/', '')}\n`);
        skippedCount++;
        continue;
      }
      
      // Read file content (limit to first 2000 chars for testing)
      const fullContent = await fs.promises.readFile(filePath, 'utf8');
      const content = fullContent.substring(0, 2000);
      
      // Create a mock document
      const mockDocument = {
        pageContent: content,
        metadata: {
          source: filePath.replace('/home/myzader/eventstorm/', ''),
          userId: 'test-user',
          repoId: 'eventstorm-repo'
        }
      };
      
      // Apply semantic preprocessing
      const enhancedDoc = await preprocessor.preprocessChunk(mockDocument);
      
      // Display results
      console.log(`📄 File: ${mockDocument.metadata.source}`);
      console.log(`📏 Size: ${fullContent.length} chars (testing with ${content.length} chars)`);
      console.log(`${'─'.repeat(80)}`);
      
      console.log(`🧠 Semantic Analysis:`);
      console.log(`  🎯 Role: ${enhancedDoc.metadata.semantic_role}`);
      console.log(`  🏗️  Layer: ${enhancedDoc.metadata.layer}`);
      console.log(`  🔧 Module: ${enhancedDoc.metadata.eventstorm_module}`);
      console.log(`  🚪 Entry Point: ${enhancedDoc.metadata.is_entrypoint}`);
      console.log(`  📊 Complexity: ${enhancedDoc.metadata.complexity}`);
      
      // Show the semantic annotation (first few lines)
      const lines = enhancedDoc.pageContent.split('\n');
      const annotationLines = lines.slice(0, 6); // First 6 lines contain our annotations
      console.log(`\n📋 Semantic Annotations:`);
      annotationLines.forEach(line => {
        if (line.startsWith('//')) {
          console.log(`   ${line}`);
        }
      });
      
      // Show original content preview
      const originalLines = fullContent.split('\n').slice(0, 5);
      console.log(`\n📄 Original Content Preview:`);
      originalLines.forEach((line, idx) => {
        if (idx < 3) { // Show first 3 lines
          console.log(`   ${idx + 1}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
        }
      });
      
      processedCount++;
      console.log(`\n${'═'.repeat(80)}\n`);
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      skippedCount++;
    }
  }
  
  console.log(`\n📊 Test Summary:`);
  console.log(`✅ Successfully processed: ${processedCount} files`);
  console.log(`⚠️  Skipped: ${skippedCount} files`);
  console.log(`🎯 Total attempted: ${actualFiles.length} files\n`);
}

// Test different query patterns
function testQueryPatterns() {
  console.log('🎯 Testing Query Pattern Recognition\n');
  
  const testQueries = [
    {query: "How does the chat websocket work?", expected: "chatModule"},
    {query: "Show me the user authentication controller", expected: "controller + aop"},
    {query: "What's wrong with the API endpoints?", expected: "error/debugging"},
    {query: "How do I create a domain entity?", expected: "domain"},
    {query: "Show me the AI embedding configuration", expected: "aiModule + config"},
    {query: "How do I write integration tests?", expected: "test"},
    {query: "What Fastify plugins are available?", expected: "plugin"},
    {query: "How does git webhook processing work?", expected: "gitModule"}
  ];
  
  testQueries.forEach((test, index) => {
    console.log(`${index + 1}. "${test.query}"`);
    console.log(`   Expected focus: ${test.expected}`);
    
    // Analyze query characteristics
    const query = test.query.toLowerCase();
    const characteristics = [];
    
    if (query.includes('chat') || query.includes('websocket')) characteristics.push('💬 chatModule');
    if (query.includes('auth') || query.includes('login')) characteristics.push('🔐 auth/aop');
    if (query.includes('api') || query.includes('endpoint')) characteristics.push('🌐 controller');
    if (query.includes('error') || query.includes('wrong')) characteristics.push('🐛 debugging');
    if (query.includes('domain') || query.includes('entity')) characteristics.push('🏢 domain');
    if (query.includes('ai') || query.includes('embedding')) characteristics.push('🤖 aiModule');
    if (query.includes('config')) characteristics.push('⚙️  config');
    if (query.includes('test')) characteristics.push('🧪 test');
    if (query.includes('plugin')) characteristics.push('🔌 plugin');
    if (query.includes('git') || query.includes('webhook')) characteristics.push('📁 gitModule');
    
    console.log(`   Detected: ${characteristics.join(', ')}`);
    console.log('');
  });
}

// Run the tests
async function runTests() {
  try {
    await testActualFiles();
    testQueryPatterns();
    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { testActualFiles, testQueryPatterns };
