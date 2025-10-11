// Test Enhanced AST Splitter with New Configuration
'use strict';

const fs = require('fs');
const path = require('path');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function testEnhancedASTSplitter() {
  console.log('========================================');
  console.log('🚀 TESTING ENHANCED AST SPLITTER');
  console.log('========================================\n');

  try {
    // Read app.js
    const appJsPath = path.join(__dirname, 'app.js');
    const originalCode = fs.readFileSync(appJsPath, 'utf8');
    console.log(`📄 Original app.js: ${originalCode.length} characters\n`);

    console.log('🎯 ENHANCED CONFIGURATION:');
    console.log('   • Max Tokens: 500 (enhanced for semantic coherence)');
    console.log('   • Min Tokens: 30 (fine-grained splitting)');
    console.log('   • Overlap: 50 (clean boundaries)');
    console.log('   • Fastify Rules: Enabled');
    console.log('   • Keep Complete Registrations: TRUE');
    console.log('   • Keep Complete Routes: TRUE\n');

    // Create enhanced AST splitter with new configuration
    const astSplitter = new ASTCodeSplitter({
      maxTokens: 500,        // Enhanced for semantic coherence
      minTokens: 30,         // Fine-grained
      overlapTokens: 50,     // Clean boundaries
      
      // Enhanced Fastify rules
      fastifyRules: {
        keepCompleteRegistrations: true,
        keepCompleteRoutes: true,
        splitMethods: true,
        recognizePatterns: true
      },
      
      semanticCoherence: true,
      mergeSmallChunks: false
    });

    console.log('🔄 Splitting with enhanced AST configuration...\n');

    // Create document for splitting
    const document = {
      pageContent: originalCode,
      metadata: {
        source: 'app.js',
        language: 'javascript',
        type: 'code'
      }
    };

    // Enhanced AST splitting
    const chunks = await astSplitter.splitDocument(document);
    console.log(`🎯 ENHANCED CHUNKS CREATED: ${chunks.length}\n`);

    // Analyze chunk distribution
    console.log('📊 ENHANCED CHUNK ANALYSIS:');
    let totalTokens = 0;
    const tokenCounts = [];
    const fastifyChunks = [];
    
    chunks.forEach((chunk, index) => {
      const tokenCount = astSplitter.tokenSplitter.countTokens(chunk.pageContent);
      tokenCounts.push(tokenCount);
      totalTokens += tokenCount;
      
      const chunkType = chunk.metadata?.chunkType || 'unknown';
      const semanticType = chunk.metadata?.semanticType || 'code';
      const isFastify = chunk.metadata?.isFastify || false;
      const callType = chunk.metadata?.callType || '';
      
      if (isFastify) {
        fastifyChunks.push({ index: index + 1, callType, tokenCount });
      }
      
      const fastifyMarker = isFastify ? ' 🚀' : '';
      console.log(`   ${index + 1}: ${tokenCount} tokens | ${chunkType}/${semanticType} | ${callType}${fastifyMarker}`);
    });

    const avgTokens = Math.round(totalTokens / chunks.length);
    const maxTokens = Math.max(...tokenCounts);
    const minTokens = Math.min(...tokenCounts);

    console.log(`\n📈 ENHANCED STATISTICS:`);
    console.log(`   • Total Chunks: ${chunks.length}`);
    console.log(`   • Average Size: ${avgTokens} tokens`);
    console.log(`   • Size Range: ${minTokens} - ${maxTokens} tokens`);
    console.log(`   • Total Tokens: ${totalTokens}`);
    console.log(`   • Fastify Chunks: ${fastifyChunks.length}`);

    if (fastifyChunks.length > 0) {
      console.log(`\n🚀 FASTIFY CHUNKS ANALYSIS:`);
      fastifyChunks.forEach(fc => {
        console.log(`   Chunk ${fc.index}: ${fc.callType} (${fc.tokenCount} tokens)`);
      });
    }

    // Generate detailed markdown output
    let markdownContent = '# app.js - Enhanced AST Semantic Chunks\n\n';
    markdownContent += `**Configuration:** Enhanced AST splitting with Fastify rules\n`;
    markdownContent += `**Max Tokens:** ${astSplitter.tokenSplitter.maxTokens}\n`;
    markdownContent += `**Generated:** ${new Date().toISOString()}\n`;
    markdownContent += `**Total Chunks:** ${chunks.length}\n`;
    markdownContent += `**Fastify Chunks:** ${fastifyChunks.length}\n`;
    markdownContent += `**Average Size:** ${avgTokens} tokens\n\n`;

    chunks.forEach((chunk, index) => {
      const tokenCount = astSplitter.tokenSplitter.countTokens(chunk.pageContent);
      const metadata = chunk.metadata || {};
      const chunkType = metadata.chunkType || 'unknown';
      const isFastify = metadata.isFastify || false;
      const callType = metadata.callType || '';
      
      const fastifyMarker = isFastify ? ' 🚀 FASTIFY' : '';
      markdownContent += `## Chunk ${index + 1}: ${chunkType}${fastifyMarker} (${tokenCount} tokens)\n\n`;
      
      if (callType) markdownContent += `**Call Type:** ${callType}\n`;
      if (metadata.shouldKeepTogether) markdownContent += `**Keep Together:** Yes\n`;
      
      markdownContent += `**Tokens:** ${tokenCount}\n`;
      markdownContent += `**Type:** ${chunkType}\n\n`;
      
      markdownContent += '```javascript\n';
      markdownContent += chunk.pageContent;
      markdownContent += '\n```\n\n---\n\n';
    });

    // Write output
    const outputPath = path.join(__dirname, 'enhanced_ast_app_js_chunks.md');
    fs.writeFileSync(outputPath, markdownContent);
    
    console.log(`\n✅ Enhanced AST chunks saved to: enhanced_ast_app_js_chunks.md`);
    console.log(`🎉 SUCCESS: Enhanced AST splitter with Fastify rules working!`);

    return {
      totalChunks: chunks.length,
      fastifyChunks: fastifyChunks.length,
      avgTokens: avgTokens,
      outputFile: outputPath
    };

  } catch (error) {
    console.error('❌ Error during enhanced AST splitting:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testEnhancedASTSplitter()
    .then(result => {
      console.log(`\n🏁 Enhanced test completed: ${result.totalChunks} chunks (${result.fastifyChunks} Fastify)`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Enhanced test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testEnhancedASTSplitter;