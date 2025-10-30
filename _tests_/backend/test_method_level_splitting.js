#!/usr/bin/env node
/**
 * Test Method-Level Code Splitting
 * Creates aggressive splitting configuration to break large classes into method-level chunks
 */

"use strict";

const path = require('path');
const fs = require('fs');

// Import pipeline components
const CodePreprocessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor');
const UbiquitousLanguageEnhancer = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitterBackup');
const TokenBasedSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/tokenBasedSplitter');
const { Document } = require('langchain/document');

/**
 * Create method-level splitting configuration for large classes
 */
function createMethodLevelSplitter() {
  // Create very aggressive token splitter for method-level chunks
  const methodLevelTokenSplitter = new TokenBasedSplitter({
    maxTokens: 300,        // Very small chunks - roughly 1-2 methods
    minTokens: 50,         // Minimum meaningful method size
    overlapTokens: 75,     // Overlap for context continuity
    encodingModel: 'cl100k_base'
  });

  // Create AST splitter with method-level configuration
  const methodLevelASTSplitter = new ASTCodeSplitter({
    tokenSplitter: methodLevelTokenSplitter,
    maxChunkSize: 300 * 3.5,  // Character equivalent for legacy compatibility
    minChunkSize: 50 * 3.5,   // Character equivalent for legacy compatibility
    includeComments: true,    // Include comments for context
    includeImports: true,     // Include imports for context
    mergeSmallChunks: false,  // Don't merge - we want granular chunks
    semanticCoherence: true   // Maintain semantic boundaries
  });

  return methodLevelASTSplitter;
}

/**
 * Process file with method-level splitting and generate markdown report
 */
