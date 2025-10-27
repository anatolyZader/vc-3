/**
 * Test FileTypeClassifier functionality
 */

const FileTypeClassifier = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/utils/fileTypeClassifier');

console.log('\n🧪 Testing FileTypeClassifier\n');

const testCases = [
  // Code files
  { path: 'src/app.js', expected: 'github-code' },
  { path: 'backend/services/user.ts', expected: 'github-code' },
  { path: 'lib/utils.py', expected: 'github-code' },
  { path: 'backend/business_modules/ai/infrastructure/ai/aiLangchainAdapter.js', expected: 'github-code' },
  
  // Documentation files
  { path: 'README.md', expected: 'github-docs' },
  { path: 'docs/api.md', expected: 'github-docs' },
  { path: 'CHANGELOG.md', expected: 'github-docs' },
  { path: 'LICENSE', expected: 'github-docs' },
  
  // Test files
  { path: 'src/app.test.js', expected: 'github-test' },
  { path: 'tests/integration.spec.ts', expected: 'github-test' },
  { path: 'test/unit/helper.js', expected: 'github-test' },
  { path: 'test_server.js', expected: 'github-test' },
  
  // Configuration files
  { path: 'package.json', expected: 'github-config' },
  { path: '.env', expected: 'github-config' },
  { path: 'tsconfig.json', expected: 'github-config' },
  { path: 'webpack.config.js', expected: 'github-config' },
  { path: 'config/database.js', expected: 'github-config' },
  
  // Catalog files
  { path: 'catalog.json', expected: 'github-catalog' },
  { path: 'architecture.json', expected: 'github-catalog' },
  { path: 'ul_dictionary.json', expected: 'github-catalog' },
  { path: 'schema.json', expected: 'github-catalog' }
];

let passed = 0;
let failed = 0;

testCases.forEach(({ path, expected }) => {
  const result = FileTypeClassifier.determineGitHubFileType(path);
  const status = result === expected ? '✅' : '❌';
  
  if (result === expected) {
    passed++;
  } else {
    failed++;
    console.log(`${status} ${path}`);
    console.log(`   Expected: ${expected}, Got: ${result}\n`);
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);

if (failed === 0) {
  console.log('🎉 All tests passed!\n');
  
  // Show examples of descriptions
  console.log('📝 File Type Descriptions:');
  console.log(`  github-code    → ${FileTypeClassifier.getFileTypeDescription('github-code')}`);
  console.log(`  github-docs    → ${FileTypeClassifier.getFileTypeDescription('github-docs')}`);
  console.log(`  github-test    → ${FileTypeClassifier.getFileTypeDescription('github-test')}`);
  console.log(`  github-config  → ${FileTypeClassifier.getFileTypeDescription('github-config')}`);
  console.log(`  github-catalog → ${FileTypeClassifier.getFileTypeDescription('github-catalog')}`);
  
  console.log('\n🎯 Priority Order (higher = more important):');
  console.log(`  github-code:    ${FileTypeClassifier.getFileTypePriority('github-code')}`);
  console.log(`  github-docs:    ${FileTypeClassifier.getFileTypePriority('github-docs')}`);
  console.log(`  github-test:    ${FileTypeClassifier.getFileTypePriority('github-test')}`);
  console.log(`  github-config:  ${FileTypeClassifier.getFileTypePriority('github-config')}`);
  console.log(`  github-catalog: ${FileTypeClassifier.getFileTypePriority('github-catalog')}`);
  
  console.log('\n🔍 Default Search Inclusion:');
  console.log(`  github-code:    ${FileTypeClassifier.shouldIncludeInDefaultSearch('github-code') ? '✅ Included' : '❌ Excluded'}`);
  console.log(`  github-docs:    ${FileTypeClassifier.shouldIncludeInDefaultSearch('github-docs') ? '✅ Included' : '❌ Excluded'}`);
  console.log(`  github-test:    ${FileTypeClassifier.shouldIncludeInDefaultSearch('github-test') ? '✅ Included' : '❌ Excluded'}`);
  console.log(`  github-config:  ${FileTypeClassifier.shouldIncludeInDefaultSearch('github-config') ? '✅ Included' : '❌ Excluded'}`);
  console.log(`  github-catalog: ${FileTypeClassifier.shouldIncludeInDefaultSearch('github-catalog') ? '✅ Included' : '❌ Excluded'}`);
  
  console.log('\n✨ FileTypeClassifier is working correctly!\n');
  process.exit(0);
} else {
  console.error('❌ Some tests failed. Please review the classifier logic.\n');
  process.exit(1);
}
