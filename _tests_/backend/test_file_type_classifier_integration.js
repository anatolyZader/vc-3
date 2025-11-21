/**
 * Test FileTypeClassifier Integration in RepoProcessor
 * Verifies that the type field is correctly set during document processing
 */

const FileTypeClassifier = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/utils/fileTypeClassifier');

console.log('\n🧪 Testing FileTypeClassifier Integration\n');
console.log('='.repeat(80));

// Test cases covering different file types
const testCases = [
  {
    filePath: 'backend/business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline.js',
    content: 'class QueryPipeline { constructor() {} }',
    expectedType: 'github-code',
    description: 'JavaScript code file'
  },
  {
    filePath: 'README.md',
    content: '# Project Documentation\n\nThis is a readme file.',
    expectedType: 'github-docs',
    description: 'Documentation file'
  },
  {
    filePath: 'backend/tests/queryPipeline.test.js',
    content: 'describe("QueryPipeline", () => { it("should work", () => {}) });',
    expectedType: 'github-test',
    description: 'Test file'
  },
  {
    filePath: 'package.json',
    content: '{ "name": "eventstorm", "version": "1.0.0" }',
    expectedType: 'github-config',
    description: 'Configuration file'
  },
  {
    filePath: 'backend/business_modules/ai/catalog.json',
    content: '{ "$schema": "...", "entities": [] }',
    expectedType: 'github-catalog',
    description: 'Catalog file'
  },
  {
    filePath: 'backend/business_modules/ai/aiController.js',
    content: 'class AIController { async handleRequest() {} }',
    expectedType: 'github-code',
    description: 'Controller code file'
  },
  {
    filePath: 'docs/architecture/ARCHITECTURE.md',
    content: '# System Architecture\n\nOverview of the system.',
    expectedType: 'github-docs',
    description: 'Architecture documentation'
  }
];

console.log('\n📋 Running test cases:\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = FileTypeClassifier.determineGitHubFileType(testCase.filePath, testCase.content);
  const success = result === testCase.expectedType;
  
  if (success) {
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    console.log(`   File: ${testCase.filePath}`);
    console.log(`   Expected: ${testCase.expectedType}, Got: ${result}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   File: ${testCase.filePath}`);
    console.log(`   Expected: ${testCase.expectedType}, Got: ${result}`);
    failed++;
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
  console.log('✅ All tests passed! FileTypeClassifier is working correctly.\n');
  console.log('📝 Next steps:');
  console.log('   1. Commit the changes to repoProcessor.js');
  console.log('   2. Deploy the updated code');
  console.log('   3. Re-push your repository to trigger re-indexing with correct types');
  console.log('   4. Run debug_pinecone_index.js to verify type field is now set correctly\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review FileTypeClassifier implementation.\n');
  process.exit(1);
}
