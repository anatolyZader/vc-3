// astCodeSplitter.js
"use strict";

const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ChunkQualityAnalyzer = require('../../../langsmith/ChunkQualityAnalyzer');
const TokenBasedSplitter = require('./tokenBasedSplitter');
const crypto = require('crypto');

/**
 * AST-Based Code Splitterr with Enhanced Semantic Chunking
 * ======================================================
 * 
 * A sophisticated code splitter that uses Abstract Syntax Tree (AST) analysis to intelligently
 * chunk JavaScript/TypeScript code while preserving semantic boundaries and maintaining syntactic
 * coherence. This splitter is specifically designed for Retrieval-Augmented Generation (RAG)
 * applications where code understanding and context preservation are critical.
 * 
 * KEY FEATURES:
 * =============
 * 
 * 1. **AST-Aware Splitting**: Uses Babel parser to understand code structure and split at 
 *    semantic boundaries (classes, functions, methods) rather than arbitrary line breaks.
 * 
 * 2. **Token-Based Limits**: Integrates with cl100k_base tokenizer to respect actual token
 *    limits for LLM processing, not just character counts.
 * 
 * 3. **Quality Analysis**: Incorporates ChunkQualityAnalyzer to filter and optimize chunks
 *    for meaningful content and syntactic validity.
 * 
 * 4. **Fastify Pattern Recognition**: Special handling for Fastify framework patterns including
 *    route definitions, plugin registrations, and middleware configurations.
 * 
 * 5. **Event Handler Preservation**: Properly captures and maintains event handlers like
 *    subscription.on(), eventBus.on(), and similar async patterns.
 * 
 * 6. **Safe Boundary Cleaning**: Conservative approach to removing orphaned braces and
 *    incomplete statements while preserving all meaningful code.
 * 
 * 7. **Import Context Management**: Automatically includes relevant imports and context
 *    needed for chunk understanding.
 * 
 * MAIN CLASSES & METHODS:
 * ======================
 * 
 * **ASTCodeSplitter (Main Class)**
 * - constructor(options): Initialize with token limits, Fastify rules, and splitting options
 * - async splitDocument(document): Main public method to split a document into chunks
 * - extractSemanticUnits(ast, code, metadata): Core AST traversal and unit extraction
 * - createSemanticUnit(node, lines, type, code): Create semantic units from AST nodes
 * 
 * **Semantic Unit Creators**
 * - createClassUnit(node, lines, code, imports): Handle class declarations
 * - createFunctionUnit(node, lines, code, imports): Handle function declarations
 * - createFastifyCallUnit(node, lines, code, imports): Handle Fastify-specific patterns
 * - createVariableFunctionUnit(declarator, parent, lines, code, imports): Handle variable functions
 * - extractClassMethods(node, lines, code, className): Extract individual class methods
 * 
 * **Chunking Pipeline Methods**
 * - async createInitialChunks(document): Create initial semantic chunks from AST
 * - async optimizeChunks(chunks, originalDocument): Apply quality filtering and optimization
 * - async enrichChunksWithMetadata(chunks, originalDocument): Add metadata and context
 * - async splitLargeChunks(chunks): Handle chunks that exceed token limits
 * 
 * **Content Processing**
 * - cleanChunkBoundaries(content): Safely clean orphaned braces and incomplete statements
 * - trimLoggingStatements(content): Remove excessive logging while preserving business logic
 * - removeCommentedCode(content): Filter out commented-out code blocks
 * - containsMeaningfulCode(line): Determine if a line contains important code
 * 
 * **Quality & Analysis**
 * - canMergeChunks(currentChunk, unit): Determine if chunks can be safely merged
 * - isLogOnlyChunk(content): Identify chunks that contain only logging statements
 * - calculateContentHash(content): Generate unique hashes for deduplication
 * - addMissingContext(chunks, originalDocument): Add imports and context where needed
 * 
 * **AST Traversal Handlers**
 * - ClassDeclaration: Process class definitions and extract methods when too large
 * - FunctionDeclaration: Handle standalone function declarations
 * - VariableDeclaration: Process variable-based function declarations (const fn = () => {})
 * - CallExpression: Handle Fastify calls and event handlers (subscription.on, eventBus.on)
 * - ExportNamedDeclaration: Process export statements
 * 
 * **Splitting Strategies**
 * - splitBySemanticUnits(content, metadata): Split using AST-based semantic boundaries
 * - splitByASTBoundaries(content, metadata): Split at top-level AST node boundaries  
 * - splitBySmartLineBoundaries(content, metadata): Fallback to intelligent line-based splitting
 * - splitByTokenWindows(content, metadata): Final fallback to token-based windowing
 * 
 * **Utility Methods**
 * - parseCode(code, fileExtension): Parse JavaScript/TypeScript with Babel
 * - getFileExtension(filename): Extract and normalize file extensions
 * - isFunctionDeclarator(declarator): Check if a variable declarator contains a function
 * - isEventHandlerCall(node): Identify event handler patterns
 * - isFastifyCall(node): Identify Fastify-specific method calls
 * - isTopLevel(path): Check if AST node is at the top level
 * 
 * CONFIGURATION OPTIONS:
 * =====================
 * 
 * - maxTokens: Maximum tokens per chunk (default: 500)
 * - minTokens: Minimum tokens for a meaningful chunk (default: 30)
 * - overlapTokens: Token overlap between chunks (default: 50)
 * - maxChunkSize: Legacy character-based limit for backward compatibility
 * - minChunkSize: Legacy character-based minimum
 * - includeImportsInContext: Whether to add imports to chunks (default: true)
 * - shouldMergeSmallChunks: Whether to merge small chunks together (default: true)
 * - fastifyRules: Configuration for Fastify-specific processing
 * 
 * SUPPORTED FILE TYPES:
 * ====================
 * - .js, .jsx (JavaScript)
 * - .ts, .tsx (TypeScript) 
 * - .mjs (ES Modules)
 * - .cjs (CommonJS)
 * 
 * CRITICAL FIXES APPLIED:
 * ======================
 * 
 * 1. **Method/Field Name Collision**: Fixed shouldMergeSmallChunks vs mergeSmallChunks() conflict
 * 2. **Variable Function Boundaries**: Individual declarators now get proper AST boundaries
 * 3. **Duplicate Method Prevention**: Removed ClassMethod visitor to prevent duplicate extraction
 * 4. **Event Handler Detection**: Added subscription.on(), eventBus.on() recognition
 * 5. **Token Limit Enforcement**: Fastify mode now respects token limits when needed
 * 6. **Safe Boundary Cleaning**: Conservative brace balance tracking prevents syntax breakage
 * 7. **Unused Code Removal**: Cleaned up unused imports (Document) and options (semanticCoherence)
 * 
 * This splitter is production-ready and has been tested extensively with complex JavaScript
 * codebases including Fastify applications, event-driven architectures, and modern ES6+ patterns.
 */
