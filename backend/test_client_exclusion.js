#!/usr/bin/env node

/**
 * Test Client Code Exclusion
 * 
 * Tests both data preparation and query pipeline client filtering
 */

const FileFilteringUtils = require('./business_modules/ai/infrastructure/ai/rag_pipelines/data_preparation/utils/FileFilteringUtils');
const VectorSearchOrchestrator = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/vectorSearchOrchestrator');

async function testClientExclusion() {
  console.log('🧪 TESTING CLIENT CODE EXCLUSION');
  console.log('================================');
  
  // Test 1: Data Preparation Pipeline - File Filtering
  console.log('\n📂 TEST 1: Data Preparation Pipeline File Filtering');
  console.log('---------------------------------------------------');
  
  const testFiles = [
    'client/index.html',
    'backend/errorPlugin.js',
    'frontend/main.jsx',
    'backend/business_modules/ai/app.js',
    'public/assets/style.css',
    'backend/server.js',
    'web/components/Button.vue',
    'static/images/logo.png',
    'backend/package.json'
  ];
  
  testFiles.forEach(filePath => {
    const shouldIndex = FileFilteringUtils.shouldIndexFile(filePath);
    const status = shouldIndex ? '✅ INCLUDE' : '❌ EXCLUDE';
    console.log(`${status}: ${filePath}`);
  });
  
  // Test 2: Enhanced Ignore Patterns
  console.log('\n🔧 TEST 2: Enhanced Ignore Patterns');
  console.log('----------------------------------');
  
  const ignorePatterns = FileFilteringUtils.getEnhancedIgnorePatterns();
  const clientPatterns = ignorePatterns.filter(pattern => 
    pattern.includes('client') || 
    pattern.includes('frontend') || 
    pattern.includes('*.html') || 
    pattern.includes('*.css')
  );
  
  console.log('Client exclusion patterns found:');
  clientPatterns.forEach(pattern => {
    console.log(`  🚫 ${pattern}`);
  });
  
  // Test 3: Query Pipeline - Post-Retrieval Filtering
  console.log('\n🔍 TEST 3: Query Pipeline Post-Retrieval Filtering');
  console.log('------------------------------------------------');
  
  // Mock documents that would come from vector store
  const mockDocuments = [
    {
      pageContent: '<!doctype html><html>...',
      metadata: { source: 'client/index.html', fileType: 'HTML' }
    },
    {
      pageContent: 'fastify.setErrorHandler((err, req, reply) => {',
      metadata: { source: 'backend/errorPlugin.js', fileType: 'JavaScript' }
    },
    {
      pageContent: 'body { font-family: sans-serif; }',
      metadata: { source: 'frontend/styles/main.css', fileType: 'CSS' }
    },
    {
      pageContent: 'module.exports = async function(fastify, opts) {',
      metadata: { source: 'backend/business_modules/ai/index.js', fileType: 'JavaScript' }
    }
  ];
  
  // Create a mock orchestrator instance to test filtering
  const mockOrchestrator = new VectorSearchOrchestrator(null, null, null);
  const filteredDocuments = mockOrchestrator.filterClientCode(mockDocuments);
  
  console.log(`Original documents: ${mockDocuments.length}`);
  console.log(`After client filtering: ${filteredDocuments.length}`);
  console.log('');
  
  console.log('FILTERING RESULTS:');
  mockDocuments.forEach((doc, index) => {
    const wasFiltered = !filteredDocuments.includes(doc);
    const status = wasFiltered ? '❌ FILTERED' : '✅ KEPT';
    console.log(`${status}: ${doc.metadata.source}`);
  });
  
  // Test 4: Verification Summary
  console.log('\n📊 VERIFICATION SUMMARY');
  console.log('======================');
  
  const dataPrep_clientFiltered = !FileFilteringUtils.shouldIndexFile('client/index.html');
  const dataPrep_backendKept = FileFilteringUtils.shouldIndexFile('backend/errorPlugin.js');
  const query_clientFiltered = !filteredDocuments.some(doc => doc.metadata.source === 'client/index.html');
  const query_backendKept = filteredDocuments.some(doc => doc.metadata.source.includes('backend/'));
  
  console.log(`✅ Data Prep filters client/index.html: ${dataPrep_clientFiltered}`);
  console.log(`✅ Data Prep keeps backend files: ${dataPrep_backendKept}`);  
  console.log(`✅ Query pipeline filters client code: ${query_clientFiltered}`);
  console.log(`✅ Query pipeline keeps backend code: ${query_backendKept}`);
  
  const allTestsPassed = dataPrep_clientFiltered && dataPrep_backendKept && query_clientFiltered && query_backendKept;
  
  console.log('');
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Client code exclusion is working correctly.');
    console.log('📈 Next RAG query should not contain client/index.html chunks.');
  } else {
    console.log('❌ Some tests failed. Check implementation.');
  }
}

// Run the test
testClientExclusion().catch(console.error);
