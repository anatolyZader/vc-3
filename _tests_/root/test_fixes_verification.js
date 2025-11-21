#!/usr/bin/env node
/**
 * Test script to verify both fixes:
 * 1. analysisRecommendation variable scope fix
 * 2. Pinecone method name fix (getPineconeService -> getClient)
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Fixes Verification...\n');

// Test 1: Check if analysisRecommendation is properly declared
function testAnalysisRecommendationFix() {
  console.log('1️⃣ Testing analysisRecommendation variable declaration...');
  
  const filePath = path.join(__dirname, 'backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if analysisRecommendation is declared in processRepoWithWorkers
  const processRepoMatch = content.match(/async processRepoWithWorkers\(params\)\s*\{[^}]*?const analysisRecommendation = null;/s);
  
  if (processRepoMatch) {
    console.log('   ✅ analysisRecommendation is properly declared as const in processRepoWithWorkers');
    return true;
  } else {
    console.log('   ❌ analysisRecommendation declaration not found in processRepoWithWorkers');
    return false;
  }
}

// Test 2: Check if Pinecone method call is correct
function testPineconeMethodFix() {
  console.log('2️⃣ Testing Pinecone method name fix...');
  
  const filePath = path.join(__dirname, 'backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for old method name (should not exist)
  const oldMethodExists = content.includes('getPineconeService');
  
  // Check for new method name (should exist)
  const newMethodExists = content.includes('getClient()');
  
  if (!oldMethodExists && newMethodExists) {
    console.log('   ✅ Pinecone method updated from getPineconeService to getClient');
    return true;
  } else {
    console.log('   ❌ Pinecone method fix not applied correctly');
    console.log(`   - Old method still exists: ${oldMethodExists}`);
    console.log(`   - New method exists: ${newMethodExists}`);
    return false;
  }
}

// Test 3: Verify AST splitter still works properly (syntax check)
function testASTSplitterIntegration() {
  console.log('3️⃣ Testing AST splitter integration...');
  
  try {
    const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');
    const splitter = new ASTCodeSplitter({
      maxTokens: 500,
      minTokens: 30,
      overlapTokens: 50
    });
    
    console.log('   ✅ ASTCodeSplitter loads successfully with token-based config');
    return true;
  } catch (error) {
    console.log('   ❌ ASTCodeSplitter failed to load:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = [];
  
  results.push(testAnalysisRecommendationFix());
  results.push(testPineconeMethodFix());
  results.push(testASTSplitterIntegration());
  
  console.log('\n📊 Test Results:');
  const passedTests = results.filter(Boolean).length;
  const totalTests = results.length;
  
  console.log(`   ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All fixes verified successfully!');
    console.log('\n✅ Ready to commit and push:');
    console.log('   - analysisRecommendation undefined error fixed');
    console.log('   - Pinecone method call corrected');
    console.log('   - AST chunking integration intact');
    return true;
  } else {
    console.log('❌ Some fixes need attention before commit/push');
    return false;
  }
}

// Execute tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});