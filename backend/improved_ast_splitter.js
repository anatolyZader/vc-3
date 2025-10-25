// Improved AST Code Splitter configuration for better semantic chunking
// Fixes the fragmentation issues discovered in the quality test

const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

/**
 * Enhanced AST Splitter with improved semantic preservation
 * Addresses the issues found in chunk quality testing:
 * - Fragmented code structures (42% complete)
 * - Poor semantic coherence (2.75/5.0)  
 * - Unbalanced braces in chunks
 */
class SemanticASTSplitter extends ASTCodeSplitter {
  constructor(options = {}) {
    super({
      // INCREASED LIMITS for better semantic completeness
      maxTokens: 1200,          // Increased from 800 to preserve complete functions
      minTokens: 150,           // Increased from 60 to avoid tiny fragments  
      overlapTokens: 100,       // Reasonable overlap for context
      
      // ALLOW MULTIPLE RELATED UNITS per chunk
      maxUnitsPerChunk: 3,      // Increased from 1 to keep related methods together
      
      // IMPROVED THRESHOLDS
      charsPerToken: 4,
      minResidualChars: 50,     // Increased to avoid trivial chunks
      
      // ENABLE fallbacks for oversized content
      enableLineFallback: true,
      
      ...options
    });
  }

  /**
   * Enhanced processing that preserves semantic relationships
   */
  split(code, metadata = {}) {
    console.log(`[${new Date().toISOString()}] 🧬 SemanticASTSplitter: Processing ${code.length} characters`);
    
    try {
      const result = super.split(code, metadata);
      
      // Post-process to improve semantic quality
      const enhancedResult = this.enhanceSemanticQuality(result);
      
      console.log(`[${new Date().toISOString()}] ✅ Generated ${enhancedResult.length} enhanced semantic chunks`);
      
      // Log quality metrics
      this.logQualityMetrics(enhancedResult);
      
      return enhancedResult;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ SemanticASTSplitter error:`, error.message);
      // Fallback to simple splitting
      return this.fallbackSplit(code, metadata);
    }
  }

  /**
   * Enhance chunks for better semantic quality
   */
  enhanceSemanticQuality(chunks) {
    const enhanced = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const content = chunk.pageContent || '';
      
      // Check if chunk has structural issues
      const quality = this.assessChunkQuality(content);
      
      if (quality.needsImprovement && i < chunks.length - 1) {
        // Try to merge with next chunk if it would improve completeness
        const nextChunk = chunks[i + 1];
        const combined = content + '\n\n' + (nextChunk.pageContent || '');
        const combinedTokens = this.estimateTokens(combined);
        
        if (combinedTokens <= this.maxTokens * 1.2) { // Allow 20% overflow for completeness
          const combinedQuality = this.assessChunkQuality(combined);
          
          if (combinedQuality.completeness > quality.completeness) {
            // Merge chunks for better completeness
            enhanced.push({
              ...chunk,
              pageContent: combined,
              metadata: {
                ...chunk.metadata,
                mergedWithNext: true,
                enhancedForCompleteness: true,
                tokenCount: combinedTokens,
                qualityScore: combinedQuality.completeness
              }
            });
            i++; // Skip next chunk since we merged it
            continue;
          }
        }
      }
      
      // Enhance metadata with quality information
      enhanced.push({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          qualityAssessment: quality,
          semanticType: this.identifySemanticType(content),
          completeness: quality.completeness
        }
      });
    }
    
    return enhanced;
  }

  /**
   * Assess the semantic quality of a chunk
   */
  assessChunkQuality(content) {
    if (!content || content.length === 0) {
      return { completeness: 0, needsImprovement: true, issues: ['empty'] };
    }
    
    const issues = [];
    let completeness = 0.5; // Start at middle
    
    // Check brace balance (major indicator of completeness)
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    if (openBraces === closeBraces && openBraces > 0) {
      completeness += 0.3; // Balanced braces is very good
    } else if (openBraces !== closeBraces) {
      issues.push('unbalanced_braces');
      completeness -= 0.2;
    }
    
    if (openParens === closeParens && openParens > 0) {
      completeness += 0.1;
    } else if (openParens !== closeParens) {
      issues.push('unbalanced_parens');
      completeness -= 0.1;
    }
    
    // Check for complete function/class structures
    const hasFunctionKeyword = /\b(function|class|const\s+\w+\s*=\s*\(|async\s+function)\b/g.test(content);
    const hasMethodSignature = /\w+\s*\([^)]*\)\s*\{/g.test(content);
    
    if (hasFunctionKeyword || hasMethodSignature) {
      completeness += 0.2;
    }
    
    // Check for meaningful content
    const meaningfulLines = content.split('\n').filter(line => 
      line.trim() && 
      !line.trim().startsWith('//') && 
      !line.trim().startsWith('/*') &&
      line.trim() !== '{' &&
      line.trim() !== '}'
    ).length;
    
    if (meaningfulLines > 3) {
      completeness += 0.1;
    } else if (meaningfulLines === 0) {
      issues.push('no_meaningful_content');
      completeness -= 0.3;
    }
    
    // Check for imports/exports (often good context)
    if (/\b(require\(|import\s+|module\.exports|export\s+)/g.test(content)) {
      completeness += 0.1;
    }
    
    completeness = Math.max(0, Math.min(1, completeness));
    
    return {
      completeness,
      needsImprovement: completeness < 0.7 || issues.length > 0,
      issues,
      meaningfulLines
    };
  }

  /**
   * Identify the semantic type of content
   */
  identifySemanticType(content) {
    if (/\bclass\s+\w+/g.test(content)) return 'class_definition';
    if (/\bfunction\s+\w+/g.test(content)) return 'function_declaration';
    if (/\bconst\s+\w+\s*=\s*\(.*\)\s*=>/g.test(content)) return 'arrow_function';
    if (/\bconst\s+\w+\s*=\s*function/g.test(content)) return 'function_expression';
    if (/\bmodule\.exports/g.test(content)) return 'module_exports';
    if (/\brequire\(/g.test(content)) return 'require_statement';
    if (/\bfastify\.(get|post|put|delete)/g.test(content)) return 'route_handler';
    if (/\.\w+\s*\([^)]*\)\s*\{/g.test(content)) return 'method_call';
    if (/^\s*\/\/|^\s*\/\*/gm.test(content)) return 'comment_block';
    
    return 'mixed_code';
  }

  /**
   * Log quality metrics for monitoring
   */
  logQualityMetrics(chunks) {
    if (chunks.length === 0) return;
    
    const totalChunks = chunks.length;
    const avgSize = Math.round(chunks.reduce((sum, c) => sum + (c.pageContent?.length || 0), 0) / totalChunks);
    
    // Count complete structures
    const completeStructures = chunks.filter(c => 
      c.metadata?.qualityAssessment?.completeness >= 0.7
    ).length;
    
    // Count semantic types
    const semanticTypes = {};
    chunks.forEach(c => {
      const type = c.metadata?.semanticType || 'unknown';
      semanticTypes[type] = (semanticTypes[type] || 0) + 1;
    });
    
    const avgCompleteness = chunks
      .map(c => c.metadata?.qualityAssessment?.completeness || 0)
      .reduce((sum, score) => sum + score, 0) / totalChunks;
    
    console.log(`[${new Date().toISOString()}] 📊 SEMANTIC QUALITY METRICS:`);
    console.log(`  - Total chunks: ${totalChunks}`);
    console.log(`  - Average size: ${avgSize} chars`);
    console.log(`  - Complete structures: ${completeStructures}/${totalChunks} (${Math.round(completeStructures/totalChunks*100)}%)`);
    console.log(`  - Average completeness: ${avgCompleteness.toFixed(2)}/1.0`);
    console.log(`  - Semantic types:`, semanticTypes);
  }

  /**
   * Fallback splitting when AST parsing fails
   */
  fallbackSplit(code, metadata) {
    console.log(`[${new Date().toISOString()}] 🔄 Using fallback splitting`);
    
    // Simple function-aware splitting
    const chunks = [];
    const lines = code.split('\n');
    let currentChunk = [];
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      currentChunk.push(line);
      
      // Track braces
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      // Detect function starts
      if (/\b(function|class|const\s+\w+\s*=)/g.test(line)) {
        inFunction = true;
      }
      
      // End chunk when we complete a function/class
      if (inFunction && braceCount === 0 && currentChunk.length > 5) {
        const chunkText = currentChunk.join('\n').trim();
        if (chunkText) {
          chunks.push({
            pageContent: chunkText,
            metadata: {
              ...metadata,
              splitting: 'fallback_function_aware',
              tokenCount: this.estimateTokens(chunkText),
              lines: currentChunk.length
            }
          });
        }
        currentChunk = [];
        inFunction = false;
      }
      
      // Prevent overly large chunks
      if (currentChunk.length > 50 && braceCount === 0) {
        const chunkText = currentChunk.join('\n').trim();
        if (chunkText) {
          chunks.push({
            pageContent: chunkText,
            metadata: {
              ...metadata,
              splitting: 'fallback_size_limit',
              tokenCount: this.estimateTokens(chunkText),
              lines: currentChunk.length
            }
          });
        }
        currentChunk = [];
        inFunction = false;
      }
    }
    
    // Handle remaining content
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n').trim();
      if (chunkText) {
        chunks.push({
          pageContent: chunkText,
          metadata: {
            ...metadata,
            splitting: 'fallback_remainder',
            tokenCount: this.estimateTokens(chunkText),
            lines: currentChunk.length
          }
        });
      }
    }
    
    return chunks;
  }
}

// Factory function to create improved splitter
function createSemanticASTSplitter(options = {}) {
  return new SemanticASTSplitter(options);
}

module.exports = {
  SemanticASTSplitter,
  createSemanticASTSplitter
};

// Usage example:
/*
const { createSemanticASTSplitter } = require('./improved_ast_splitter');

const splitter = createSemanticASTSplitter({
  maxTokens: 1200,      // Larger chunks for completeness
  maxUnitsPerChunk: 3,  // Allow related units together
  minTokens: 150        // Avoid tiny fragments
});

const chunks = splitter.split(sourceCode, { source: 'file.js' });
// Returns enhanced chunks with quality metrics
*/