async function processFileWithMethodLevelSplitting(filePath) {
  try {
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    console.log(`[${new Date().toISOString()}] 📁 Processing: ${fileName}`);
    console.log(`[${new Date().toISOString()}] 📏 Original size: ${fileContent.length} characters`);
    
    // Create document
    const document = new Document({
      pageContent: fileContent,
      metadata: {
        source: filePath,
        type: 'code',
        language: 'javascript'
      }
    });

    // Step 1: Code preprocessing
    console.log(`[${new Date().toISOString()}] 🔧 Step 1: Code preprocessing`);
    const codePreprocessor = new CodePreprocessor({
      excludeImportsFromChunking: false, // Keep imports for context
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      normalizeWhitespace: true
    });
    
    const preprocessedDocument = await codePreprocessor.preprocessCodeDocument(document, {
      excludeImportsFromChunking: false,
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      addStructuralMarkers: false
    });

    // Step 2: Ubiquitous language enhancement
    console.log(`[${new Date().toISOString()}] 📚 Step 2: Ubiquitous language enhancement`);
    const ubiquitousLanguageEnhancer = new UbiquitousLanguageEnhancer();
    const ubiquitousEnhanced = await ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(preprocessedDocument);
    
    // Step 3: Method-level AST splitting
    console.log(`[${new Date().toISOString()}] ✂️ Step 3: METHOD-LEVEL AST splitting`);
    const methodLevelSplitter = createMethodLevelSplitter();
    const chunks = await methodLevelSplitter.splitDocument(ubiquitousEnhanced);
    
    console.log(`[${new Date().toISOString()}] ✅ Method-level splitting completed:`);
    console.log(`[${new Date().toISOString()}] 📊 Generated ${chunks.length} method-level chunks`);
    
    // Analyze chunks
    const chunkAnalysis = chunks.map((chunk, index) => {
      const content = chunk.pageContent || chunk.content || '';
      const tokenCount = methodLevelSplitter.tokenSplitter.countTokens(content);
      
      // Extract method name or chunk identifier
      const lines = content.split('\n');
      let chunkIdentifier = 'unknown';
      
      // Look for method/function signatures
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^(async\s+)?(\w+)\s*\([^)]*\)\s*{/)) {
          chunkIdentifier = trimmed.match(/(\w+)\s*\(/)[1];
          break;
        } else if (trimmed.match(/^(class|constructor|get|set)\s+/)) {
          chunkIdentifier = trimmed.split(/\s+/)[1] || 'constructor';
          break;
        } else if (trimmed.includes('=') && trimmed.includes('=>')) {
          const match = trimmed.match(/(\w+)\s*=/);
          if (match) {
            chunkIdentifier = match[1];
            break;
          }
        }
      }
      
      return {
        index: index + 1,
        identifier: chunkIdentifier,
        tokenCount,
        characterCount: content.length,
        lineCount: lines.length,
        preview: content.substring(0, 100).replace(/\n/g, ' ') + '...'
      };
    });

    // Generate comprehensive markdown report
    const reportContent = generateMethodLevelReport(fileName, filePath, fileContent, preprocessedDocument, ubiquitousEnhanced, chunks, chunkAnalysis);
    
    // Write report to file
    const reportFileName = `method_level_analysis_${fileName.replace(/\.js$/, '')}.md`;
    const reportPath = path.resolve(reportFileName);
    fs.writeFileSync(reportPath, reportContent);
    
    console.log(`[${new Date().toISOString()}] 📝 Report generated: ${reportPath}`);
    console.log(`[${new Date().toISOString()}] 📊 Report size: ${reportContent.length} characters`);
    
    return {
      success: true,
      originalSize: fileContent.length,
      preprocessedSize: preprocessedDocument.pageContent.length,
      enhancedSize: ubiquitousEnhanced.pageContent.length,
      totalChunks: chunks.length,
      chunkAnalysis,
      reportPath
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error processing file:`, error.message);
    throw error;
  }
}

/**
 * Generate comprehensive markdown report for method-level analysis
 */
function generateMethodLevelReport(fileName, filePath, originalContent, preprocessedDocument, enhancedDocument, chunks, chunkAnalysis) {
  const timestamp = new Date().toISOString();
  
  return `# ${fileName} - Method-Level Code Splitting Analysis

**File:** \`${filePath}\`
**Processed:** ${timestamp}
**Analysis Type:** Method-Level AST Splitting with Aggressive Token Limits (300 tokens max)

## 📋 Executive Summary

This analysis demonstrates method-level code splitting for better RAG retrieval granularity. Instead of treating large classes as single chunks, this approach breaks them down into method-level components for more precise semantic search and retrieval.

## 📊 Processing Statistics

| Metric | Value | Change |
|--------|-------|--------|
| **Original Size** | ${originalContent.length.toLocaleString()} chars | - |
| **After Preprocessing** | ${preprocessedDocument.pageContent.length.toLocaleString()} chars | ${((preprocessedDocument.pageContent.length - originalContent.length) / originalContent.length * 100).toFixed(1)}% |
| **After Enhancement** | ${enhancedDocument.pageContent.length.toLocaleString()} chars | ${((enhancedDocument.pageContent.length - preprocessedDocument.pageContent.length) / preprocessedDocument.pageContent.length * 100).toFixed(1)}% |
| **Total Method-Level Chunks** | ${chunks.length} | **Granular Retrieval Ready** |
| **Average Chunk Size** | ${Math.round(chunks.reduce((sum, chunk) => sum + (chunk.pageContent?.length || chunk.content?.length || 0), 0) / chunks.length).toLocaleString()} chars | Optimal for focused retrieval |

### 🏷️ Chunk Analysis Summary

**Token Distribution:**
- **Small chunks (< 150 tokens):** ${chunkAnalysis.filter(c => c.tokenCount < 150).length}
- **Medium chunks (150-250 tokens):** ${chunkAnalysis.filter(c => c.tokenCount >= 150 && c.tokenCount < 250).length}
- **Large chunks (250+ tokens):** ${chunkAnalysis.filter(c => c.tokenCount >= 250).length}

**Average tokens per chunk:** ${Math.round(chunkAnalysis.reduce((sum, c) => sum + c.tokenCount, 0) / chunkAnalysis.length)}

## 🔄 Complete Pipeline Processing

### 📄 Step 0: Original Source Code

**Size:** ${originalContent.length.toLocaleString()} characters

\`\`\`javascript
${originalContent.substring(0, 2000)}${originalContent.length > 2000 ? '\n\n// ... (truncated for brevity, showing first 2000 characters) ...' : ''}
\`\`\`

### 🔧 Step 1: Code Preprocessing Results

**Size:** ${preprocessedDocument.pageContent.length.toLocaleString()} characters
**Reduction:** ${((originalContent.length - preprocessedDocument.pageContent.length) / originalContent.length * 100).toFixed(1)}%

**Key preprocessing actions:**
- Removed debug/log statements
- Normalized whitespace
- Preserved documentation comments
- Cleaned code structure

### 📚 Step 2: Ubiquitous Language Enhancement

**Size:** ${enhancedDocument.pageContent.length.toLocaleString()} characters
**Change:** ${((enhancedDocument.pageContent.length - preprocessedDocument.pageContent.length) / preprocessedDocument.pageContent.length * 100).toFixed(1)}%

Enhanced with domain-specific language context and semantic enrichments.

### ✂️ Step 3: Method-Level AST Code Splitting

**Configuration:**
- **Max tokens per chunk:** 300 (≈1-2 methods)
- **Min tokens per chunk:** 50 (meaningful method size)
- **Token overlap:** 75 (context continuity)
- **Semantic boundaries:** Preserved
- **Include imports/comments:** Yes (for context)

## 📋 Method-Level Chunk Inventory

${chunkAnalysis.map(chunk => `### Chunk ${chunk.index}: ${chunk.identifier}

**Token Count:** ${chunk.tokenCount} | **Characters:** ${chunk.characterCount.toLocaleString()} | **Lines:** ${chunk.lineCount}

**Preview:** \`${chunk.preview}\`

**Full Content:**
\`\`\`javascript
${chunks[chunk.index - 1].pageContent || chunks[chunk.index - 1].content || ''}
\`\`\`

---`).join('\n\n')}

