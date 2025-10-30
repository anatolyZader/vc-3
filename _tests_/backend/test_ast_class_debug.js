// test_ast_class_debug.js
// Debug AST processing of class-based file

const path = require('path');
const fs = require('fs');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function debugASTClassProcessing() {
  console.log('========================================');
  console.log('🔍 DEBUG: AST CLASS PROCESSING');
  console.log('========================================');

  // Create a minimal test class file to isolate the issue
  const testClassCode = `// Test class file
"use strict";

const BaseClass = require('./base');

class TestClass extends BaseClass {
  constructor(options = {}) {
    super();
    this.options = options;
  }

  async method1() {
    console.log('Method 1');
    return 'result1';
  }

  method2() {
    console.log('Method 2');
    return 'result2';
  }
}

module.exports = TestClass;`;

  console.log(`\n📄 Test class code: ${testClassCode.length} characters`);

  // Test with basic configuration
  const config = {
    maxTokens: 500,
    minTokens: 30,
    overlap: 50
  };

  console.log('\n🔧 Testing with basic configuration...');
  const splitter = new ASTCodeSplitter(config);
  
  try {
    const chunks = await splitter.splitDocument({
      pageContent: testClassCode,
      metadata: { source: 'test.js' }
    });
    
    console.log(`✅ Test class splitting: ${chunks.length} chunks`);
    
    chunks.forEach((chunk, index) => {
      const tokens = chunk.tokenCount || chunk.tokens || 0;
      const content = chunk.content || chunk.pageContent || '';
      console.log(`   ${index + 1}: ${tokens} tokens, ${content.length} chars`);
      console.log(`       Type: ${chunk.metadata?.semantic_unit || 'unknown'}`);
      console.log(`       Name: ${chunk.metadata?.function_name || 'unknown'}`);
      console.log(`       Preview: ${content.substring(0, 50).replace(/\n/g, ' ')}...`);
    });

  } catch (error) {
    console.error('❌ Test class splitting failed:', error.message);
    console.error('Stack:', error.stack);
  }

  // Now test the actual AI adapter file
  console.log('\n🔧 Testing actual AI adapter file...');
  const filePath = path.join(__dirname, 'business_modules/ai/infrastructure/ai/aiLangchainAdapter.js');
  const aiAdapterCode = fs.readFileSync(filePath, 'utf-8');
  
  try {
    const chunks = await splitter.splitDocument({
      pageContent: aiAdapterCode,
      metadata: { source: 'aiLangchainAdapter.js' }
    });
    
    console.log(`✅ AI adapter splitting: ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      console.log('❌ No chunks created - investigating...');
    } else {
      chunks.forEach((chunk, index) => {
        const tokens = chunk.tokenCount || chunk.tokens || 0;
        const content = chunk.content || chunk.pageContent || '';
        console.log(`   ${index + 1}: ${tokens} tokens, ${content.length} chars`);
        console.log(`       Type: ${chunk.metadata?.semantic_unit || 'unknown'}`);
        console.log(`       Name: ${chunk.metadata?.function_name || 'unknown'}`);
      });
    }

  } catch (error) {
    console.error('❌ AI adapter splitting failed:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n🏁 Class debug completed');
}

// Run the debug
debugASTClassProcessing().catch(console.error);