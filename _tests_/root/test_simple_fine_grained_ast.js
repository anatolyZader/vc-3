// Simple Fine-Grained AST Splitting Test
'use strict';

const fs = require('fs');
const path = require('path');

// Import the AST splitter
const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function testFineGrainedASTSplitting() {
  console.log('========================================');
  console.log('🔬 FINE-GRAINED AST SPLITTING TEST');
  console.log('========================================\n');

  try {
    // Read app.js
    const appJsPath = path.join(__dirname, 'backend', 'app.js');
    const originalCode = fs.readFileSync(appJsPath, 'utf8');
    console.log(`📄 Original app.js: ${originalCode.length} characters\n`);

    console.log('🎯 FINE-GRAINED CONFIGURATION:');
    console.log('   • Max Tokens: 300 (vs. default 1200)');
    console.log('   • Min Tokens: 30 (vs. default 150)');
    console.log('   • Overlap: 50 (vs. default 200)');
    console.log('   • Goal: Method/function level chunks\n');

    // Configure fine-grained AST splitter
    const astSplitter = new ASTCodeSplitter({
      // FINE-GRAINED TOKEN LIMITS for method/function level splitting
      maxTokens: 300,        // Much smaller chunks
      minTokens: 30,         // Smaller minimum
      overlapTokens: 50,     // Minimal overlap
      
      // Enable semantic coherence
      semanticCoherence: true,
      mergeSmallChunks: false,  // Keep individual methods separate
      includeImportsInContext: false // Clean chunks without imports
    });

    console.log('🔄 Splitting with fine-grained AST...\n');

    // Create document for splitting
    const document = {
      pageContent: originalCode,
      metadata: {
        source: 'app.js',
        language: 'javascript',
        type: 'code'
      }
    };

    // Fine-grained AST splitting
    const chunks = await astSplitter.splitDocument(document);
    console.log(`🎯 FINE-GRAINED CHUNKS CREATED: ${chunks.length}\n`);

    // Analyze chunk distribution
    console.log('📊 CHUNK SIZE ANALYSIS:');
    let totalTokens = 0;
    const tokenCounts = [];
    
    chunks.forEach((chunk, index) => {
      const tokenCount = astSplitter.tokenSplitter.countTokens(chunk.pageContent);
      tokenCounts.push(tokenCount);
      totalTokens += tokenCount;
      
      const chunkType = chunk.metadata?.chunkType || 'unknown';
      const semanticType = chunk.metadata?.semanticType || 'code';
      
      console.log(`   Chunk ${index + 1}: ${tokenCount} tokens (${chunkType}/${semanticType})`);
    });

    const avgTokens = Math.round(totalTokens / chunks.length);
    const maxTokens = Math.max(...tokenCounts);
    const minTokens = Math.min(...tokenCounts);

    console.log(`\n📈 STATISTICS:`);
    console.log(`   • Total Chunks: ${chunks.length}`);
    console.log(`   • Average Size: ${avgTokens} tokens`);
    console.log(`   • Size Range: ${minTokens} - ${maxTokens} tokens`);
    console.log(`   • Total Tokens: ${totalTokens}`);

    // Generate detailed markdown output
    let markdownContent = '# app.js - Fine-Grained AST Semantic Chunks\n\n';
    markdownContent += `**Configuration:** Fine-grained AST splitting (max ${astSplitter.tokenSplitter.maxTokens} tokens)\n`;
    markdownContent += `**Generated:** ${new Date().toISOString()}\n`;
    markdownContent += `**Total Chunks:** ${chunks.length}\n`;
    markdownContent += `**Average Size:** ${avgTokens} tokens\n`;
    markdownContent += `**Size Range:** ${minTokens} - ${maxTokens} tokens\n\n`;
    markdownContent += '---\n\n';

    chunks.forEach((chunk, index) => {
      const tokenCount = astSplitter.tokenSplitter.countTokens(chunk.pageContent);
      const metadata = chunk.metadata || {};
      const chunkType = metadata.chunkType || 'unknown';
      const semanticType = metadata.semanticType || 'code';
      
      markdownContent += `## Chunk ${index + 1}: ${chunkType} (${tokenCount} tokens)\n\n`;
      markdownContent += `**Type:** ${chunkType}\n`;
      markdownContent += `**Semantic:** ${semanticType}\n`;
      markdownContent += `**Tokens:** ${tokenCount}\n`;
      
      if (metadata.functionName) {
        markdownContent += `**Function:** ${metadata.functionName}\n`;
      }
      if (metadata.className) {
        markdownContent += `**Class:** ${metadata.className}\n`;
      }
      
      markdownContent += '\n```javascript\n';
      markdownContent += chunk.pageContent;
      markdownContent += '\n```\n\n';
      markdownContent += '---\n\n';
    });

    // Write to file
    const outputPath = path.join(__dirname, 'fine_grained_ast_app_js_chunks.md');
    fs.writeFileSync(outputPath, markdownContent);
    
    console.log(`\n✅ Fine-grained AST chunks saved to: fine_grained_ast_app_js_chunks.md`);
    console.log(`\n🎉 SUCCESS: ${chunks.length} fine-grained semantic chunks created!`);
    
    return {
      totalChunks: chunks.length,
      avgTokens: avgTokens,
      outputFile: outputPath,
      chunks: chunks
    };

  } catch (error) {
    console.error('❌ Error during fine-grained AST splitting:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testFineGrainedASTSplitting()
    .then(result => {
      console.log(`\n🏁 Test completed: ${result.totalChunks} chunks (avg ${result.avgTokens} tokens)`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testFineGrainedASTSplitting;