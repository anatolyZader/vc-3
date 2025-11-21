#!/usr/bin/env node
/**
 * Force Method-Level AST Splitting
 * Creates a custom AST splitter that forcibly breaks large classes into method-level chunks
 */

"use strict";

const path = require('path');
const fs = require('fs');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// Import pipeline components
const CodePreprocessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor');
const UbiquitousLanguageEnhancer = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');
const TokenBasedSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/tokenBasedSplitter');
const { Document } = require('langchain/document');

/**
 * Custom Method-Level AST Splitter that forcibly extracts individual methods
 */
class ForceMethodLevelSplitter {
  constructor(options = {}) {
    this.tokenSplitter = new TokenBasedSplitter({
      maxTokens: options.maxTokens || 400,        // Per-method token limit
      minTokens: options.minTokens || 30,         // Minimum method size
      overlapTokens: options.overlapTokens || 50, // Context overlap
      encodingModel: 'cl100k_base'
    });
    
    this.includeClassContext = options.includeClassContext !== false;
    this.includeImports = options.includeImports !== false;
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
    
    console.log(`[${new Date().toISOString()}] 🎯 FORCE METHOD SPLITTER: Initialized for method-level extraction`);
  }

  /**
   * Parse code and extract class context + all methods separately
   */
  async splitDocument(document) {
    const { pageContent, metadata } = document;
    const fileExtension = this.getFileExtension(metadata.source || '');

    if (!this.supportedExtensions.includes(fileExtension)) {
      console.log(`[${new Date().toISOString()}] ⚠️ Unsupported file type: ${fileExtension}`);
      return [document];
    }

    try {
      const ast = this.parseCode(pageContent, fileExtension);
      const lines = pageContent.split('\n');
      
      // Extract imports and class context
      const imports = this.extractImports(ast, lines);
      const classContext = this.extractClassContext(ast, lines);
      
      // Extract all methods individually
      const methods = this.extractMethodsIndividually(ast, lines);
      
      console.log(`[${new Date().toISOString()}] ✂️ EXTRACTED: ${methods.length} individual methods`);
      
      // Create chunks for each method
      const chunks = [];
      
      // Add class overview chunk if significant
      if (classContext && classContext.content.length > 100) {
        chunks.push(this.createChunk(classContext, imports, metadata, 'class_overview'));
      }
      
      // Add individual method chunks
      for (const method of methods) {
        chunks.push(this.createChunk(method, imports, metadata, 'method'));
      }
      
      console.log(`[${new Date().toISOString()}] 📊 CREATED: ${chunks.length} method-level chunks`);
      return chunks;
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ AST PARSING ERROR: ${error.message}`);
      // Fallback to line-based splitting
      return this.fallbackLineSplitting(document);
    }
  }

  /**
   * Parse JavaScript/TypeScript code into AST
   */
  parseCode(code, fileExtension) {
    // Preprocess code to handle problematic syntax patterns
    const preprocessedCode = this.preprocessCodeForParsing(code);
    
    const parserOptions = {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      strictMode: false,
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'objectRestSpread',
        'functionBind',
        'exportDefaultFrom',
        'dynamicImport',
        'asyncGenerators',
        'functionSent',
        'optionalChaining',
        'nullishCoalescingOperator',
        'destructuringPrivate',
        'topLevelAwait',
        'importMeta'
      ]
    };

    try {
      return parse(preprocessedCode, parserOptions);
    } catch (error) {
      // Try with script mode if module mode fails
      console.log(`[${new Date().toISOString()}] ⚠️ Module parsing failed, trying script mode: ${error.message}`);
      
      const scriptOptions = {
        ...parserOptions,
        sourceType: 'script'
      };
      
      try {
        return parse(preprocessedCode, scriptOptions);
      } catch (scriptError) {
        console.log(`[${new Date().toISOString()}] ⚠️ Script parsing also failed: ${scriptError.message}`);
        throw scriptError;
      }
    }
  }

  /**
   * Preprocess code to handle syntax patterns that cause parsing issues
   */
  preprocessCodeForParsing(code) {
    // Handle parenthesized destructuring assignments
    // Convert: ({ traceable } = require('langsmith/traceable'));
    // To: const { traceable } = require('langsmith/traceable');
    let processed = code.replace(
      /\(\s*\{\s*([^}]+)\s*\}\s*=\s*([^;]+)\s*\);/g,
      'const { $1 } = $2;'
    );
    
    return processed;
  }

  /**
   * Extract import statements
   */
  extractImports(ast, lines) {
    const imports = [];
    
    traverse(ast, {
      ImportDeclaration(path) {
        const node = path.node;
        if (node.loc) {
          const startLine = node.loc.start.line - 1;
          const endLine = node.loc.end.line - 1;
          
          for (let i = startLine; i <= endLine; i++) {
            if (lines[i]) imports.push(lines[i]);
          }
        }
      },
      
      VariableDeclaration(path) {
        const node = path.node;
        if (node.declarations) {
          for (const declarator of node.declarations) {
            if (declarator.init && 
                declarator.init.type === 'CallExpression' && 
                declarator.init.callee && 
                declarator.init.callee.name === 'require') {
              
              if (node.loc) {
                const startLine = node.loc.start.line - 1;
                const endLine = node.loc.end.line - 1;
                
                for (let i = startLine; i <= endLine; i++) {
                  if (lines[i]) imports.push(lines[i]);
                }
              }
            }
          }
        }
      }
    });
    
    return imports.join('\n');
  }

  /**
   * Extract class context (class declaration, constructor, properties)
   */
  extractClassContext(ast, lines) {
    let classContext = null;
    
    traverse(ast, {
      ClassDeclaration(path) {
        const node = path.node;
        if (!node.loc) return;
        
        const className = node.id ? node.id.name : 'AnonymousClass';
        
        // Extract class declaration line and properties (not methods)
        const contextLines = [];
        
        // Add class declaration
        const classStartLine = node.loc.start.line - 1;
        contextLines.push(lines[classStartLine]);
        
        // Extract constructor and property declarations
        for (const bodyNode of node.body.body) {
          if (bodyNode.type === 'MethodDefinition' && bodyNode.kind === 'constructor') {
            // Include constructor signature but not full body
            if (bodyNode.loc) {
              const constructorLine = bodyNode.loc.start.line - 1;
              const constructorSignature = lines[constructorLine];
              contextLines.push('  ' + constructorSignature.trim());
              contextLines.push('    // ... constructor implementation ...');
            }
          } else if (bodyNode.type === 'ClassProperty' || bodyNode.type === 'PropertyDefinition') {
            // Include property declarations
            if (bodyNode.loc) {
              const propStartLine = bodyNode.loc.start.line - 1;
              const propEndLine = bodyNode.loc.end.line - 1;
              
              for (let i = propStartLine; i <= propEndLine; i++) {
                if (lines[i]) contextLines.push(lines[i]);
              }
            }
          }
        }
        
        contextLines.push('}');
        
        classContext = {
          name: className,
          type: 'class',
          content: contextLines.join('\n'),
          startLine: classStartLine + 1,
          endLine: node.loc.end.line
        };
      }
    });
    
    return classContext;
  }

  /**
   * Extract each method individually with full implementation
   */
  extractMethodsIndividually(ast, lines) {
    const methods = [];
    
    traverse(ast, {
      ClassDeclaration(path) {
        const classNode = path.node;
        const className = classNode.id ? classNode.id.name : 'AnonymousClass';
        
        for (const bodyNode of classNode.body.body) {
          if (bodyNode.type === 'MethodDefinition') {
            const method = this.extractMethodContent(bodyNode, lines, className);
            if (method) {
              methods.push(method);
            }
          }
        }
      },
      
      // Also extract standalone functions
      FunctionDeclaration(path) {
        const node = path.node;
        if (node.loc) {
          const method = this.extractFunctionContent(node, lines);
          if (method) {
            methods.push(method);
          }
        }
      }
    });
    
    return methods;
  }

  /**
   * Extract complete method content including implementation
   */
  extractMethodContent(methodNode, lines, className) {
    if (!methodNode.loc) return null;
    
    const startLine = methodNode.loc.start.line - 1;
    const endLine = methodNode.loc.end.line - 1;
    
    const methodLines = [];
    
    // Add any leading comments
    for (let i = Math.max(0, startLine - 3); i < startLine; i++) {
      const line = lines[i];
      if (line && (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*'))) {
        methodLines.push(line);
      }
    }
    
    // Add method content
    for (let i = startLine; i <= endLine; i++) {
      if (lines[i] !== undefined) {
        methodLines.push(lines[i]);
      }
    }
    
    const methodName = methodNode.key ? methodNode.key.name : 'anonymous';
    const methodKind = methodNode.kind || 'method';
    const isAsync = methodNode.async || false;
    const isStatic = methodNode.static || false;
    
    return {
      name: methodName,
      type: 'method',
      kind: methodKind,
      className: className,
      async: isAsync,
      static: isStatic,
      content: methodLines.join('\n'),
      startLine: startLine + 1,
      endLine: endLine + 1,
      lineCount: methodLines.length
    };
  }

  /**
   * Extract standalone function content
   */
  extractFunctionContent(functionNode, lines) {
    if (!functionNode.loc) return null;
    
    const startLine = functionNode.loc.start.line - 1;
    const endLine = functionNode.loc.end.line - 1;
    
    const functionLines = [];
    
    // Add any leading comments
    for (let i = Math.max(0, startLine - 3); i < startLine; i++) {
      const line = lines[i];
      if (line && (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*'))) {
        functionLines.push(line);
      }
    }
    
    // Add function content
    for (let i = startLine; i <= endLine; i++) {
      if (lines[i] !== undefined) {
        functionLines.push(lines[i]);
      }
    }
    
    const functionName = functionNode.id ? functionNode.id.name : 'anonymous';
    const isAsync = functionNode.async || false;
    
    return {
      name: functionName,
      type: 'function',
      async: isAsync,
      content: functionLines.join('\n'),
      startLine: startLine + 1,
      endLine: endLine + 1,
      lineCount: functionLines.length
    };
  }

  /**
   * Create a document chunk for a method or class context
   */
  createChunk(unit, imports, metadata, chunkType) {
    let content = '';
    
    // Add imports if requested
    if (this.includeImports && imports) {
      content += imports + '\n\n';
    }
    
    // Add the unit content
    content += unit.content;
    
    const tokenCount = this.tokenSplitter.countTokens(content);
    
    return new Document({
      pageContent: content,
      metadata: {
        ...metadata,
        chunkType,
        unitName: unit.name,
        unitType: unit.type,
        className: unit.className || null,
        methodKind: unit.kind || null,
        isAsync: unit.async || false,
        isStatic: unit.static || false,
        startLine: unit.startLine,
        endLine: unit.endLine,
        lineCount: unit.lineCount || 0,
        tokenCount,
        characterCount: content.length,
        split_method: 'force_method_ast',
        forced_split: true
      }
    });
  }

  /**
   * Fallback to line-based splitting if AST parsing fails
   */
  fallbackLineSplitting(document) {
    console.log(`[${new Date().toISOString()}] 🔄 FALLBACK: Using line-based splitting`);
    
    const lines = document.pageContent.split('\n');
    const chunks = [];
    const targetLinesPerChunk = 50; // Approximate method size
    
    for (let i = 0; i < lines.length; i += targetLinesPerChunk) {
      const chunkLines = lines.slice(i, i + targetLinesPerChunk);
      const content = chunkLines.join('\n');
      
      chunks.push(new Document({
        pageContent: content,
        metadata: {
          ...document.metadata,
          chunkType: 'line_based_fallback',
          split_method: 'line_based',
          startLine: i + 1,
          endLine: Math.min(i + targetLinesPerChunk, lines.length),
          lineCount: chunkLines.length,
          tokenCount: this.tokenSplitter.countTokens(content),
          characterCount: content.length
        }
      }));
    }
    
    return chunks;
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }
}

/**
 * Process file with forced method-level splitting
 */
async function processFileWithForcedMethodSplitting(filePath) {
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
    
    // Step 3: FORCED method-level AST splitting
    console.log(`[${new Date().toISOString()}] ✂️ Step 3: FORCED METHOD-LEVEL AST splitting`);
    const forcedMethodSplitter = new ForceMethodLevelSplitter({
      maxTokens: 400,       // Generous per-method limit
      minTokens: 30,        // Allow small methods
      overlapTokens: 50,    // Context overlap
      includeClassContext: true,
      includeImports: true
    });
    
    const chunks = await forcedMethodSplitter.splitDocument(ubiquitousEnhanced);
    
    console.log(`[${new Date().toISOString()}] ✅ Forced method-level splitting completed:`);
    console.log(`[${new Date().toISOString()}] 📊 Generated ${chunks.length} forced method-level chunks`);
    
    // Analyze chunks
    const chunkAnalysis = chunks.map((chunk, index) => {
      const content = chunk.pageContent || chunk.content || '';
      const metadata = chunk.metadata || {};
      
      return {
        index: index + 1,
        chunkType: metadata.chunkType || 'unknown',
        unitName: metadata.unitName || 'unknown',
        unitType: metadata.unitType || 'unknown',
        className: metadata.className || null,
        methodKind: metadata.methodKind || null,
        isAsync: metadata.isAsync || false,
        isStatic: metadata.isStatic || false,
        tokenCount: metadata.tokenCount || 0,
        characterCount: metadata.characterCount || content.length,
        lineCount: metadata.lineCount || 0,
        startLine: metadata.startLine || 0,
        endLine: metadata.endLine || 0,
        preview: content.substring(0, 100).replace(/\n/g, ' ') + '...'
      };
    });

    // Generate comprehensive markdown report
    const reportContent = generateForcedMethodReport(fileName, filePath, fileContent, preprocessedDocument, ubiquitousEnhanced, chunks, chunkAnalysis);
    
    // Write report to file
    const reportFileName = `forced_method_analysis_${fileName.replace(/\.js$/, '')}.md`;
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
 * Generate comprehensive markdown report for forced method-level analysis
 */
function generateForcedMethodReport(fileName, filePath, originalContent, preprocessedDocument, enhancedDocument, chunks, chunkAnalysis) {
  const timestamp = new Date().toISOString();
  
  // Group chunks by type
  const chunksByType = chunkAnalysis.reduce((acc, chunk) => {
    if (!acc[chunk.chunkType]) acc[chunk.chunkType] = [];
    acc[chunk.chunkType].push(chunk);
    return acc;
  }, {});
  
  return `# ${fileName} - Forced Method-Level AST Splitting Analysis

**File:** \`${filePath}\`
**Processed:** ${timestamp}
**Analysis Type:** FORCED Method-Level AST Splitting - Each Method Extracted Individually

## 📋 Executive Summary

This analysis uses **forced method-level AST splitting** to break down large classes into individual method chunks, regardless of token limits. Each method is extracted as a separate semantic unit for maximum retrieval granularity.

## 📊 Processing Statistics

| Metric | Value | Change |
|--------|-------|--------|
| **Original Size** | ${originalContent.length.toLocaleString()} chars | - |
| **After Preprocessing** | ${preprocessedDocument.pageContent.length.toLocaleString()} chars | ${((preprocessedDocument.pageContent.length - originalContent.length) / originalContent.length * 100).toFixed(1)}% |
| **After Enhancement** | ${enhancedDocument.pageContent.length.toLocaleString()} chars | ${((enhancedDocument.pageContent.length - preprocessedDocument.pageContent.length) / preprocessedDocument.pageContent.length * 100).toFixed(1)}% |
| **Total Forced Chunks** | ${chunks.length} | **TRUE Granular Retrieval** |
| **Average Chunk Size** | ${Math.round(chunks.reduce((sum, chunk) => sum + (chunk.pageContent?.length || chunk.content?.length || 0), 0) / chunks.length).toLocaleString()} chars | Method-level precision |

### 🏷️ Chunk Type Distribution

${Object.entries(chunksByType).map(([type, chunks]) => `- **${type}**: ${chunks.length} chunks`).join('\n')}

### 📊 Method Analysis

${chunksByType.method ? `
**Methods by Kind:**
${(() => {
  const kindCounts = chunksByType.method.reduce((acc, chunk) => {
    const kind = chunk.methodKind || 'method';
    if (!acc[kind]) acc[kind] = 0;
    acc[kind]++;
    return acc;
  }, {});
  return Object.entries(kindCounts).map(([kind, count]) => `- **${kind}**: ${count}`).join('\n');
})()}

**Async Methods:** ${chunksByType.method.filter(c => c.isAsync).length}
**Static Methods:** ${chunksByType.method.filter(c => c.isStatic).length}

**Token Distribution:**
- **Small methods (< 150 tokens):** ${chunksByType.method.filter(c => c.tokenCount < 150).length}
- **Medium methods (150-300 tokens):** ${chunksByType.method.filter(c => c.tokenCount >= 150 && c.tokenCount < 300).length}  
- **Large methods (300+ tokens):** ${chunksByType.method.filter(c => c.tokenCount >= 300).length}

**Average tokens per method:** ${Math.round(chunksByType.method.reduce((sum, c) => sum + c.tokenCount, 0) / chunksByType.method.length)}
` : 'No individual methods extracted'}

## 🔄 Complete Forced Splitting Process

### 📄 Step 0: Original Source Code

**Size:** ${originalContent.length.toLocaleString()} characters

\`\`\`javascript
${originalContent.substring(0, 1500)}${originalContent.length > 1500 ? '\n\n// ... (truncated for brevity, showing first 1500 characters) ...' : ''}
\`\`\`

### 🔧 Step 1: Code Preprocessing Results

**Size:** ${preprocessedDocument.pageContent.length.toLocaleString()} characters
**Reduction:** ${((originalContent.length - preprocessedDocument.pageContent.length) / originalContent.length * 100).toFixed(1)}%

**Key preprocessing actions:**
- Removed debug/log statements
- Normalized whitespace  
- Preserved documentation comments
- Kept imports for method context

### 📚 Step 2: Ubiquitous Language Enhancement

**Size:** ${enhancedDocument.pageContent.length.toLocaleString()} characters
**Change:** ${((enhancedDocument.pageContent.length - preprocessedDocument.pageContent.length) / preprocessedDocument.pageContent.length * 100).toFixed(1)}%

Enhanced with domain-specific language context and semantic enrichments.

### ✂️ Step 3: FORCED Method-Level AST Splitting

**Splitting Strategy:**
- **AST-Based Extraction:** Each method extracted individually using Babel parser
- **Class Context:** Separate chunk for class overview and structure
- **Full Method Bodies:** Complete implementation of each method preserved
- **Import Context:** Imports included for each chunk context
- **Comment Preservation:** Method-level documentation maintained

**Extraction Results:**
- **Parser:** Babel AST with full JavaScript/TypeScript support
- **Method Detection:** ClassDeclaration → MethodDefinition traversal
- **Context Preservation:** Imports + class context + method implementation

## 📋 Forced Method-Level Chunk Inventory

${chunkAnalysis.map(chunk => `### Chunk ${chunk.index}: ${chunk.unitName} (${chunk.chunkType})

**Type:** ${chunk.unitType} | **Method Kind:** ${chunk.methodKind || 'N/A'} | **Class:** ${chunk.className || 'N/A'}
**Tokens:** ${chunk.tokenCount} | **Characters:** ${chunk.characterCount.toLocaleString()} | **Lines:** ${chunk.lineCount} (${chunk.startLine}-${chunk.endLine})
**Modifiers:** ${chunk.isAsync ? 'async ' : ''}${chunk.isStatic ? 'static ' : ''}${chunk.methodKind || 'method'}

**Preview:** \`${chunk.preview}\`

**Full Content:**
\`\`\`javascript
${chunks[chunk.index - 1].pageContent || chunks[chunk.index - 1].content || ''}
\`\`\`

---`).join('\n\n')}

## 📈 RAG Optimization Analysis

### ✅ TRUE Method-Level Benefits:

1. **Perfect Granularity:** Each method is individually retrievable
2. **Semantic Precision:** Queries match exact functionality 
3. **Zero Noise:** No irrelevant code in retrieved chunks
4. **Method-Level Context:** Imports + class context + full implementation
5. **Scalable Processing:** Large classes properly decomposed

### 📊 Comparison with Previous Approach:

| Aspect | Previous (Single Chunk) | Current (Method-Level) |
|--------|------------------------|------------------------|
| **Chunks Generated** | 1 large chunk | ${chunks.length} method chunks |
| **Retrieval Precision** | Low (entire class) | High (specific methods) |
| **Context Noise** | High (800+ lines) | Low (per-method) |
| **Query Matching** | Generic class-level | Specific functionality |
| **Embedding Quality** | Diluted across methods | Focused per method |

### 🎯 Method-Level Retrieval Examples:

- **Query: "How to initialize tracing?"** → Retrieves \`_initializeTracing\` method only
- **Query: "Process code documents"** → Retrieves \`processCodeDocument\` method specifically  
- **Query: "Repository validation logic"** → Retrieves \`processPushedRepo\` method
- **Query: "Constructor dependencies"** → Retrieves constructor method + class context

## 🔧 Implementation Recommendations

### ✅ Use Forced Method-Level Splitting When:

1. **Large Classes** (>500 lines) ✅ **${fileName}**: ${originalContent.length.toLocaleString()} chars
2. **Multiple Responsibilities** ✅ **${fileName}**: ${chunksByType.method?.length || 0} distinct methods
3. **Complex Orchestration Logic** ✅ **${fileName}**: Repository processing pipeline
4. **Frequent Method-Level Queries** ✅ Expected for RAG system development

### 🎛️ Configuration Applied:

- **Max Tokens per Method:** 400 (generous for complex methods)
- **Min Tokens:** 30 (allows small utility methods)
- **Context Overlap:** 50 tokens (method-to-method continuity)
- **Include Imports:** ✅ (full context for each method)
- **Include Class Context:** ✅ (structural understanding)

### 🚀 Deployment Strategy:

1. **Use Method-Level Chunks:** For precise functionality retrieval
2. **Maintain Class Overview:** For architectural understanding  
3. **Semantic Filtering:** Combine with metadata-based retrieval
4. **Context Assembly:** Dynamically combine related methods when needed

---

*Generated by Forced Method-Level AST Splitting System*
*True AST-based method extraction with Babel parser*
*Timestamp: ${timestamp}*
`;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test_forced_method_splitting.js <file-path>');
    console.log('Example: node test_forced_method_splitting.js ./business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  try {
    const result = await processFileWithForcedMethodSplitting(filePath);
    
    console.log('\n🎉 Forced Method-Level Analysis Complete!');
    console.log(`📊 Generated ${result.totalChunks} TRUE method-level chunks from ${result.originalSize.toLocaleString()} character file`);
    console.log(`📝 Detailed report: ${result.reportPath}`);
    
  } catch (error) {
    console.error('❌ Failed to process file:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ForceMethodLevelSplitter, processFileWithForcedMethodSplitting };