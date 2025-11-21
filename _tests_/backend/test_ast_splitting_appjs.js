#!/usr/bin/env node
/**
 * Test AST Code Splitting on app.js
 * Creates a markdown file with just the split chunks
 */

"use strict";

const path = require('path');
const fs = require('fs');

// Import pipeline components
const CodePreprocessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor');
const UbiquitousLanguageEnhancer = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');
const { Document } = require('langchain/document');

async function testASTSplittingOnAppJS() {
  try {
    const appJsPath = './app.js';
    
    // Check if app.js exists
    if (!fs.existsSync(appJsPath)) {
      console.error(`❌ File not found: ${appJsPath}`);
      process.exit(1);
    }

    // Read the app.js file
    const fileContent = fs.readFileSync(appJsPath, 'utf8');
    const fileName = path.basename(appJsPath);
    
    console.log(`[${new Date().toISOString()}] 📁 Processing: ${fileName}`);
    console.log(`[${new Date().toISOString()}] 📏 Original size: ${fileContent.length} characters`);
    
    // Create document
    const document = new Document({
      pageContent: fileContent,
      metadata: {
        source: appJsPath,
        type: 'code',
        language: 'javascript'
      }
    });

    // Step 1: Code preprocessing
    console.log(`[${new Date().toISOString()}] 🔧 Step 1: Code preprocessing`);
    const codePreprocessor = new CodePreprocessor({
      excludeImportsFromChunking: true,
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      normalizeWhitespace: true
    });
    
    const preprocessedDocument = await codePreprocessor.preprocessCodeDocument(document, {
      excludeImportsFromChunking: true,
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      addStructuralMarkers: false
    });

    // Step 2: Ubiquitous language enhancement
    console.log(`[${new Date().toISOString()}] 📚 Step 2: Ubiquitous language enhancement`);
    const ubiquitousLanguageEnhancer = new UbiquitousLanguageEnhancer();
    const ubiquitousEnhanced = await ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(preprocessedDocument);
    
    // Step 3: AST-based code splitting
    console.log(`[${new Date().toISOString()}] ✂️ Step 3: AST-based code splitting`);
    const astCodeSplitter = new ASTCodeSplitter({
      maxChunkSize: 800,       // Smaller chunk size to force splitting
      maxTokens: 200,          // Smaller token limit
      minTokens: 50,           // Lower minimum
      includeComments: true,   // Include comments for context
      includeImports: true     // Include imports for context
    });
    
    const chunks = await astCodeSplitter.splitDocument(ubiquitousEnhanced);
    
    // If no chunks generated, treat the entire document as one chunk
    if (chunks.length === 0) {
      console.log(`[${new Date().toISOString()}] ⚠️ No chunks generated, using entire document as single chunk`);
      chunks.push(ubiquitousEnhanced);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ AST splitting completed:`);
    console.log(`[${new Date().toISOString()}] 📊 Generated ${chunks.length} chunks`);
    
    // Generate simple markdown with just the chunks
    const markdownContent = generateChunksOnlyMarkdown(fileName, chunks);
    
    // Write to markdown file
    const outputFileName = `app_js_chunks.md`;
    const outputPath = path.resolve(outputFileName);
    fs.writeFileSync(outputPath, markdownContent);
    
    console.log(`[${new Date().toISOString()}] 📝 Chunks saved to: ${outputPath}`);
    console.log(`[${new Date().toISOString()}] 📊 Total chunks: ${chunks.length}`);
    
    return {
      success: true,
      totalChunks: chunks.length,
      outputPath
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error processing file:`, error.message);
    throw error;
  }
}

/**
 * Generate markdown with only the chunk contents, clearly separated
 */
function generateChunksOnlyMarkdown(fileName, chunks) {
  let markdown = `# ${fileName} - AST Code Splitting Results\n\n`;
  
  chunks.forEach((chunk, index) => {
    const content = chunk.pageContent || chunk.content || '';
    
    markdown += `## Chunk ${index + 1}\n\n`;
    markdown += '```javascript\n';
    markdown += content;
    markdown += '\n```\n\n';
    markdown += '---\n\n';
  });
  
  return markdown;
}

// Run the test
if (require.main === module) {
  testASTSplittingOnAppJS()
    .then(result => {
      console.log(`\n🎉 AST splitting test completed successfully!`);
      console.log(`📊 Generated ${result.totalChunks} chunks`);
      console.log(`📝 Results saved to: ${result.outputPath}`);
    })
    .catch(error => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testASTSplittingOnAppJS };