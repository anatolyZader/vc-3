#!/usr/bin/env node
/**
 * Simple Line-Based Splitting for app.js
 * Creates meaningful chunks from the processed app.js file
 */

"use strict";

const path = require('path');
const fs = require('fs');

// Import pipeline components
const CodePreprocessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor');
const UbiquitousLanguageEnhancer = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');
const { Document } = require('langchain/document');

async function createAppJSChunks() {
  try {
    const appJsPath = './app.js';
    
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
      excludeImportsFromChunking: true,  // REMOVE imports from chunking
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      normalizeWhitespace: true
    });
    
    const preprocessedDocument = await codePreprocessor.preprocessCodeDocument(document, {
      excludeImportsFromChunking: true,  // REMOVE imports from chunking
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      addStructuralMarkers: false
    });

    // Step 2: Ubiquitous language enhancement
    console.log(`[${new Date().toISOString()}] 📚 Step 2: Ubiquitous language enhancement`);
    const ubiquitousLanguageEnhancer = new UbiquitousLanguageEnhancer();
    const ubiquitousEnhanced = await ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(preprocessedDocument);
    
    // Step 3: Semantic-aware splitting
    console.log(`[${new Date().toISOString()}] ✂️ Step 3: Semantic-aware chunking`);
    const chunks = createSemanticChunks(ubiquitousEnhanced.pageContent);
    
    console.log(`[${new Date().toISOString()}] ✅ Line-based splitting completed:`);
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
 * Create semantic-aware chunks that respect code boundaries
 */
function createSemanticChunks(content) {
  const lines = content.split('\n');
  const chunks = [];
  let currentChunk = [];
  let currentChunkStartLine = 1;
  let braceDepth = 0;
  let inMultiLineStatement = false;
  let lineNumber = 0;
  
  for (const line of lines) {
    lineNumber++;
    const trimmedLine = line.trim();
    
    // Track brace depth for nested structures
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;
    
    // Detect multi-line statements
    const isStatementContinuation = line.endsWith(',') || line.endsWith('(') || 
                                   line.endsWith('{') || trimmedLine === '' ||
                                   (braceDepth > 0 && !line.includes('await fastify.register'));
    
    currentChunk.push(line);
    
    // Check if we should create a chunk boundary
    const shouldSplit = (
      // After plugin registrations (complete statements)
      (trimmedLine.endsWith(';') || trimmedLine.endsWith('}')) && 
      braceDepth === 0 && 
      !inMultiLineStatement &&
      currentChunk.length > 3 // Lower minimum chunk size
    ) || (
      // After major configuration blocks
      trimmedLine.endsWith('});') &&
      braceDepth === 0 &&
      currentChunk.length > 5
    ) || (
      // Force split at route definitions
      (trimmedLine.includes('fastify.get') || trimmedLine.includes('fastify.route')) &&
      currentChunk.length > 5
    ) || (
      // Force split every 20 lines to ensure granularity
      currentChunk.length > 20 && 
      braceDepth === 0 &&
      !isStatementContinuation
    );
    
    if (shouldSplit) {
      // Create chunk
      const chunkContent = currentChunk.join('\n');
      if (chunkContent.trim().length > 0) {
        chunks.push({
          pageContent: chunkContent,
          metadata: {
            chunkIndex: chunks.length + 1,
            startLine: currentChunkStartLine,
            endLine: lineNumber,
            lineCount: currentChunk.length,
            semanticType: detectSemanticType(chunkContent)
          }
        });
      }
      
      // Reset for next chunk
      currentChunk = [];
      currentChunkStartLine = lineNumber + 1;
      inMultiLineStatement = false;
    } else if (isStatementContinuation) {
      inMultiLineStatement = true;
    }
  }
  
  // Add final chunk if any content remains
  if (currentChunk.length > 0) {
    const chunkContent = currentChunk.join('\n');
    if (chunkContent.trim().length > 0) {
      chunks.push({
        pageContent: chunkContent,
        metadata: {
          chunkIndex: chunks.length + 1,
          startLine: currentChunkStartLine,
          endLine: lineNumber,
          lineCount: currentChunk.length,
          semanticType: detectSemanticType(chunkContent)
        }
      });
    }
  }
  
  return chunks;
}

/**
 * Detect the semantic type of a code chunk
 */
function detectSemanticType(content) {
  if (content.includes('module.exports')) return 'module_setup';
  if (content.includes('await fastify.register') && content.includes('helmet')) return 'security_config';
  if (content.includes('await fastify.register') && content.includes('session')) return 'session_config';
  if (content.includes('await fastify.register') && content.includes('Cookie')) return 'cookie_config';
  if (content.includes('await fastify.register')) return 'plugin_registration';
  if (content.includes('fastify.get') || content.includes('fastify.route')) return 'route_handler';
  if (content.includes('AutoLoad')) return 'autoload_config';
  if (content.includes('fastify.addHook')) return 'hook_registration';
  return 'general_config';
}

/**
 * Generate markdown with only the chunk contents, clearly separated
 */
function generateChunksOnlyMarkdown(fileName, chunks) {
  let markdown = `# ${fileName} - Semantic Code Chunks\n\n`;
  
  chunks.forEach((chunk, index) => {
    const content = chunk.pageContent || chunk.content || '';
    const metadata = chunk.metadata || {};
    
    markdown += `## Chunk ${index + 1}: ${metadata.semanticType || 'unknown'} (Lines ${metadata.startLine}-${metadata.endLine})\n\n`;
    markdown += '```javascript\n';
    markdown += content;
    markdown += '\n```\n\n';
    markdown += '---\n\n';
  });
  
  return markdown;
}

// Run the function
if (require.main === module) {
  createAppJSChunks()
    .then(result => {
      console.log(`\n🎉 App.js chunking completed successfully!`);
      console.log(`📊 Generated ${result.totalChunks} chunks`);
      console.log(`📝 Results saved to: ${result.outputPath}`);
    })
    .catch(error => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}