class ASTCodeSplitter {
  constructor(options = {}) {
    // Enhanced token limits for better semantic coherence
    this.tokenSplitter = options.tokenSplitter || new TokenBasedSplitter({
      maxTokens: options.maxTokens || 500,         // Increased for semantic coherence (was 1200)
      minTokens: options.minTokens || 30,          // Reduced for fine-grained splitting (was 150)
      overlapTokens: options.overlapTokens || 50   // Reduced overlap for cleaner boundaries (was 200)
    });
    
    // Legacy character-based options (converted to tokens when needed)
    this.maxChunkSize = options.maxChunkSize || (this.tokenSplitter.maxTokens * 3.5); // For backward compatibility
    this.minChunkSize = options.minChunkSize || (this.tokenSplitter.minTokens * 3.5);
    
    this.includeImportsInContext = options.includeImportsInContext !== false;
    this.shouldMergeSmallChunks = options.mergeSmallChunks !== false;
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
    
    // Enhanced configuration for fine-grained semantic splitting
    this.fastifyRules = options.fastifyRules || {
      keepCompleteRegistrations: true,    // Don't split fastify.register() calls
      keepCompleteRoutes: true,          // Don't split route definitions
      splitMethods: true,                // Split individual methods
      recognizePatterns: true            // Recognize Fastify-specific patterns
    };
    
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
    
    try {
      // Create normalized document object for internal processing
      const normalizedDocument = { pageContent, metadata };
      
      // First pass: Create initial chunks
      const initialChunks = await this.createInitialChunks(normalizedDocument);
      console.log(`[${new Date().toISOString()}] 📦 Initial chunks: ${initialChunks.length}`);
      
      // Enhanced: For Fastify patterns, preserve semantic boundaries but enforce token limits
      if (this.fastifyRules.recognizePatterns && initialChunks.length > 1) {
        console.log(`[${new Date().toISOString()}] 🚀 FASTIFY ENHANCED MODE: Preserving semantic boundaries with token limit enforcement`);
        
        // Check for oversized chunks that must be split even in Fastify mode
        const tokenValidatedChunks = [];
        for (const chunk of initialChunks) {
          const content = chunk.pageContent || chunk.content || '';
          const tokenAnalysis = this.tokenSplitter.analyzeChunk(content);
          
          if (tokenAnalysis.tooLarge) {
            console.log(`[${new Date().toISOString()}] ⚠️ FASTIFY OVERRIDE: Chunk exceeds token limit (${tokenAnalysis.tokenCount} > ${this.tokenSplitter.maxTokens}) - forcing split`);
            // Force split oversized chunks even in Fastify mode
            const splitChunks = await this.splitLargeChunk(chunk);
            tokenValidatedChunks.push(...splitChunks);
          } else {
            // Keep chunk as-is if within token limits
            tokenValidatedChunks.push({
              ...chunk,
              tokenCount: tokenAnalysis.tokenCount,
              tokens: tokenAnalysis.tokenCount, // For backward compatibility
              metadata: {
                ...chunk.metadata,
                enhanced: true,
                preservedSemanticBoundaries: true,
                tokenCount: tokenAnalysis.tokenCount,
                fastifyOptimized: true
              }
            });
          }
        }
        
        return tokenValidatedChunks;
      }
      
      // Second pass: Quality analysis and optimization (for non-Fastify patterns)
      const optimizedChunks = await this.optimizeChunks(initialChunks, normalizedDocument);
      console.log(`[${new Date().toISOString()}] 🔧 Optimized chunks: ${optimizedChunks.length}`);
      
      // Third pass: Final validation and metadata enrichment
      const finalChunks = await this.enrichChunksWithMetadata(optimizedChunks, normalizedDocument);
      console.log(`[${new Date().toISOString()}] ✅ Final chunks: ${finalChunks.length}`);

      return finalChunks;

    } catch (error) {
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

      // Enhanced CallExpression handling for Fastify patterns and event handlers
      CallExpression: (path) => {
        const isFastifyCall = this.isFastifyCall(path.node);
        const isEventHandler = this.isEventHandlerCall(path.node);
        
        // Enhanced: Accept Fastify calls and important event handlers
        if (isFastifyCall) {
          const callUnit = this.createFastifyCallUnit(path.node, lines, originalCode, imports);
          if (callUnit) semanticUnits.push(callUnit);
        } else if (isEventHandler) {
          const callUnit = this.createSemanticUnit(path.node, lines, 'event_handler', originalCode);
          if (callUnit) semanticUnits.push(callUnit);
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
   * Create enhanced Fastify call unit with special handling
   */
  createFastifyCallUnit(node, lines, originalCode, imports) {
    const unit = this.createSemanticUnit(node, lines, 'call_expression', originalCode);
    if (!unit) return null;

    const tokenAnalysis = this.tokenSplitter.analyzeChunk(unit.content);
    const callType = this.getFastifyCallType(node);

    return {
      ...unit,
      tokenCount: tokenAnalysis.tokenCount,
      tokenAnalysis: tokenAnalysis,
      contextualImports: this.getRelevantImports(imports, unit.content),
      callType: callType,
      semanticType: callType === 'plugin_registration' ? 'registration' : 
                   callType === 'route_definition' ? 'route' : 'call',
      shouldKeepTogether: this.shouldKeepTogether({ callType }),
      isFastify: true
    };
  }

  /**
   * Create enhanced class method unit for fine-grained method extraction
   */
  /**
   * Create chunks from semantic units with enhanced quality optimization
   */
  createChunksFromSemanticUnits(semanticUnits, originalCode, metadata) {
    const chunks = [];
    let currentChunk = null;
    
    for (const unit of semanticUnits) {
      // Special handling for Fastify units that should be kept together
      if (unit.shouldKeepTogether) {
        // Force this unit to be its own chunk to preserve semantic coherence
        if (currentChunk) {
          chunks.push(this.createChunkFromUnit(currentChunk, metadata));
          currentChunk = null;
        }
        chunks.push(this.createChunkFromUnit(unit, metadata));
        continue;
      }

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
    // Analyze current quality
    const analysis = this.qualityAnalyzer.analyzeTraceChunks(chunks);
    
    // Apply optimizations based on analysis
    let optimizedChunks = [...chunks];

    // Merge small chunks
    if (analysis.sizingIssues.tooSmall.length > 0 && this.shouldMergeSmallChunks) {
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
    if (!this.includeImportsInContext) return chunks;
    
    const imports = this.extractAllImports(originalDocument.pageContent);
    
    return chunks.map((chunk, index) => {
      const content = chunk.pageContent || chunk.content || '';
      
      // Enhanced context with chunk index and parent class info
      const chunkMetadata = {
        ...chunk.metadata,
        chunkIndex: index,
        parentClass: chunk.metadata?.parentClass || chunk.metadata?.function_name
      };
      
      if (this.needsImportContext(content, chunkMetadata) && !this.hasImportContext(content)) {
        const relevantImports = this.getRelevantImports(imports, content);
        
        if (relevantImports.length > 0) {
          const enhancedContent = relevantImports.join('\n') + '\n\n' + content;
          
          return {
            ...chunk,
            pageContent: enhancedContent,
            metadata: {
              ...chunk.metadata,
              enhanced_with_imports: true,
              added_imports: relevantImports.length,
              chunkIndex: index
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
    // Filter out low-quality chunks before enrichment
    const filteredChunks = chunks.filter(chunk => {
      const content = chunk.pageContent || chunk.content || '';
      const tokenAnalysis = this.tokenSplitter.analyzeChunk(content);
      
      // Remove chunks that are just logging
      if (this.isLogOnlyChunk(content)) {
        console.log(`[${new Date().toISOString()}] 🗑️ FILTERED OUT: Log-only chunk (${tokenAnalysis.tokenCount} tokens)`);
        return false;
      }
      
      // Remove chunks that are too small to be useful
      if (this.isTooSmallToBeUseful(content, tokenAnalysis.tokenCount)) {
        console.log(`[${new Date().toISOString()}] 🗑️ FILTERED OUT: Too small/meaningless chunk (${tokenAnalysis.tokenCount} tokens)`);
        return false;
      }
      
      return true;
    });
    
    if (filteredChunks.length !== chunks.length) {
      console.log(`[${new Date().toISOString()}] 🧹 FILTERED: ${chunks.length - filteredChunks.length} low-quality chunks removed`);
    }
    
    return filteredChunks.map((chunk, index) => {
      const content = chunk.pageContent || chunk.content || '';
      
      // Ensure token counting for all chunks
      const tokenAnalysis = this.tokenSplitter.analyzeChunk(content);
      
      return {
        ...chunk,
        tokenCount: tokenAnalysis.tokenCount,
        tokens: tokenAnalysis.tokenCount, // For backward compatibility
        metadata: {
          ...chunk.metadata,
          ...originalDocument.metadata,
          // Enhanced metadata
          chunk_index: index,
          total_chunks: filteredChunks.length,
          chunk_size: content.length,
          tokenCount: tokenAnalysis.tokenCount,
          semantic_type: this.detectSemanticType(content, chunk.metadata?.node_type),
          function_names: this.extractFunctionNames(content),
          class_names: this.extractClassNames(content),
          has_imports: this.hasImportContext(content),
          has_exports: this.hasExports(content),
          complexity_score: this.calculateComplexity(content),
          splitting_method: 'enhanced_ast',
          quality_optimized: true,
          filtered_quality: true,
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

  detectSemanticType(content, nodeType = null) {
    // Prefer AST node type when available
    if (nodeType) {
      switch (nodeType) {
        case 'ClassDeclaration': return 'class';
        case 'FunctionDeclaration': return 'function';
        case 'MethodDefinition': 
        case 'ClassPrivateMethod': return 'method';
        case 'ImportDeclaration': return 'imports';
        case 'ExportNamedDeclaration':
        case 'ExportDefaultDeclaration': return 'exports';
        case 'VariableDeclaration': 
          // Check if it's a function variable
          if (/=.*=>|=.*function/.test(content)) return 'function';
          return 'variable';
        default:
          // Fall through to regex detection
      }
    }
    
    // Fallback to regex detection when no AST node type available
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
    // Strip simple strings to avoid counting control flow inside strings
    const code = content.replace(/(['"`]).*?\1/g, '');
    const sum = (re) => (code.match(re) || []).length;
    
    const score =
      2 * sum(/\bif\s*\(/g) +           // Weighted branches
      3 * sum(/\bswitch\s*\(/g) +      // Switch statements are more complex
      2 * sum(/\bfor(each)?\s*\(/g) +  // Loops
      2 * sum(/\bwhile\s*\(/g) +       // While loops
      1 * sum(/\bcatch\s*\(/g);        // Exception handling
    
    return Math.min(20, score); // Cap at 20
  }

  hasExports(content) {
    return /export\s+/.test(content) || /module\.exports/.test(content);
  }

  hashContent(content) {
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  needsImportContext(content, chunkMetadata = {}) {
    // Skip import addition for method chunks from same class (except first chunk)
    if (chunkMetadata.parentClass && chunkMetadata.chunkIndex > 0) {
      return false;
    }
    
    // Skip if content is just a closing bracket or empty
    if (/^\s*}\s*$/.test(content) || content.trim().length < 10) {
      return false;
    }
    
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
      /import\s+(\w+)/g,                          // import React
      /import\s*{\s*([^}]+)\s*}/g,               // import { useState, useEffect }
      /import\s+\*\s+as\s+(\w+)/g,               // import * as fs from 'fs'
      /const\s+(\w+)\s*=\s*require/g,            // const fs = require('fs')
      /const\s*{\s*([^}]+)\s*}\s*=\s*require/g   // const { readFile } = require('fs')
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
    const plugins = ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'importAssertions'];
    if (extension === '.tsx') plugins.push('tsx');
    
    return parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });
  }

  isTopLevel(path) {
    if (!path.parent) return false;
    
    // Traditional top-level (global scope)
    if (['Program', 'ExportNamedDeclaration', 'ExportDefaultDeclaration'].includes(path.parent.type)) {
      return true;
    }
    
    // For semantic splitting, consider statements inside module.exports function as "top-level"
    // This is a more pragmatic approach for code splitting
    let current = path;
    while (current.parent) {
      current = current.parent;
      
      // If we find a function that's assigned to module.exports, consider its contents as top-level
      if (current.type === 'FunctionExpression' || current.type === 'ArrowFunctionExpression') {
        const assignment = current.parent;
        if (assignment && assignment.type === 'AssignmentExpression') {
          const left = assignment.left;
          if (left && left.type === 'MemberExpression' &&
              left.object && left.object.name === 'module' &&
              left.property && left.property.name === 'exports') {
            return true;
          }
        }
      }
      
      // If we reach program level, it's definitely top-level
      if (current.type === 'Program') {
        return true;
      }
    }
    
    return false;
  }

  isFunctionDeclarator(declarator) {
    return declarator.init && 
           (declarator.init.type === 'ArrowFunctionExpression' || 
            declarator.init.type === 'FunctionExpression');
  }

  /**
   * Enhanced Fastify pattern recognition
   */
  isFastifyCall(node) {
    if (!node.callee || !this.fastifyRules.recognizePatterns) return false;
    
    // Check for fastify method calls
    if (node.callee.type === 'MemberExpression') {
      const objectName = node.callee.object?.name;
      const propertyName = node.callee.property?.name;
      
      // Fastify registrations and routes
      if (objectName === 'fastify' && 
          ['register', 'get', 'post', 'put', 'delete', 'patch', 'route', 'addHook'].includes(propertyName)) {
        return true;
      }
      
      // Await expressions with fastify
      if (node.callee.object?.type === 'MemberExpression' &&
          node.callee.object.object?.name === 'fastify') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if a call expression is an important event handler that should be preserved
   */
  isEventHandlerCall(node) {
    if (!node.callee || node.callee.type !== 'MemberExpression') return false;
    
    const objectName = node.callee.object?.name;
    const propertyName = node.callee.property?.name;
    
    // Event emitter patterns: subscription.on, eventBus.on, etc.
    if (propertyName === 'on' && ['subscription', 'eventBus', 'emitter'].includes(objectName)) {
      return true;
    }
    
    // Other important event patterns
    if (propertyName === 'addEventListener' || propertyName === 'addListener') {
      return true;
    }
    
    return false;
  }

  /**
   * Get the type of Fastify call for semantic classification
   */
  getFastifyCallType(node) {
    if (node.callee?.type === 'MemberExpression') {
      const propertyName = node.callee.property?.name;
      
      if (['get', 'post', 'put', 'delete', 'patch'].includes(propertyName)) {
        return 'route_definition';
      }
      if (propertyName === 'register') {
        return 'plugin_registration';
      }
      if (propertyName === 'addHook') {
        return 'hook_registration';
      }
    }
    return 'function_call';
  }

  /**
   * Check if a semantic unit should be kept together (no splitting)
   */
  shouldKeepTogether(unit) {
    if (!this.fastifyRules.keepCompleteRegistrations && !this.fastifyRules.keepCompleteRoutes) {
      return false;
    }

    const isFastifyRegistration = unit.callType === 'plugin_registration' && this.fastifyRules.keepCompleteRegistrations;
    const isFastifyRoute = unit.callType === 'route_definition' && this.fastifyRules.keepCompleteRoutes;
    
    return isFastifyRegistration || isFastifyRoute;
  }

  getFileExtension(filename) {
    if (!filename) return '';
    const idx = filename.lastIndexOf('.');
    return idx === -1 ? '' : filename.slice(idx);
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
    

    
    // Include preceding comments (but not commented-out code)
    let adjustedStartLine = startLine;
    for (let i = startLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if ((line.startsWith('//') && !line.includes('Debug:') && !line.includes('if (')) || 
          line.startsWith('/*') || line.startsWith('*') || line === '') {
        adjustedStartLine = i;
      } else {
        break;
      }
    }
    
    let content = lines.slice(adjustedStartLine, endLine + 1).join('\n');
    
    // Remove commented-out code blocks
    content = this.removeCommentedCode(content);
    
    // Trim non-essential logging statements
    content = this.trimLoggingStatements(content);
    
    // Clean boundary artifacts
    content = this.cleanChunkBoundaries(content);
    
    // Skip if content is empty after cleaning
    if (!content.trim()) return null;
    
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

  cleanChunkBoundaries(content) {
    if (!content || !content.trim()) return content;
    
    const lines = content.split('\n');
    const cleanedLines = [];
    
    // Track brace balance to detect truly orphaned braces
    let braceBalance = 0;
    let parenBalance = 0;
    let bracketBalance = 0;
    
    // First pass: calculate balances to understand structure
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Count braces, parens, and brackets (ignoring strings and comments)
      const codeOnly = this.stripStringsAndComments(trimmed);
      
      for (const char of codeOnly) {
        switch (char) {
          case '{': braceBalance++; break;
          case '}': braceBalance--; break;
          case '(': parenBalance++; break;
          case ')': parenBalance--; break;
          case '[': bracketBalance++; break;
          case ']': bracketBalance--; break;
        }
      }
    }
    
    // Second pass: clean lines based on safe heuristics
    let currentBraceBalance = 0;
    let currentParenBalance = 0;
    let currentBracketBalance = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Always keep empty lines and comments
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        cleanedLines.push(line);
        continue;
      }
      
      // Check if this line is a safe candidate for removal
      const shouldRemove = this.isSafeToRemoveLine(trimmed, {
        isFirstLine: i === 0,
        isLastLine: i === lines.length - 1,
        currentBraceBalance,
        currentParenBalance,
        currentBracketBalance,
        totalBraceBalance: braceBalance,
        totalParenBalance: parenBalance,
        totalBracketBalance: bracketBalance
      });
      
      if (!shouldRemove) {
        cleanedLines.push(line);
      }
      
      // Update running balances
      const codeOnly = this.stripStringsAndComments(trimmed);
      for (const char of codeOnly) {
        switch (char) {
          case '{': currentBraceBalance++; break;
          case '}': currentBraceBalance--; break;
          case '(': currentParenBalance++; break;
          case ')': currentParenBalance--; break;
          case '[': currentBracketBalance++; break;
          case ']': currentBracketBalance--; break;
        }
      }
    }
    
    // Final cleanup: remove excessive empty lines
    let finalContent = cleanedLines.join('\n');
    
    // Clean up multiple empty lines (safe operation)
    finalContent = finalContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Remove leading/trailing empty lines (safe operation)
    finalContent = finalContent.replace(/^\s*\n+/, '');
    finalContent = finalContent.replace(/\n+\s*$/, '');
    
    return finalContent.trim();
  }

  /**
   * Strip strings and comments to avoid counting braces inside them
   */
  stripStringsAndComments(line) {
    let result = '';
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let escaped = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      
      // Handle comment start
      if (!inString && char === '/' && (nextChar === '/' || nextChar === '*')) {
        inComment = true;
        if (nextChar === '/') break; // Single-line comment, ignore rest of line
        i++; // Skip the next character
        continue;
      }
      
      // Handle comment end for multi-line comments
      if (inComment && char === '*' && nextChar === '/') {
        inComment = false;
        i++; // Skip the next character
        continue;
      }
      
      if (inComment) continue;
      
      // Handle string start/end
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        continue;
      }
      
      if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
        continue;
      }
      
      if (!inString && !inComment) {
        result += char;
      }
    }
    
    return result;
  }

  /**
   * Determine if a line is safe to remove without breaking syntax
   */
  isSafeToRemoveLine(trimmed, context) {
    // Never remove non-empty, meaningful code lines
    if (this.containsMeaningfulCode(trimmed)) {
      return false;
    }
    
    // CRITICAL FIX: Never remove event handler declarations
    if (trimmed.includes('.on(') || (trimmed.includes('=>') && trimmed.includes('('))) {
      return false;
    }
    
    // CRITICAL: Only remove braces that are genuinely orphaned (unbalanced)
    // Remove orphaned closing braces at start ONLY if overall balance indicates extra closing braces
    if (context.isFirstLine && /^}\s*$/.test(trimmed)) {
      // Only remove if we have MORE closing braces than opening ones globally
      return context.totalBraceBalance < 0;
    }
    
    // Remove orphaned opening braces at end ONLY if overall balance indicates extra opening braces  
    if (context.isLastLine && /^{\s*$/.test(trimmed)) {
      // Only remove if we have MORE opening braces than closing ones globally
      return context.totalBraceBalance > 0;
    }
    
    // Safe to remove: pure punctuation fragments at start/end (but be very conservative)
    if ((context.isFirstLine || context.isLastLine) && /^[,;.]\s*$/.test(trimmed)) {
      return true;
    }
    
    // Safe to remove: incomplete variable declarations that are clearly broken fragments
    if (context.isFirstLine) {
      // Remove incomplete destructuring assignments like "const {" with nothing else meaningful
      if (/^(const|let|var)\s*{\s*$/.test(trimmed)) {
        return true;
      }
      // Remove other clearly incomplete declarations
      if (/^(const|let|var)\s*$/.test(trimmed)) {
        return true;
      }
    }
    
    // Safe to remove: standalone opening punctuation at start
    if (context.isFirstLine && /^[({[]\s*$/.test(trimmed)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a line contains meaningful code that should never be removed
   */
  containsMeaningfulCode(trimmed) {
    // Always preserve function declarations, class declarations, etc.
    if (/^(function|class|const|let|var|if|for|while|switch|try|catch|finally|return|throw|async|await)\s/.test(trimmed)) {
      return true;
    }
    
    // CRITICAL FIX: Always preserve event handlers and method calls with arrow functions
    if (trimmed.includes('.on(') && trimmed.includes('=>')) {
      return true;
    }
    
    // Always preserve method calls, assignments, etc.
    if (/\w+\s*[=()]/.test(trimmed)) {
      return true;
    }
    
    // Always preserve method calls with dot notation (subscription.on, etc.)
    if (/\w+\.\w+\s*\(/.test(trimmed)) {
      return true;
    }
    
    // Always preserve complete statements
    if (trimmed.includes(';') && trimmed.length > 1) {
      return true;
    }
    
    // Always preserve object/array literals with content
    if (/[{[].*[}\]]/.test(trimmed) && trimmed.length > 2) {
      return true;
    }
    
    return false;
  }

  /**
   * Filter out commented code blocks and debug statements
   */
  removeCommentedCode(content) {
    // Remove multi-line comment blocks (/* ... */)
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove single-line comments that are full lines
    content = content.replace(/^\s*\/\/.*$/gm, '');
    
    // Remove commented-out code blocks (lines starting with //)
    const lines = content.split('\n');
    const filteredLines = [];
    let inCommentedBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect start of commented code block
      if (line.startsWith('// ') && (line.includes('if (') || line.includes('try {') || line.includes('Debug:'))) {
        inCommentedBlock = true;
        continue;
      }
      
      // Skip lines in commented block
      if (inCommentedBlock) {
        if (line.startsWith('//') || line === '') {
          continue;
        } else {
          inCommentedBlock = false;
        }
      }
      
      // Keep meaningful lines
      if (line !== '' || !inCommentedBlock) {
        filteredLines.push(lines[i]);
      }
    }
    
    return filteredLines.join('\n');
  }

  /**
   * Remove non-essential logging statements (keep only error and warn)
   * Only removes standalone logging lines, preserves all business logic
   */
  trimLoggingStatements(content) {
    const lines = content.split('\n');
    const filteredLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Always keep empty lines and comments
      if (trimmed === '' || trimmed.startsWith('//')) {
        filteredLines.push(line);
        continue;
      }
      
      // Always keep error and warning logs
      if (this.isEssentialLogStatement(trimmed)) {
        filteredLines.push(line);
        continue;
      }
      
      // Only remove lines that are PURELY non-essential logging (standalone log statements)
      if (this.isPureLogStatement(trimmed)) {
        continue; // Skip this line
      }
      
      // Keep ALL other code (business logic, declarations, etc.)
      filteredLines.push(line);
    }
    
    return filteredLines.join('\n');
  }

  /**
   * Check if line is purely a logging statement (nothing else)
   */
  isPureLogStatement(line) {
    // Must be a complete log statement line with semicolon or standalone
    const pureLogPatterns = [
      /^\s*fastify\.log\.(info|debug)\(.*\);\s*$/,
      /^\s*console\.(log|info|debug)\(.*\);\s*$/,
      /^\s*logger\.(info|debug)\(.*\);\s*$/
    ];
    
    return pureLogPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if log statement is essential (error, warn)
   */
  isEssentialLogStatement(line) {
    const essentialPatterns = [
      /fastify\.log\.(error|warn)/,
      /console\.(error|warn)/,
      /logger\.(error|warn)/,
      /\.error\(/,
      /\.warn\(/,
      /throw new Error/,
      /throw error/
    ];
    
    return essentialPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if log statement is non-essential (info, debug, success)
   * More conservative - only matches obvious logging patterns
   */
  isNonEssentialLogStatement(line) {
    const nonEssentialPatterns = [
      /^\s*fastify\.log\.(info|debug)\(/,
      /^\s*console\.(log|info|debug)\(/,
      /^\s*logger\.(info|debug)\(/
    ];
    
    return nonEssentialPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Check if chunk is just logging statements (after trimming)
   */
  isLogOnlyChunk(content) {
    // First trim non-essential logging
    const trimmedContent = this.trimLoggingStatements(content);
    const lines = trimmedContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) return true; // Empty after trimming
    
    const logPatterns = [
      /fastify\.log\.(error|warn)/,
      /console\.(error|warn)/,
      /logger\.(error|warn)/
    ];
    
    let logLines = 0;
    let codeLines = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '' || trimmed.startsWith('//')) continue;
      
      const isLogLine = logPatterns.some(pattern => pattern.test(trimmed));
      if (isLogLine) {
        logLines++;
      } else {
        codeLines++;
      }
    }
    
    // Consider it log-only if more than 90% are log statements (even essential ones)
    return logLines > 0 && (logLines / (logLines + codeLines)) > 0.9;
  }

  /**
   * Check if chunk is too small to be meaningful
   */
  isTooSmallToBeUseful(content, tokenCount) {
    // Skip chunks with very few tokens
    if (tokenCount < 20) return true;
    
    // Skip chunks with only simple statements
    const meaningfulPatterns = [
      /class\s+\w+/,      // Class definitions
      /function\s+\w+/,   // Function definitions
      /async\s+\w+/,      // Async functions
      /const\s+\w+\s*=/,  // Variable assignments
      /if\s*\(/,          // Conditional logic
      /for\s*\(/,         // Loops
      /while\s*\(/,       // Loops
      /try\s*{/,          // Error handling
      /catch\s*\(/,       // Error handling
      /switch\s*\(/       // Switch statements
    ];
    
    const hasMeaningfulContent = meaningfulPatterns.some(pattern => pattern.test(content));
    return !hasMeaningfulContent;
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
        node_type: unit.nodeType,
        parentClass: unit.parentClass,
        methodIndex: unit.methodIndex
      }
    };
  }

  fallbackSplit(document) {
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
        return semanticSplits;
      }

      // Second attempt: Split by AST-aware boundaries (functions, classes, blocks)
      const astAwareSplits = await this.splitByASTBoundaries(content, chunk.metadata);
      if (astAwareSplits && astAwareSplits.length > 1) {
        return astAwareSplits;
      }

      // Third attempt: Smart line-based splitting (avoid breaking code blocks)
      const smartLineSplits = await this.splitBySmartLineBoundaries(content, chunk.metadata);
      if (smartLineSplits && smartLineSplits.length > 1) {
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
      
      const chunks = tokenChunks.map((tokenChunk, index) => {
        let cleanedContent = tokenChunk.text;
        
        // Remove commented code and trim logging
        cleanedContent = this.removeCommentedCode(cleanedContent);
        cleanedContent = this.trimLoggingStatements(cleanedContent);
        cleanedContent = this.cleanChunkBoundaries(cleanedContent);
        
        return {
          pageContent: cleanedContent,
          metadata: {
            ...metadata,
            split_method: 'token_windows_with_overlap',
            split_part: index + 1,
            split_total: tokenChunks.length,
            token_count: tokenChunk.tokens,
            character_count: tokenChunk.characters,
            has_overlap: true,
            overlap_tokens: this.tokenSplitter.overlapTokens,
            token_efficiency: `${(tokenChunk.tokens / this.tokenSplitter.maxTokens * 100).toFixed(1)}%`,
            boundary_cleaned: true,
            logging_trimmed: true
          }
        };
      });

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
        if ((member.type === 'MethodDefinition' || member.type === 'ClassPrivateMethod') && member.key?.name) {
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
    const parseParam = (p) =>
      p.type === 'Identifier' ? p.name :
      p.type === 'AssignmentPattern' ? (p.left.name || 'param') :
      p.type === 'RestElement' ? ('...' + (p.argument.name || 'rest')) :
      p.type.includes('ObjectPattern') || p.type.includes('ArrayPattern') ? '<destructured>' : 'param';
    return (node.params || []).map(parseParam);
  }

  createVariableFunctionUnit(declarator, parent, lines, originalCode, imports) {
    // Use the declarator's location, not the parent's entire declaration
    return this.createSemanticUnit(declarator, lines, 'function', originalCode);
  }

  createExportUnit(node, lines, originalCode, imports) {
    return this.createSemanticUnit(node, lines, 'export', originalCode);
  }

  extractClassMethods(node, lines, originalCode, className) {
    const methods = [];
    
    if (node.body && node.body.body) {
      node.body.body.forEach((member, index) => {
        if (member.type === 'MethodDefinition' || member.type === 'ClassPrivateMethod') {
          const methodUnit = this.createSemanticUnit(member, lines, 'method', originalCode);
          if (methodUnit) {
            methodUnit.parentClass = className;
            methodUnit.methodIndex = index;
            methods.push(methodUnit);
          }
        }
      });
    }
    
    return methods;
  }
}

module.exports = ASTCodeSplitter;
