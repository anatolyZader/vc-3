// Enhanced AST Code Splitter for Fine-Grained Semantic Units
'use strict';

const fs = require('fs');
const path = require('path');

// Import the core dependencies
const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');
const CodePreprocessor = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor');
const UbiquitousLanguageEnhancer = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');

async function testFineGrainedASTSplitting() {
  console.log('========================================');
  console.log('🔬 TESTING FINE-GRAINED AST SPLITTING');
  console.log('========================================\n');

  try {
    // Read app.js
    const appJsPath = path.join(__dirname, 'backend', 'app.js');
    const originalCode = fs.readFileSync(appJsPath, 'utf8');
    console.log(`📄 Original app.js: ${originalCode.length} characters\n`);

    // Configure fine-grained AST splitter
    const astSplitter = new ASTCodeSplitter({
      // FINE-GRAINED TOKEN LIMITS for method/function level splitting
      maxTokens: 400,        // Much smaller chunks (was 1200)
      minTokens: 50,         // Smaller minimum (was 150)  
      overlapTokens: 100,    // Moderate overlap (was 200)
      
      // Enable semantic coherence for better boundaries
      semanticCoherence: true,
      mergeSmallChunks: false,  // Keep individual methods separate
      includeImportsInContext: true
    });

    // Configure preprocessor for cleaner code
    const preprocessor = new CodePreprocessor({
      removeComments: false,        // Keep comments for context
      removeEmptyLines: false,      // Keep structure
      removeImports: false,         // Keep imports for now
      removeLogStatements: true,    // Clean up logs
      normalizeWhitespace: true
    });

    // Language enhancer for better semantic understanding
    const languageEnhancer = new UbiquitousLanguageEnhancer({
      enhanceComments: true,
      addSemanticMarkers: true,
      preserveOriginalStructure: true
    });

    console.log('🔧 Processing with fine-grained configuration...\n');

    // Step 1: Preprocess
    const preprocessedCode = await preprocessor.process(originalCode, {
      source: 'app.js',
      language: 'javascript'
    });
    console.log(`📝 After preprocessing: ${preprocessedCode.length} characters`);

    // Step 2: Enhance with ubiquitous language
    const enhancedCode = await languageEnhancer.enhance(preprocessedCode, {
      source: 'app.js',
      language: 'javascript'  
    });
    console.log(`✨ After enhancement: ${enhancedCode.content.length} characters\n`);

    // Step 3: Fine-grained AST splitting
    const document = {
      pageContent: enhancedCode.content,
      metadata: {
        source: 'app.js',
        language: 'javascript',
        type: 'code'
      }
    };

    const chunks = await astSplitter.splitDocument(document);
    console.log(`🎯 FINE-GRAINED CHUNKS CREATED: ${chunks.length}\n`);

    // Generate detailed markdown output
    let markdownContent = '# app.js - Fine-Grained AST Semantic Chunks\n\n';
    markdownContent += `**Generated:** ${new Date().toISOString()}\n`;
    markdownContent += `**Configuration:** Fine-grained (${astSplitter.tokenSplitter.maxTokens} max tokens per chunk)\n`;
    markdownContent += `**Total Chunks:** ${chunks.length}\n\n`;
    markdownContent += '---\n\n';

    chunks.forEach((chunk, index) => {
      const metadata = chunk.metadata || {};
      const chunkType = metadata.chunkType || 'unknown';
      const semanticType = metadata.semanticType || 'code';
      const tokenCount = metadata.tokenCount || 'unknown';
      
      markdownContent += `## Chunk ${index + 1}: ${chunkType}_${semanticType}\n\n`;
      markdownContent += `**Type:** ${chunkType}\n`;
      markdownContent += `**Semantic:** ${semanticType}\n`;
      markdownContent += `**Tokens:** ${tokenCount}\n`;
      
      if (metadata.functionName) {
        markdownContent += `**Function:** ${metadata.functionName}\n`;
      }
      if (metadata.className) {
        markdownContent += `**Class:** ${metadata.className}\n`;
      }
      if (metadata.methods && metadata.methods.length > 0) {
        markdownContent += `**Methods:** ${metadata.methods.join(', ')}\n`;
      }
      
      markdownContent += '\n```javascript\n';
      markdownContent += chunk.pageContent;
      markdownContent += '\n```\n\n';
      markdownContent += '---\n\n';
    });

    // Write to file
    const outputPath = path.join(__dirname, 'fine_grained_app_js_chunks.md');
    fs.writeFileSync(outputPath, markdownContent);
    
    console.log(`✅ Fine-grained chunks saved to: ${outputPath}`);
    console.log('\n📊 CHUNK ANALYSIS:');
    
    chunks.forEach((chunk, index) => {
      const metadata = chunk.metadata || {};
      const tokens = metadata.tokenCount || 'unknown';
      const type = metadata.chunkType || 'unknown';
      const semantic = metadata.semanticType || 'code';
      
      console.log(`   Chunk ${index + 1}: ${type}/${semantic} (${tokens} tokens)`);
    });

    console.log('\n🎉 Fine-grained AST splitting completed successfully!');
    
    return {
      totalChunks: chunks.length,
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
      console.log(`\n🏁 Test completed with ${result.totalChunks} chunks`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testFineGrainedASTSplitting;