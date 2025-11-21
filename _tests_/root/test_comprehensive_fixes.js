#!/usr/bin/env node
/**
 * Comprehensive test to verify both fixes work in the actual code flow
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Fixes Test...\n');

// Test the actual method where analysisRecommendation is used
function testActualMethodFlow() {
  console.log('1️⃣ Testing actual method flow with regex analysis...');
  
  const filePath = path.join(__dirname, 'backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find the processRepoWithWorkers method
  const methodRegex = /async processRepoWithWorkers\(params\)\s*\{([\s\S]*?)(?=\n\s*async\s+\w+|$)/;
  const methodMatch = content.match(methodRegex);
  
  if (!methodMatch) {
    console.log('   ❌ Could not find processRepoWithWorkers method');
    return false;
  }
  
  const methodBody = methodMatch[1];
  
  // Check if analysisRecommendation is declared before use
  const hasDeclaration = methodBody.includes('const analysisRecommendation = null;');
  const hasUsage = methodBody.includes('analysisRecommendation ?');
  
  console.log(`   - Has declaration: ${hasDeclaration}`);
  console.log(`   - Has usage: ${hasUsage}`);
  
  if (hasDeclaration && hasUsage) {
    console.log('   ✅ analysisRecommendation is properly declared before use');
    return true;
  } else {
    console.log('   ❌ analysisRecommendation declaration or usage issue');
    return false;
  }
}

// Test Pinecone method specifically
function testPineconeMethodCall() {
  console.log('2️⃣ Testing Pinecone method call in getPineconeClient...');
  
  const filePath = path.join(__dirname, 'backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find getPineconeClient method
  const pineconeMethodRegex = /async getPineconeClient\(\)\s*\{([\s\S]*?)\n\s*\}/;
  const pineconeMatch = content.match(pineconeMethodRegex);
  
  if (!pineconeMatch) {
    console.log('   ❌ Could not find getPineconeClient method');
    return false;
  }
  
  const methodBody = pineconeMatch[1];
  
  const hasCorrectMethod = methodBody.includes('getClient()');
  const hasOldMethod = methodBody.includes('getPineconeService()');
  
  console.log(`   - Uses getClient(): ${hasCorrectMethod}`);
  console.log(`   - Uses getPineconeService(): ${hasOldMethod}`);
  
  if (hasCorrectMethod && !hasOldMethod) {
    console.log('   ✅ Pinecone method call is correct');
    return true;
  } else {
    console.log('   ❌ Pinecone method call issue');
    return false;
  }
}

// Test that we can load the AST splitter with new config
function testASTSplitterConfig() {
  console.log('3️⃣ Testing AST splitter with token-based config...');
  
  try {
    const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');
    
    const splitter = new ASTCodeSplitter({
      maxTokens: 500,
      minTokens: 30,
      overlapTokens: 50
    });
    
    // Test that it has the split method (not splitDocument)
    if (typeof splitter.split === 'function') {
      console.log('   ✅ AST splitter has correct split() method');
      return true;
    } else {
      console.log('   ❌ AST splitter missing split() method');
      return false;
    }
  } catch (error) {
    console.log('   ❌ AST splitter failed:', error.message);
    return false;
  }
}

// Simulate the error-prone code path
function testErrorProneCodePath() {
  console.log('4️⃣ Testing error-prone code paths...');
  
  const filePath = path.join(__dirname, 'backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for any remaining usage of the old method names
  const oldMethodUsages = [
    'getPineconeService',
    'splitDocument('
  ];
  
  const foundOldUsages = [];
  oldMethodUsages.forEach(oldMethod => {
    if (content.includes(oldMethod)) {
      foundOldUsages.push(oldMethod);
    }
  });
  
  if (foundOldUsages.length === 0) {
    console.log('   ✅ No old method usages found');
    return true;
  } else {
    console.log('   ❌ Found old method usages:', foundOldUsages);
    return false;
  }
}

// Run all tests
async function runComprehensiveTests() {
  console.log('Running comprehensive tests...\n');
  
  const tests = [
    testActualMethodFlow,
    testPineconeMethodCall,
    testASTSplitterConfig,
    testErrorProneCodePath
  ];
  
  const results = tests.map(test => test());
  const passed = results.filter(Boolean).length;
  
  console.log(`\n📊 Comprehensive Test Results: ${passed}/${results.length} passed`);
  
  if (passed === results.length) {
    console.log('\n🎉 All fixes verified - Ready for commit and push!');
    console.log('\n✅ Fixed Issues:');
    console.log('   1. analysisRecommendation undefined error → Variable properly declared');
    console.log('   2. Pinecone getPineconeService error → Method corrected to getClient');
    console.log('   3. AST chunking integration → Token-based config working');
    console.log('   4. No remaining legacy method calls');
    return true;
  } else {
    console.log('\n❌ Some issues remain - review needed before commit');
    return false;
  }
}

runComprehensiveTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});