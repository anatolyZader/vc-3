// astCodeSplitter.js
"use strict";

const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ChunkQualityAnalyzer = require('../../../langsmith/ChunkQualityAnalyzer');
const { Document } = require('langchain/document');
const TokenBasedSplitter = require('../processors/tokenBasedSplitter');

/**
 * AST-Based Code Splitter with Chunk Quality Analysis
 * Enhanced semantic code chunking with LangSmith integration
 */
class ASTCodeSplitter {
  constructor(options = {}) {
    // Initialize token splitter first for accurate measurements
    this.tokenSplitter = options.tokenSplitter || new TokenBasedSplitter({
      maxTokens: options.maxTokens || 1200,        // Optimal for code embeddings
      minTokens: options.minTokens || 150,         // Minimum meaningful code size
      overlapTokens: options.overlapTokens || 200  // More overlap for code context
    });
    
    // Legacy character-based options (converted to tokens when needed)
    this.maxChunkSize = options.maxChunkSize || (this.tokenSplitter.maxTokens * 3.5); // For backward compatibility
    this.minChunkSize = options.minChunkSize || (this.tokenSplitter.minTokens * 3.5);
    this.chunkOverlap = options.chunkOverlap || (this.tokenSplitter.overlapTokens * 3.5);
    
    this.includeImportsInContext = options.includeImportsInContext !== false;
    this.mergeSmallChunks = options.mergeSmallChunks !== false;
    this.semanticCoherence = options.semanticCoherence !== false;
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
    
    this.qualityAnalyzer = new ChunkQualityAnalyzer({
      minChunkSize: this.minChunkSize,
      maxChunkSize: this.maxChunkSize,
      tokenSplitter: this.tokenSplitter  // Pass token splitter for accurate analysis
    });

    console.log(`[${new Date().toISOString()}] 🚀 ENHANCED AST SPLITTER: Initialized with TOKEN-BASED chunking`);
    console.log(`[${new Date().toISOString()}] 🎯 TOKEN LIMITS: ${this.tokenSplitter.maxTokens}/${this.tokenSplitter.minTokens} tokens`);
  }

