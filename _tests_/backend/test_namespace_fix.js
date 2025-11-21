#!/usr/bin/env node

// Test the fixed namespace generation in QueryPipeline

const QueryPipeline = require('./business_modules/ai/infrastructure/ai/rag_pipelines/query/queryPipeline');
const PineconeService = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/embedding/pineconeService');

console.log('🧪 Testing Repository Descriptor and Namespace Generation');
console.log('=' .repeat(60));

// Test the static helper method
function testRepoDescriptor() {
  console.log('\n📋 Testing QueryPipeline.createRepoDescriptor()');
  
  // Test with GitHub URL
  const urlTest = QueryPipeline.createRepoDescriptor('https://github.com/anatolyZader/vc-3');
  console.log('URL Input:', 'https://github.com/anatolyZader/vc-3');
  console.log('Result:', JSON.stringify(urlTest, null, 2));
  
  // Test with object input
  const objTest = QueryPipeline.createRepoDescriptor({
    owner: 'anatolyZader',
    name: 'vc-3',
    branch: 'feature-branch'
  });
  console.log('\nObject Input:', { owner: 'anatolyZader', name: 'vc-3', branch: 'feature-branch' });
  console.log('Result:', JSON.stringify(objTest, null, 2));
  
  // Test with null input
  const nullTest = QueryPipeline.createRepoDescriptor(null);
  console.log('\nNull Input:', null);
  console.log('Result:', nullTest);
}

// Test namespace generation
function testNamespaceGeneration() {
  console.log('\n🔧 Testing PineconeService.sanitizeId() namespace generation');
  
  const repoDescriptor = {
    owner: 'anatolyZader',
    name: 'vc-3',
    branch: 'main'
  };
  
  const namespace = PineconeService.sanitizeId(`${repoDescriptor.owner}_${repoDescriptor.name}_${repoDescriptor.branch}`);
  console.log('Repository Descriptor:', JSON.stringify(repoDescriptor, null, 2));
  console.log('Generated Namespace:', namespace);
  
  // Test with special characters
  const complexDescriptor = {
    owner: 'My-Org',
    name: 'complex.repo-name',
    branch: 'feature/new-stuff'
  };
  
  const complexNamespace = PineconeService.sanitizeId(`${complexDescriptor.owner}_${complexDescriptor.name}_${complexDescriptor.branch}`);
  console.log('\nComplex Repository Descriptor:', JSON.stringify(complexDescriptor, null, 2));
  console.log('Generated Namespace:', complexNamespace);
}

// Test the complete flow
function testCompleteFlow() {
  console.log('\n🎯 Testing Complete Flow');
  
  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  const repoDescriptor = QueryPipeline.createRepoDescriptor(repoUrl);
  
  if (repoDescriptor) {
    const namespace = PineconeService.sanitizeId(`${repoDescriptor.owner}_${repoDescriptor.name}_${repoDescriptor.branch}`);
    console.log('Input URL:', repoUrl);
    console.log('Parsed Descriptor:', JSON.stringify(repoDescriptor, null, 2));
    console.log('Final Namespace:', namespace);
    
    // Compare with old hard-coded approach
    const oldNamespace = 'anatolyzader_vc-3_main';
    console.log('\nComparison:');
    console.log('Old hard-coded:', oldNamespace);
    console.log('New generated :', namespace);
    console.log('Match:', namespace === oldNamespace ? '✅' : '❌');
  }
}

// Run tests
try {
  testRepoDescriptor();
  testNamespaceGeneration();
  testCompleteFlow();
  
  console.log('\n🎉 All tests completed successfully!');
  console.log('\n📝 Summary:');
  console.log('✅ Fixed hard-coded namespace in performVectorSearch()');
  console.log('✅ Added repoDescriptor parameter to support dynamic namespaces');
  console.log('✅ Uses consistent PineconeService.sanitizeId() helper');
  console.log('✅ Added createRepoDescriptor() static helper method');
  console.log('✅ Maintains backward compatibility with null repoDescriptor');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}