## 📈 RAG Optimization Benefits

### ✅ Advantages of Method-Level Splitting:

1. **Precise Retrieval:** Each method/function can be retrieved independently
2. **Better Context Matching:** Queries match specific functionality rather than entire classes
3. **Reduced Noise:** Less irrelevant code in retrieved chunks
4. **Improved Embeddings:** More focused semantic representations
5. **Scalable Architecture:** Large classes don't overwhelm context windows

### ⚖️ Trade-offs:

1. **More Chunks:** ${chunks.length} chunks vs 1 large chunk
2. **Storage Overhead:** Multiple embeddings per file
3. **Context Fragmentation:** May lose some class-level context
4. **Complexity:** More sophisticated retrieval logic needed

## 🎯 Recommendations

For the **${fileName}** class:

1. **Use Method-Level Splitting:** ✅ Recommended due to large size (${originalContent.length.toLocaleString()} chars)
2. **Chunk Configuration:** Current settings (300 max tokens) provide good granularity
3. **Context Strategy:** Consider adding class-level summary chunk for overview queries
4. **Retrieval Strategy:** Use semantic similarity + metadata filtering for best results

## 🔧 Implementation Notes

This analysis uses:
- **TokenBasedSplitter:** Accurate token counting with tiktoken
- **ASTCodeSplitter:** Semantic-aware code boundaries
- **Aggressive Limits:** 300 tokens max for method-level granularity
- **Context Preservation:** 75-token overlap between chunks

---

*Generated by Enhanced RAG Pipeline Processing System*
*Timestamp: ${timestamp}*
`;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test_method_level_splitting.js <file-path>');
    console.log('Example: node test_method_level_splitting.js ./business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  try {
    const result = await processFileWithMethodLevelSplitting(filePath);
    
    console.log('\n🎉 Method-Level Analysis Complete!');
    console.log(`📊 Generated ${result.totalChunks} granular chunks from ${result.originalSize.toLocaleString()} character file`);
    console.log(`📝 Detailed report: ${result.reportPath}`);
    
  } catch (error) {
    console.error('❌ Failed to process file:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFileWithMethodLevelSplitting, createMethodLevelSplitter };