  /**
   * Split document with enhanced quality analysis
   */
  async splitDocument(document) {
    // 🔧 FIX: Normalize pageContent vs content mismatch
    const pageContent = document.pageContent ?? document.content ?? "";
    const metadata = document.metadata || {};
    
    console.log(`[${new Date().toISOString()}] 📄 ENHANCED SPLITTING: Processing ${metadata?.source}`);

    try {
      // Create normalized document object for internal processing
      const normalizedDocument = { pageContent, metadata };
      
      // First pass: Create initial chunks
      const initialChunks = await this.createInitialChunks(normalizedDocument);
      
      // Second pass: Quality analysis and optimization
      const optimizedChunks = await this.optimizeChunks(initialChunks, normalizedDocument);
      
      // Third pass: Final validation and metadata enrichment
      const finalChunks = await this.enrichChunksWithMetadata(optimizedChunks, normalizedDocument);

      console.log(`[${new Date().toISOString()}] ✅ ENHANCED SPLITTING: ${metadata?.source} → ${finalChunks.length} optimized chunks`);
      return finalChunks;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ ENHANCED SPLITTING: Fallback for ${metadata?.source}:`, error.message);
      return this.fallbackSplit({ pageContent, metadata });
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
            
            // Extract methods separately if class is too large (token-based check)
            const classTokens = this.tokenSplitter.countTokens(classUnit.content);
            if (classTokens > this.tokenSplitter.maxTokens) {
              console.log(`[${new Date().toISOString()}] 🔍 CLASS TOO LARGE: ${classUnit.name} (${classTokens} tokens > ${this.tokenSplitter.maxTokens})`);
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
   * Check if content exceeds token limits (more accurate than character count)
   */
  exceedsTokenLimit(content) {
    return this.tokenSplitter.exceedsTokenLimit(content);
  }

  /**
   * Check if content is below minimum token threshold
   */
  belowMinimumTokens(content) {
    return this.tokenSplitter.belowMinimumTokens(content);
  }

  /**
   * Create enhanced class unit with token-based size analysis
   */
  createClassUnit(node, lines, originalCode, imports) {
    const unit = this.createSemanticUnit(node, lines, 'class', originalCode);
    if (!unit) return null;

    // Use token-based size check instead of character count
    const tokenAnalysis = this.tokenSplitter.analyzeChunk(unit.content);

    return {
      ...unit,
      tokenCount: tokenAnalysis.tokenCount,
      tokenAnalysis: tokenAnalysis,
      contextualImports: this.getRelevantImports(imports, unit.content),
      methods: this.getMethodNames(node),
      hasConstructor: this.hasConstructor(node),
      extendsClass: node.superClass?.name || null,
      isExported: false // Will be determined by parent export
    };
  }

  /**
   * Create enhanced function unit with token-based context
   */
  createFunctionUnit(node, lines, originalCode, imports) {
    const unit = this.createSemanticUnit(node, lines, 'function', originalCode);
    if (!unit) return null;

    // Use token-based size analysis
    const tokenAnalysis = this.tokenSplitter.analyzeChunk(unit.content);

    return {
      ...unit,
      tokenCount: tokenAnalysis.tokenCount,
      tokenAnalysis: tokenAnalysis,
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
   * Merge small chunks with adjacent chunks (token-based decisions)
   */
  mergeSmallChunks(chunks) {
    const merged = [];
    let currentMerged = null;

    for (const chunk of chunks) {
      const content = chunk.pageContent || chunk.content || '';
      const tokenAnalysis = this.tokenSplitter.analyzeChunk(content);
      
      if (tokenAnalysis.tooSmall) {
        if (currentMerged) {
          // Check if merging would exceed token limits
          const combinedContent = currentMerged.pageContent + '\n\n' + content;
          const combinedAnalysis = this.tokenSplitter.analyzeChunk(combinedContent);
          
          if (!combinedAnalysis.tooLarge) {
            // Safe to merge
            currentMerged = this.mergeChunks(currentMerged, chunk);
          } else {
            // Can't merge, finalize current and start new
            merged.push(currentMerged);
            currentMerged = chunk;
          }
        } else {
          // Start merging process
          currentMerged = chunk;
        }
      } else {
        // Finalize current merge if exists
        if (currentMerged) {
          if (currentMerged !== chunk) {
            // Try to merge with this chunk
            const combinedContent = currentMerged.pageContent + '\n\n' + content;
            const combinedAnalysis = this.tokenSplitter.analyzeChunk(combinedContent);
            
            if (!combinedAnalysis.tooLarge) {
              merged.push(this.mergeChunks(currentMerged, chunk));
            } else {
              merged.push(currentMerged);
              merged.push(chunk);
            }
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

    console.log(`[${new Date().toISOString()}] 🔧 TOKEN-BASED MERGE: ${chunks.length} → ${merged.length} chunks`);
    return merged;
  }

  /**
   * Split chunks that are too large (token-based)
   */
  async splitLargeChunks(chunks) {
    const split = [];
    
    for (const chunk of chunks) {
      const content = chunk.pageContent || chunk.content || '';
      const tokenAnalysis = this.tokenSplitter.analyzeChunk(content);
      
      if (tokenAnalysis.tooLarge) {
        console.log(`[${new Date().toISOString()}] 🔪 TOKEN SPLIT: Chunk has ${tokenAnalysis.tokenCount} tokens (max: ${this.tokenSplitter.maxTokens})`);
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
        const endLine = path.node.loc.end.line - 1;
        // Collect all lines from start to end for multi-line imports
        const importLines = lines.slice(startLine, endLine + 1);
        imports.push(importLines.join('\n'));
      },
      CallExpression: (path) => {
        if (path.node.callee.name === 'require') {
          const startLine = path.node.loc.start.line - 1;
          const endLine = path.node.loc.end.line - 1;
          // Collect all lines for multi-line require statements
          const requireLines = lines.slice(startLine, endLine + 1);
          imports.push(requireLines.join('\n'));
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
    // Ensure consistent pageContent format
    const pageContent = document.pageContent ?? document.content ?? "";
    return [{
      pageContent,
      metadata: {
        ...document.metadata,
        splitting_method: 'fallback_standard',
        enhanced_chunking: false
      }
    }];
  }

  async splitLargeChunk(chunk) {
    const content = chunk.pageContent || chunk.content || '';
    const tokenAnalysis = this.tokenSplitter.analyzeChunk(content);
    
    console.log(`[${new Date().toISOString()}] 🔪 SEMANTIC SPLITTING: Large chunk (${tokenAnalysis.tokenCount} tokens, ${content.length} chars) - attempting semantic-aware split`);

    try {
      // First attempt: Re-parse and split by semantic units
      const semanticSplits = await this.splitBySemanticUnits(content, chunk.metadata);
      if (semanticSplits && semanticSplits.length > 1) {
        console.log(`[${new Date().toISOString()}] ✅ SEMANTIC SPLIT: Successfully split into ${semanticSplits.length} semantic units`);
        return semanticSplits;
      }

      // Second attempt: Split by AST-aware boundaries (functions, classes, blocks)
      const astAwareSplits = await this.splitByASTBoundaries(content, chunk.metadata);
      if (astAwareSplits && astAwareSplits.length > 1) {
        console.log(`[${new Date().toISOString()}] ✅ AST BOUNDARY SPLIT: Successfully split into ${astAwareSplits.length} AST-aware chunks`);
        return astAwareSplits;
      }

      // Third attempt: Smart line-based splitting (avoid breaking code blocks)
      const smartLineSplits = await this.splitBySmartLineBoundaries(content, chunk.metadata);
      if (smartLineSplits && smartLineSplits.length > 1) {
        console.log(`[${new Date().toISOString()}] ✅ SMART LINE SPLIT: Successfully split into ${smartLineSplits.length} logical chunks`);
        return smartLineSplits;
      }

      // Last resort: Token windows with overlap (preserves some context)
      console.log(`[${new Date().toISOString()}] ⚠️ FALLBACK SPLIT: Using token-based windows with overlap as last resort`);
      return await this.splitByTokenWindows(content, chunk.metadata);

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ❌ SEMANTIC SPLITTING ERROR: ${error.message}, falling back to token windows`);
      return await this.splitByTokenWindows(content, chunk.metadata);
    }
  }

  /**
   * Split by re-analyzing semantic units within the large chunk
   */
  async splitBySemanticUnits(content, metadata) {
    try {
      const fileExtension = this.getFileExtension(metadata.source || '');
      if (!this.supportedExtensions.includes(fileExtension)) {
        return null; // Not a code file, can't use AST
      }

      const ast = this.parseCode(content, fileExtension);
      const semanticUnits = this.extractSemanticUnits(ast, content, metadata);

      if (semanticUnits.length <= 1) {
        return null; // Can't split semantically
      }

      // Group semantic units into chunks that fit within size limits
      const semanticChunks = [];
      let currentChunk = null;

      for (const unit of semanticUnits) {
        if (!currentChunk) {
          currentChunk = unit;
        } else if (currentChunk.size + unit.size <= this.maxChunkSize) {
          // Merge units if they fit together
          currentChunk = this.mergeUnits(currentChunk, unit);
        } else {
          // Finalize current chunk and start new one
          semanticChunks.push(this.createChunkFromUnit(currentChunk, metadata));
          currentChunk = unit;
        }
      }

      // Add final chunk
      if (currentChunk) {
        semanticChunks.push(this.createChunkFromUnit(currentChunk, metadata));
      }

      return semanticChunks.length > 1 ? semanticChunks : null;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ SEMANTIC UNIT SPLIT FAILED: ${error.message}`);
      return null;
    }
  }

  /**
   * Split by AST-aware boundaries (functions, classes, blocks)
   */
  async splitByASTBoundaries(content, metadata) {
    try {
      const fileExtension = this.getFileExtension(metadata.source || '');
      if (!this.supportedExtensions.includes(fileExtension)) {
        return null; // Not a code file
      }

      const ast = this.parseCode(content, fileExtension);
      const lines = content.split('\n');
      const splitPoints = [];

      // Find natural split points between top-level declarations
      traverse(ast, {
        Program(path) {
          const body = path.node.body;
          for (let i = 1; i < body.length; i++) {
            const prevNode = body[i - 1];
            const currentNode = body[i];
            
            if (prevNode.loc && currentNode.loc) {
              const splitLine = prevNode.loc.end.line;
              splitPoints.push(splitLine);
            }
          }
        }
      });

      if (splitPoints.length === 0) {
        return null; // No good split points found
      }

      // Find the best split point (closest to middle)
      const targetLine = Math.floor(lines.length / 2);
      const bestSplitLine = splitPoints.reduce((closest, current) => 
        Math.abs(current - targetLine) < Math.abs(closest - targetLine) ? current : closest
      );

      const chunks = [
        {
          pageContent: lines.slice(0, bestSplitLine).join('\n'),
          metadata: {
            ...metadata,
            split_method: 'ast_boundary',
            split_part: 1,
            split_total: 2,
            split_line: bestSplitLine
          }
        },
        {
          pageContent: lines.slice(bestSplitLine).join('\n'),
          metadata: {
            ...metadata,
            split_method: 'ast_boundary',
            split_part: 2,
            split_total: 2,
            split_line: bestSplitLine
          }
        }
      ];

      return chunks;

    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ AST BOUNDARY SPLIT FAILED: ${error.message}`);
      return null;
    }
  }

  /**
   * Split by smart line boundaries (avoid breaking code blocks)
   */
  async splitBySmartLineBoundaries(content, metadata) {
    const lines = content.split('\n');
    const targetSize = Math.floor(this.maxChunkSize / 2); // Aim for half max size per chunk
    
    // Find good split points (empty lines, comment blocks, logical separators)
    const goodSplitLines = [];
    let currentSize = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentSize += line.length + 1; // +1 for newline
      
      // Look for good split opportunities
      if (currentSize >= targetSize && this.isGoodSplitLine(line, lines, i)) {
        goodSplitLines.push(i + 1); // Split after this line
        currentSize = 0;
      }
    }

    if (goodSplitLines.length === 0) {
      return null; // No good split points found
    }

    // Create chunks based on split points
    const chunks = [];
    let startLine = 0;

    for (const splitLine of goodSplitLines) {
      if (startLine < splitLine) {
        chunks.push({
          pageContent: lines.slice(startLine, splitLine).join('\n'),
          metadata: {
            ...metadata,
            split_method: 'smart_line_boundary',
            split_part: chunks.length + 1,
            split_lines: `${startLine}-${splitLine}`
          }
        });
        startLine = splitLine;
      }
    }

    // Add final chunk if there are remaining lines
    if (startLine < lines.length) {
      chunks.push({
        pageContent: lines.slice(startLine).join('\n'),
        metadata: {
          ...metadata,
          split_method: 'smart_line_boundary',
          split_part: chunks.length + 1,
          split_lines: `${startLine}-${lines.length}`
        }
      });
    }

    // Update split_total for all chunks
    chunks.forEach(chunk => {
      chunk.metadata.split_total = chunks.length;
    });

    return chunks.length > 1 ? chunks : null;
  }

  /**
   * Last resort: Token-based splitting with overlap
   */
  async splitByTokenWindows(content, metadata) {
    console.log(`[${new Date().toISOString()}] 🎯 TOKEN WINDOWS: Using accurate token-based splitting`);
    
    try {
      // Use TokenBasedSplitter for accurate token measurements
      const tokenChunks = this.tokenSplitter.splitByTokenBoundaries(content, [
        '\nclass ',      // Preserve class boundaries
        '\nfunction ',   // Preserve function boundaries  
        '\nconst ',      // Preserve const declarations
        '\nlet ',        // Preserve let declarations
        '\nvar ',        // Preserve var declarations
        '\n\n',         // Paragraph breaks
        '\n',           // Line breaks
        ' ',            // Word breaks
        ''              // Character breaks (last resort)
      ]);
      
      const chunks = tokenChunks.map((tokenChunk, index) => ({
        pageContent: tokenChunk.text,
        metadata: {
          ...metadata,
          split_method: 'token_windows_with_overlap',
          split_part: index + 1,
          split_total: tokenChunks.length,
          token_count: tokenChunk.tokens,
          character_count: tokenChunk.characters,
          has_overlap: true,
          overlap_tokens: this.tokenSplitter.overlapTokens,
          token_efficiency: `${(tokenChunk.tokens / this.tokenSplitter.maxTokens * 100).toFixed(1)}%`
        }
      }));

      console.log(`[${new Date().toISOString()}] ✅ TOKEN WINDOWS: Created ${chunks.length} token-optimized chunks`);
      return chunks;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ TOKEN WINDOW SPLIT FAILED: ${error.message}`);
      
      // Ultimate fallback: Use RecursiveCharacterTextSplitter with token-based estimates
      const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
      
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.tokenSplitter.maxTokens * 3.5, // Approximate conversion
        chunkOverlap: this.tokenSplitter.overlapTokens * 3.5,
        separators: [
          '\nclass ',      // Preserve class boundaries
          '\nfunction ',   // Preserve function boundaries  
          '\nconst ',      // Preserve const declarations
          '\nlet ',        // Preserve let declarations
          '\nvar ',        // Preserve var declarations
          '\n\n',         // Paragraph breaks
          '\n',           // Line breaks
          ' ',            // Word breaks
          ''              // Character breaks (last resort)
        ],
        keepSeparator: true
      });

      const fakeDoc = { pageContent: content, metadata };
      const chunks = await splitter.splitDocuments([fakeDoc]);
      
      return chunks.map((chunk, index) => ({
        ...chunk,
        metadata: {
          ...metadata,
          split_method: 'fallback_character_based',
          split_part: index + 1,
          split_total: chunks.length,
          estimated_tokens: this.tokenSplitter.countTokens(chunk.pageContent),
          warning: 'Fallback to character-based splitting - token accuracy not guaranteed'
        }
      }));
    }
  }

  /**
   * Determine if a line is a good place to split
   */
  isGoodSplitLine(line, lines, index) {
    const trimmed = line.trim();
    
    // Empty lines are good split points
    if (trimmed === '') return true;
    
    // Comment blocks are good split points
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return true;
    
    // End of blocks (closing braces with nothing else)
    if (/^[\s}]*$/.test(line)) return true;
    
    // Before new top-level declarations
    if (index < lines.length - 1) {
      const nextLine = lines[index + 1].trim();
      if (nextLine.startsWith('class ') || 
          nextLine.startsWith('function ') || 
          nextLine.startsWith('const ') ||
          nextLine.startsWith('let ') ||
          nextLine.startsWith('var ') ||
          nextLine.startsWith('export ') ||
          nextLine.startsWith('import ')) {
        return true;
      }
    }
    
    return false;
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

module.exports = ASTCodeSplitter;
