// test_enhanced_ast_ai_adapter.js
// Test enhanced AST splitter on aiLangchainAdapter.js

const path = require('path');
const fs = require('fs');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function testEnhancedASTSplitterOnAIAdapter() {
  console.log('========================================');
  console.log('🚀 TESTING ENHANCED AST SPLITTER ON AI ADAPTER');
  console.log('========================================');

  // Read the aiLangchainAdapter.js file
  const filePath = path.join(__dirname, 'business_modules/ai/infrastructure/ai/aiLangchainAdapter.js');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`\n📄 Original aiLangchainAdapter.js: ${content.length} characters`);

  // Enhanced configuration with Fastify rules (matching debug test)
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

  console.log('\n🎯 ENHANCED CONFIGURATION:');
  console.log(`   • Max Tokens: ${enhancedConfig.maxTokens} (enhanced for semantic coherence)`);
  console.log(`   • Min Tokens: ${enhancedConfig.minTokens} (fine-grained splitting)`);
  console.log(`   • Overlap: ${enhancedConfig.overlap} (clean boundaries)`);
  console.log(`   • Fastify Rules: ${enhancedConfig.fastifyRules.recognizePatterns ? 'Enabled' : 'Disabled'}`);
  console.log(`   • Keep Complete Registrations: ${enhancedConfig.fastifyRules.keepCompleteRegistrations ? 'TRUE' : 'FALSE'}`);
  console.log(`   • Keep Complete Routes: ${enhancedConfig.fastifyRules.keepCompleteRoutes ? 'TRUE' : 'FALSE'}`);

  console.log('\n🔄 Splitting with enhanced AST configuration...');

  // Initialize enhanced AST splitter
  const splitter = new ASTCodeSplitter(enhancedConfig);
  
  // Split the document (using same format as debug test)
  const chunks = await splitter.splitDocument({
    pageContent: content,
    metadata: { source: 'aiLangchainAdapter.js' }
  });
  
  console.log(`\n🎯 ENHANCED CHUNKS CREATED: ${chunks.length}`);

  // Analyze chunks
  console.log('\n📊 ENHANCED CHUNK ANALYSIS:');
  let totalTokens = 0;
  const chunkSizes = [];
  
  chunks.forEach((chunk, index) => {
    const tokens = chunk.tokenCount || chunk.tokens || 0;
    const type = chunk.type || 'unknown';
    const subtype = chunk.subtype || 'code';
    totalTokens += tokens;
    chunkSizes.push(tokens);
    
    // Debug: Check all possible content properties
    const pageContent = chunk.pageContent || '';
    const content = chunk.content || '';
    const text = chunk.text || '';
    
    console.log(`   ${index + 1}: ${tokens} tokens | ${type}/${subtype}`);
    console.log(`      pageContent: ${pageContent.length} chars`);
    console.log(`      content: ${content.length} chars`);  
    console.log(`      text: ${text.length} chars`);
    
    const actualContent = pageContent || content || text;
    const preview = actualContent.length > 0 ? actualContent.substring(0, 50).replace(/\n/g, ' ') : 'NO CONTENT FOUND';
    console.log(`      Preview: ${preview}...`);
  });

  // Statistics
  const avgSize = Math.round(totalTokens / chunks.length);
  const minSize = Math.min(...chunkSizes);
  const maxSize = Math.max(...chunkSizes);

  console.log('\n📈 ENHANCED STATISTICS:');
  console.log(`   • Total Chunks: ${chunks.length}`);
  console.log(`   • Average Size: ${avgSize} tokens`);
  console.log(`   • Size Range: ${minSize} - ${maxSize} tokens`);
  console.log(`   • Total Tokens: ${totalTokens}`);

  // Count method/function chunks
  const methodChunks = chunks.filter(chunk => {
    const content = chunk.content || chunk.text || '';
    return content.includes('async ') || 
           content.includes('function ') ||
           content.includes('constructor(') ||
           content.match(/^\s*\w+\s*\([^)]*\)\s*{/);
  });
  
  console.log(`   • Method/Function Chunks: ${methodChunks.length}`);

  // Count class-related chunks  
  const classChunks = chunks.filter(chunk => {
    const content = chunk.content || chunk.text || '';
    return content.includes('class ') ||
           content.includes('extends ') ||
           content.includes('constructor(');
  });
  
  console.log(`   • Class-related Chunks: ${classChunks.length}`);

  // Save chunks to markdown file
  const outputPath = path.join(__dirname, 'enhanced_ast_ai_adapter_chunks.md');
  let markdown = `# Enhanced AST Chunks for aiLangchainAdapter.js\n\n`;
  markdown += `**Original File:** ${content.length} characters\n`;
  markdown += `**Total Chunks:** ${chunks.length}\n`;
  markdown += `**Total Tokens:** ${totalTokens}\n\n`;

  chunks.forEach((chunk, index) => {
    const tokens = chunk.tokenCount || chunk.tokens || 0;
    const type = chunk.type || 'unknown';
    const subtype = chunk.subtype || 'code';
    const content = chunk.pageContent || chunk.content || chunk.text || '';
    
    markdown += `## Chunk ${index + 1}: ${type}/${subtype} (${tokens} tokens)\n\n`;
    markdown += `**Tokens:** ${tokens}\n`;
    markdown += `**Type:** ${type}\n\n`;
    markdown += `\`\`\`javascript\n${content}\n\`\`\`\n\n---\n\n`;
  });

  fs.writeFileSync(outputPath, markdown);
  console.log(`\n✅ Enhanced AST chunks saved to: enhanced_ast_ai_adapter_chunks.md`);
  console.log('🎉 SUCCESS: Enhanced AST splitter analysis completed!');

  console.log(`\n🏁 Enhanced test completed: ${chunks.length} chunks`);
}

// Run the test
testEnhancedASTSplitterOnAIAdapter().catch(console.error);