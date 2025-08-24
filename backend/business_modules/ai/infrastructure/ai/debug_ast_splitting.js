// debug_ast_splitting.js
"use strict";

const ASTCodeSplitter = require('./rag_pipelines/ASTCodeSplitter');

async function debugAST() {
  console.log('🔍 Debug AST Splitting');
  
  const splitter = new ASTCodeSplitter({
    maxChunkSize: 200 // Small size to force method extraction
  });
  
  // Simple test code with clear functions
  const testCode = `
// Simple test controller
class TestController {
  constructor() {
    this.name = 'test';
  }
  
  async getUserById(id) {
    console.log('Getting user:', id);
    return { id, name: 'test user' };
  }
  
  async createUser(data) {
    console.log('Creating user:', data);
    return { id: 1, ...data };
  }
}

function helperFunction() {
  console.log('This is a helper function');
  const result = 'helper result with more content';
  return result;
}

module.exports = TestController;
  `;
  
  const document = {
    pageContent: testCode,
    metadata: {
      source: 'test.js',
      fileType: 'JavaScript'
    }
  };
  
  console.log('📄 Input code:');
  console.log(testCode);
  console.log('\n🌳 Processing with AST...');
  
  const chunks = await splitter.splitCodeDocument(document);
  
  console.log(`\n✅ Results: ${chunks.length} chunks`);
  
  chunks.forEach((chunk, index) => {
    console.log(`\n📦 Chunk ${index + 1}:`);
    console.log(`   Type: ${chunk.metadata.chunk_type}`);
    console.log(`   Semantic Unit: ${chunk.metadata.semantic_unit}`);
    console.log(`   Function: ${chunk.metadata.function_name}`);
    console.log(`   Size: ${chunk.pageContent.length} chars`);
    console.log(`   Lines: ${chunk.metadata.start_line}-${chunk.metadata.end_line}`);
    console.log('   Content:');
    console.log(chunk.pageContent);
    console.log('   ---');
  });
}

debugAST().catch(console.error);
