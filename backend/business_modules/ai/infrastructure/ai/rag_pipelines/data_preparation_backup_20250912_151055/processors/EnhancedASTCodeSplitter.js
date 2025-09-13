// EnhancedASTCodeSplitter.js
"use strict";

const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ChunkQualityAnalyzer = require('../analyzers/ChunkQualityAnalyzer');

/**
 * Enhanced AST-Based Code Splitter with Chunk Quality Analysis
 * Addresses issues identified from LangSmith trace analysis
 */
class EnhancedASTCodeSplitter {
  constructor(options = {}) {
    this.maxChunkSize = options.maxChunkSize || 2800; // Optimal for embeddings
    this.minChunkSize = options.minChunkSize || 300;  // Minimum meaningful size
    this.chunkOverlap = options.chunkOverlap || 150;  // Context preservation
    this.includeImportsInContext = options.includeImportsInContext !== false;
    this.mergeSmallChunks = options.mergeSmallChunks !== false;
    this.semanticCoherence = options.semanticCoherence !== false;
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
    
    this.qualityAnalyzer = new ChunkQualityAnalyzer({
      minChunkSize: this.minChunkSize,
      maxChunkSize: this.maxChunkSize
    });

    console.log(`[${new Date().toISOString()}] 🚀 ENHANCED AST SPLITTER: Initialized with quality-driven chunking`);
  }

