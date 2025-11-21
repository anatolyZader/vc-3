// test_debug_ast_ai_adapter.js
// Debug test for AST splitter on aiLangchainAdapter.js

const path = require('path');
const fs = require('fs');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function debugASTSplitterOnAIAdapter() {
  console.log('========================================');
  console.log('🔍 DEBUG: AST SPLITTER ON AI ADAPTER');
  console.log('========================================');

  // Read the aiLangchainAdapter.js file
  const filePath = path.join(__dirname, 'business_modules/ai/infrastructure/ai/aiLangchainAdapter.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`\n📄 File: ${content.length} characters, ${content.split('\n').length} lines`);
  console.log(`📄 First 200 chars:`, content.substring(0, 200).replace(/\n/g, '\\n'));

  // Test basic configuration first
  const basicConfig = {
    maxTokens: 500,
    minTokens: 30,
    overlap: 50
  };

  console.log('\n🔧 Testing with BASIC configuration...');
  const basicSplitter = new ASTCodeSplitter(basicConfig);
  
  try {
    const basicChunks = await basicSplitter.splitDocument(content);
    console.log(`✅ Basic splitting: ${basicChunks.length} chunks`);
    
    if (basicChunks.length > 0) {
      const firstChunk = basicChunks[0];
      console.log(`📊 First chunk: ${firstChunk.tokenCount || firstChunk.tokens || 0} tokens`);
      console.log(`📊 Content length: ${(firstChunk.content || firstChunk.text || '').length} chars`);
      console.log(`📊 Content preview:`, (firstChunk.content || firstChunk.text || '').substring(0, 100).replace(/\n/g, '\\n'));
    }
  } catch (error) {
    console.error('❌ Basic splitting failed:', error.message);
    console.error('Stack:', error.stack);
  }

  // Test enhanced configuration  
  console.log('\n🔧 Testing with ENHANCED configuration...');
  const enhancedConfig = {
    maxTokens: 500,
    minTokens: 30,
    overlap: 50,
    fastifyRules: {
      recognizePatterns: true,
      keepCompleteRegistrations: true,  
      keepCompleteRoutes: true,
      keepCompleteHooks: true
    }
  };

  const enhancedSplitter = new ASTCodeSplitter(enhancedConfig);
  
  try {
    const enhancedChunks = await enhancedSplitter.splitDocument(content);
    console.log(`✅ Enhanced splitting: ${enhancedChunks.length} chunks`);
    
    if (enhancedChunks.length > 0) {
      enhancedChunks.forEach((chunk, index) => {
        const tokens = chunk.tokenCount || chunk.tokens || 0;
        const content = chunk.content || chunk.text || '';
        console.log(`   ${index + 1}: ${tokens} tokens, ${content.length} chars, type: ${chunk.type || 'unknown'}`);
      });
    }
  } catch (error) {
    console.error('❌ Enhanced splitting failed:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n🏁 Debug completed');
}

// Run the debug test
debugASTSplitterOnAIAdapter().catch(console.error);