  /**
   * Split document with enhanced quality analysis
   */
  async splitDocument(document) {
    console.log(`[${new Date().toISOString()}] 📄 ENHANCED SPLITTING: Processing ${document.metadata?.source}`);

    try {
      // First pass: Create initial chunks
      const initialChunks = await this.createInitialChunks(document);
      
      // Second pass: Quality analysis and optimization
      const optimizedChunks = await this.optimizeChunks(initialChunks, document);
      
      // Third pass: Final validation and metadata enrichment
      const finalChunks = await this.enrichChunksWithMetadata(optimizedChunks, document);

      console.log(`[${new Date().toISOString()}] ✅ ENHANCED SPLITTING: ${document.metadata?.source} → ${finalChunks.length} optimized chunks`);
      return finalChunks;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ ENHANCED SPLITTING: Fallback for ${document.metadata?.source}:`, error.message);
      return this.fallbackSplit(document);
    }
  }

  /**
   * Create initial semantic chunks
   */
  async createInitialChunks(document) {
    const { pageContent, metadata } = document;
    const fileExtension = this.getFileExtension(metadata.source || '');

    if (!this.supportedExtensions.includes(fileExtension)) {
      return [document];
    }

    const ast = this.parseCode(pageContent, fileExtension);
    const semanticUnits = this.extractSemanticUnits(ast, pageContent, metadata);
    
    return this.createChunksFromSemanticUnits(semanticUnits, pageContent, metadata);
  }

  /**
   * Extract enhanced semantic units from AST
   */
  extractSemanticUnits(ast, originalCode, metadata) {
    const lines = originalCode.split('\n');
    const semanticUnits = [];
    const imports = this.collectImports(ast, lines);
    
    console.log(`[${new Date().toISOString()}] 🔍 AST ANALYSIS: Found ${imports.length} import statements`);

    traverse(ast, {
      // Enhanced class handling
      ClassDeclaration: (path) => {
        if (this.isTopLevel(path)) {
          const classUnit = this.createClassUnit(path.node, lines, originalCode, imports);
          if (classUnit) {
            semanticUnits.push(classUnit);
            
            // Extract methods separately if class is too large
            if (classUnit.size > this.maxChunkSize) {
              const methods = this.extractClassMethods(path.node, lines, originalCode, classUnit.name);
              semanticUnits.push(...methods);
            }
          }
        }
      },

      // Enhanced function handling
      FunctionDeclaration: (path) => {
        if (this.isTopLevel(path)) {
          const functionUnit = this.createFunctionUnit(path.node, lines, originalCode, imports);
          if (functionUnit) semanticUnits.push(functionUnit);
        }
      },

      // Variable declarations with functions
      VariableDeclaration: (path) => {
        if (this.isTopLevel(path)) {
          for (const declarator of path.node.declarations) {
            if (this.isFunctionDeclarator(declarator)) {
              const functionUnit = this.createVariableFunctionUnit(declarator, path.node, lines, originalCode, imports);
              if (functionUnit) semanticUnits.push(functionUnit);
            }
          }
        }
      },

      // Export declarations
      ExportNamedDeclaration: (path) => {
        if (path.node.declaration) {
          const exportUnit = this.createExportUnit(path.node, lines, originalCode, imports);
          if (exportUnit) semanticUnits.push(exportUnit);
        }
      },

      ExportDefaultDeclaration: (path) => {
        const exportUnit = this.createExportUnit(path.node, lines, originalCode, imports);
        if (exportUnit) semanticUnits.push(exportUnit);
      }
    });

    // Sort by line number for logical order
    semanticUnits.sort((a, b) => a.startLine - b.startLine);
    
    console.log(`[${new Date().toISOString()}] 🔍 AST ANALYSIS: Extracted ${semanticUnits.length} semantic units`);
    return semanticUnits;
  }

  /**
   * Create enhanced class unit with proper context
   */
  createClassUnit(node, lines, originalCode, imports) {
    const unit = this.createSemanticUnit(node, lines, 'class', originalCode);
    if (!unit) return null;

    return {
      ...unit,
      contextualImports: this.getRelevantImports(imports, unit.content),
      methods: this.getMethodNames(node),
      hasConstructor: this.hasConstructor(node),
      extendsClass: node.superClass?.name || null,
      isExported: false // Will be determined by parent export
    };
  }

  /**
   * Create enhanced function unit with context
   */
  createFunctionUnit(node, lines, originalCode, imports) {
    const unit = this.createSemanticUnit(node, lines, 'function', originalCode);
    if (!unit) return null;

    return {
      ...unit,
      contextualImports: this.getRelevantImports(imports, unit.content),
      parameters: this.getParameterNames(node),
      isAsync: node.async || false,
      isGenerator: node.generator || false,
      isExported: false
    };
  }

  /**
   * Create chunks from semantic units with quality optimization
   */
  createChunksFromSemanticUnits(semanticUnits, originalCode, metadata) {
    const chunks = [];
    let currentChunk = null;
    
    for (const unit of semanticUnits) {
      // Check if unit should be merged with current chunk
      if (this.shouldMergeWithCurrent(currentChunk, unit)) {
        currentChunk = this.mergeUnits(currentChunk, unit);
      } else {
        // Finalize current chunk if exists
        if (currentChunk) {
          chunks.push(this.createChunkFromUnit(currentChunk, metadata));
        }
        
        // Start new chunk
        currentChunk = unit;
      }
    }

    // Add final chunk
    if (currentChunk) {
      chunks.push(this.createChunkFromUnit(currentChunk, metadata));
    }

    return chunks;
  }

  /**
   * Optimize chunks based on quality analysis
   */
  async optimizeChunks(chunks, originalDocument) {
    console.log(`[${new Date().toISOString()}] 🔧 CHUNK OPTIMIZATION: Analyzing ${chunks.length} chunks`);

    // Analyze current quality
    const analysis = this.qualityAnalyzer.analyzeTraceChunks(chunks);
    
    // Apply optimizations based on analysis
    let optimizedChunks = [...chunks];

    // Merge small chunks
    if (analysis.sizingIssues.tooSmall.length > 0) {
      optimizedChunks = this.mergeSmallChunks(optimizedChunks);
    }

    // Split large chunks
    if (analysis.sizingIssues.tooLarge.length > 0) {
      optimizedChunks = await this.splitLargeChunks(optimizedChunks);
    }

    // Remove duplicates
    if (analysis.duplicateIssues.totalDuplicates > 0) {
      optimizedChunks = this.removeDuplicates(optimizedChunks);
    }

    // Add missing context
    optimizedChunks = this.addMissingContext(optimizedChunks, originalDocument);

    console.log(`[${new Date().toISOString()}] ✅ OPTIMIZATION COMPLETE: ${chunks.length} → ${optimizedChunks.length} chunks`);
    return optimizedChunks;
  }

  /**
   * Merge small chunks with adjacent chunks
   */
  mergeSmallChunks(chunks) {
    const merged = [];
    let currentMerged = null;

    for (const chunk of chunks) {
      const isSmall = (chunk.pageContent || chunk.content || '').length < this.minChunkSize;
      
      if (isSmall) {
        if (currentMerged) {
          // Merge with previous
          currentMerged = this.mergeChunks(currentMerged, chunk);
        } else {
          // Start merging process
          currentMerged = chunk;
        }
      } else {
        // Finalize current merge if exists
        if (currentMerged) {
          if (currentMerged !== chunk) {
            merged.push(this.mergeChunks(currentMerged, chunk));
            currentMerged = null;
          } else {
            merged.push(currentMerged);
            currentMerged = null;
          }
        } else {
          merged.push(chunk);
        }
      }
    }

    // Add final merged chunk
    if (currentMerged) {
      merged.push(currentMerged);
    }

    console.log(`[${new Date().toISOString()}] 🔧 MERGE: Merged small chunks ${chunks.length} → ${merged.length}`);
    return merged;
  }

  /**
   * Split chunks that are too large
   */
  async splitLargeChunks(chunks) {
    const split = [];
    
    for (const chunk of chunks) {
      const content = chunk.pageContent || chunk.content || '';
      
      if (content.length > this.maxChunkSize) {
        // Split while preserving semantic boundaries
        const subChunks = await this.splitLargeChunk(chunk);
        split.push(...subChunks);
      } else {
        split.push(chunk);
      }
    }

    return split;
  }

  /**
   * Remove duplicate chunks
   */
  removeDuplicates(chunks) {
    const seen = new Set();
    const unique = [];

    for (const chunk of chunks) {
      const content = (chunk.pageContent || chunk.content || '').trim();
      const hash = this.hashContent(content);
      
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(chunk);
      } else {
        console.log(`[${new Date().toISOString()}] 🗑️ DEDUP: Removed duplicate chunk (${content.length} chars)`);
      }
    }

    return unique;
  }

  /**
   * Add missing import context to chunks
   */
  addMissingContext(chunks, originalDocument) {
    const imports = this.extractAllImports(originalDocument.pageContent);
    
    return chunks.map(chunk => {
      const content = chunk.pageContent || chunk.content || '';
      
      if (this.needsImportContext(content) && !this.hasImportContext(content)) {
        const relevantImports = this.getRelevantImports(imports, content);
        
        if (relevantImports.length > 0) {
          const enhancedContent = relevantImports.join('\n') + '\n\n' + content;
          
          return {
            ...chunk,
            pageContent: enhancedContent,
            metadata: {
              ...chunk.metadata,
              enhanced_with_imports: true,
              added_imports: relevantImports.length
            }
          };
        }
      }
      
      return chunk;
    });
  }

  /**
   * Enrich chunks with comprehensive metadata
   */
  async enrichChunksWithMetadata(chunks, originalDocument) {
    return chunks.map((chunk, index) => {
      const content = chunk.pageContent || chunk.content || '';
      
      return {
        ...chunk,
        metadata: {
          ...chunk.metadata,
          ...originalDocument.metadata,
          // Enhanced metadata
          chunk_index: index,
          total_chunks: chunks.length,
          chunk_size: content.length,
          semantic_type: this.detectSemanticType(content),
          function_names: this.extractFunctionNames(content),
          class_names: this.extractClassNames(content),
          has_imports: this.hasImportContext(content),
          has_exports: this.hasExports(content),
          complexity_score: this.calculateComplexity(content),
          splitting_method: 'enhanced_ast',
          quality_optimized: true,
          processing_timestamp: new Date().toISOString()
        }
      };
    });
  }

  /**
   * Helper methods
   */
  shouldMergeWithCurrent(currentChunk, unit) {
    if (!currentChunk) return false;
    
    const combinedSize = (currentChunk.content || '').length + (unit.content || '').length;
    if (combinedSize > this.maxChunkSize) return false;
    
    // Merge if both are small and related
    const currentIsSmall = (currentChunk.content || '').length < this.minChunkSize;
    const unitIsSmall = (unit.content || '').length < this.minChunkSize;
    
    return currentIsSmall || unitIsSmall;
  }

  mergeUnits(unit1, unit2) {
    return {
      ...unit1,
      content: unit1.content + '\n\n' + unit2.content,
      endLine: unit2.endLine,
      size: unit1.size + unit2.size,
      type: unit1.type === unit2.type ? unit1.type : 'merged'
    };
  }

  mergeChunks(chunk1, chunk2) {
    const content1 = chunk1.pageContent || chunk1.content || '';
    const content2 = chunk2.pageContent || chunk2.content || '';
    
    return {
      ...chunk1,
      pageContent: content1 + '\n\n' + content2,
      metadata: {
        ...chunk1.metadata,
        merged_chunks: (chunk1.metadata?.merged_chunks || 1) + (chunk2.metadata?.merged_chunks || 1),
        merge_reason: 'size_optimization'
      }
    };
  }

  detectSemanticType(content) {
    if (/class\s+\w+/.test(content)) return 'class';
    if (/function\s+\w+|const\s+\w+\s*=.*=>/.test(content)) return 'function';
    if (/import\s+|require\s*\(/.test(content)) return 'imports';
    if (/export\s+/.test(content)) return 'exports';
    if (/\/\*\*[\s\S]*?\*\//.test(content)) return 'documentation';
    return 'code_block';
  }

  extractFunctionNames(content) {
    const names = [];
    const patterns = [
      /function\s+(\w+)/g,
      /const\s+(\w+)\s*=.*=>/g,
      /(\w+)\s*:\s*function/g,
      /(\w+)\s*\([^)]*\)\s*{/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && !names.includes(match[1])) {
          names.push(match[1]);
        }
      }
    });
    
    return names;
  }

  extractClassNames(content) {
    const names = [];
    const pattern = /class\s+(\w+)/g;
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      if (!names.includes(match[1])) {
        names.push(match[1]);
      }
    }
    
    return names;
  }

  calculateComplexity(content) {
    let score = 0;
    
    // Count various complexity indicators
    score += (content.match(/if\s*\(/g) || []).length;
    score += (content.match(/for\s*\(/g) || []).length;
    score += (content.match(/while\s*\(/g) || []).length;
    score += (content.match(/switch\s*\(/g) || []).length;
    score += (content.match(/catch\s*\(/g) || []).length;
    score += (content.match(/=>/g) || []).length;
    
    return Math.min(10, score); // Cap at 10
  }

  hasExports(content) {
    return /export\s+/.test(content) || /module\.exports/.test(content);
  }

  hashContent(content) {
    // Simple hash for duplicate detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  needsImportContext(content) {
    return /class\s+\w+|function\s+\w+|const\s+\w+\s*=/.test(content) && 
           !/import\s+|require\s*\(/.test(content);
  }

  hasImportContext(content) {
    return /import\s+|require\s*\(/.test(content);
  }

  getRelevantImports(imports, content) {
    // Simple relevance check - could be enhanced with AST analysis
    return imports.filter(imp => {
      const importedNames = this.extractImportedNames(imp);
      return importedNames.some(name => content.includes(name));
    });
  }

  extractImportedNames(importStatement) {
    const names = [];
    
    // Handle different import patterns
    const patterns = [
      /import\s+(\w+)/g,
      /import\s*{\s*([^}]+)\s*}/g,
      /const\s+(\w+)\s*=\s*require/g,
      /const\s*{\s*([^}]+)\s*}\s*=\s*require/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(importStatement)) !== null) {
        if (match[1]) {
          if (match[1].includes(',')) {
            names.push(...match[1].split(',').map(n => n.trim()));
          } else {
            names.push(match[1].trim());
          }
        }
      }
    });
    
    return names;
  }

  // Include other necessary methods from the original ASTCodeSplitter
  parseCode(code, extension) {
    const plugins = ['jsx', 'typescript', 'decorators-legacy', 'classProperties'];
    if (extension === '.tsx') plugins.push('tsx');
    
    return parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });
  }

  isTopLevel(path) {
    return path.parent && path.parent.type === 'Program';
  }

  isFunctionDeclarator(declarator) {
    return declarator.init && 
           (declarator.init.type === 'ArrowFunctionExpression' || 
            declarator.init.type === 'FunctionExpression');
  }

  getFileExtension(filename) {
    if (!filename) return '';
    return filename.substring(filename.lastIndexOf('.'));
  }

  collectImports(ast, lines) {
    const imports = [];
    
    traverse(ast, {
      ImportDeclaration: (path) => {
        const startLine = path.node.loc.start.line - 1;
        imports.push(lines[startLine]);
      },
      CallExpression: (path) => {
        if (path.node.callee.name === 'require') {
          const startLine = path.node.loc.start.line - 1;
          imports.push(lines[startLine]);
        }
      }
    });
    
    return imports;
  }

  extractAllImports(code) {
    const lines = code.split('\n');
    return lines.filter(line => 
      line.includes('import ') || 
      line.includes('require(') ||
      line.includes('from ')
    );
  }

  createSemanticUnit(node, lines, type, originalCode) {
    if (!node.loc) return null;
    
    const startLine = node.loc.start.line - 1;
    const endLine = node.loc.end.line - 1;
    
    // Include preceding comments
    let adjustedStartLine = startLine;
    for (let i = startLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line === '') {
        adjustedStartLine = i;
      } else {
        break;
      }
    }
    
    const content = lines.slice(adjustedStartLine, endLine + 1).join('\n');
    
    return {
      type,
      name: this.extractName(node),
      startLine: adjustedStartLine + 1,
      endLine: endLine + 1,
      content,
      size: content.length,
      nodeType: node.type
    };
  }

  extractName(node) {
    if (node.id?.name) return node.id.name;
    if (node.key?.name) return node.key.name;
    if (node.declaration?.id?.name) return node.declaration.id.name;
    if (node.declaration?.declarations?.[0]?.id?.name) return node.declaration.declarations[0].id.name;
    return 'anonymous';
  }

  createChunkFromUnit(unit, metadata) {
    return {
      pageContent: unit.content,
      metadata: {
        ...metadata,
        semantic_unit: unit.type,
        function_name: unit.name,
        start_line: unit.startLine,
        end_line: unit.endLine,
        node_type: unit.nodeType
      }
    };
  }

  fallbackSplit(document) {
    console.log(`[${new Date().toISOString()}] 📄 FALLBACK: Using standard splitting`);
    return [document];
  }

  async splitLargeChunk(chunk) {
    // Simple splitting for now - could be enhanced
    const content = chunk.pageContent || chunk.content || '';
    const lines = content.split('\n');
    const midPoint = Math.floor(lines.length / 2);
    
    return [
      {
        ...chunk,
        pageContent: lines.slice(0, midPoint).join('\n'),
        metadata: {
          ...chunk.metadata,
          split_part: 1,
          split_total: 2
        }
      },
      {
        ...chunk,
        pageContent: lines.slice(midPoint).join('\n'),
        metadata: {
          ...chunk.metadata,
          split_part: 2,
          split_total: 2
        }
      }
    ];
  }

  getMethodNames(node) {
    const methods = [];
    if (node.body && node.body.body) {
      node.body.body.forEach(member => {
        if (member.type === 'MethodDefinition' && member.key?.name) {
          methods.push(member.key.name);
        }
      });
    }
    return methods;
  }

  hasConstructor(node) {
    if (node.body && node.body.body) {
      return node.body.body.some(member => 
        member.type === 'MethodDefinition' && member.key?.name === 'constructor'
      );
    }
    return false;
  }

  getParameterNames(node) {
    return node.params?.map(param => param.name || 'unknown') || [];
  }

  createVariableFunctionUnit(declarator, parent, lines, originalCode, imports) {
    return this.createSemanticUnit(parent, lines, 'function', originalCode);
  }

  createExportUnit(node, lines, originalCode, imports) {
    return this.createSemanticUnit(node, lines, 'export', originalCode);
  }

  extractClassMethods(node, lines, originalCode, className) {
    const methods = [];
    
    if (node.body && node.body.body) {
      node.body.body.forEach(member => {
        if (member.type === 'MethodDefinition') {
          const methodUnit = this.createSemanticUnit(member, lines, 'method', originalCode);
          if (methodUnit) {
            methodUnit.parentClass = className;
            methods.push(methodUnit);
          }
        }
      });
    }
    
    return methods;
  }
}

module.exports = EnhancedASTCodeSplitter;
