// ChunkQualityAnalyzer.js
"use strict";

/**
 * Analyzes chunk quality from LangSmith traces to improve chunking strategies
 * Uses full trace data to identify patterns and optimize chunk boundaries
 */
class ChunkQualityAnalyzer {
  constructor(options = {}) {
    this.minChunkSize = options.minChunkSize || 300; // Minimum meaningful chunk size
    this.maxChunkSize = options.maxChunkSize || 3500; // Maximum before splitting
    this.optimalChunkSize = options.optimalChunkSize || 1200; // Target size
    this.semanticBoundaryBonus = options.semanticBoundaryBonus || 0.2; // Bonus for semantic boundaries
  }

  /**
   * Analyze trace data to identify chunking issues
   */
  analyzeTraceChunks(traceData) {
    const chunks = this.extractChunksFromTrace(traceData);
    const analysis = {
      totalChunks: chunks.length,
      issues: [],
      recommendations: [],
      qualityScore: 0,
      sizingIssues: this.analyzeSizingIssues(chunks),
      semanticIssues: this.analyzeSemanticIssues(chunks),
      duplicateIssues: this.analyzeDuplicateIssues(chunks),
      contextIssues: this.analyzeContextIssues(chunks),
      metadataIssues: this.analyzeMetadataIssues(chunks)
    };

    // Calculate overall quality score
    analysis.qualityScore = this.calculateQualityScore(analysis);
    
    // Generate improvement recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Extract chunk data from trace analysis
   */
  extractChunksFromTrace(traceData) {
    const chunks = [];
    
    // Handle different trace formats
    if (traceData.chunks) {
      chunks.push(...traceData.chunks);
    } else if (traceData.retrievedDocuments) {
      chunks.push(...traceData.retrievedDocuments);
    } else if (Array.isArray(traceData)) {
      chunks.push(...traceData);
    }

    return chunks.map(chunk => ({
      source: chunk.source || chunk.metadata?.source,
      content: chunk.content || chunk.pageContent,
      size: chunk.size || (chunk.content || chunk.pageContent || '').length,
      type: chunk.type || chunk.metadata?.chunk_type || 'unknown',
      metadata: chunk.metadata || {},
      semanticUnit: chunk.metadata?.semantic_unit,
      functionName: chunk.metadata?.function_name
    }));
  }

  /**
   * Analyze chunk sizing issues
   */
  analyzeSizingIssues(chunks) {
    const sizing = {
      tooSmall: chunks.filter(c => c.size < this.minChunkSize),
      tooLarge: chunks.filter(c => c.size > this.maxChunkSize),
      optimal: chunks.filter(c => c.size >= this.minChunkSize && c.size <= this.maxChunkSize),
      averageSize: chunks.reduce((sum, c) => sum + c.size, 0) / chunks.length
    };

    sizing.issues = [];
    if (sizing.tooSmall.length > chunks.length * 0.3) {
      sizing.issues.push(`Too many small chunks: ${sizing.tooSmall.length}/${chunks.length} (${Math.round(sizing.tooSmall.length/chunks.length*100)}%)`);
    }
    if (sizing.tooLarge.length > chunks.length * 0.1) {
      sizing.issues.push(`Too many large chunks: ${sizing.tooLarge.length}/${chunks.length} (${Math.round(sizing.tooLarge.length/chunks.length*100)}%)`);
    }

    return sizing;
  }

  /**
   * Analyze semantic boundary issues
   */
  analyzeSemanticIssues(chunks) {
    const semantic = {
      missingTypes: chunks.filter(c => !c.type || c.type === 'unknown'),
      importOnlyChunks: chunks.filter(c => this.isImportOnlyChunk(c.content)),
      fragmentedFunctions: this.findFragmentedFunctions(chunks),
      orphanedCode: chunks.filter(c => this.isOrphanedCode(c.content))
    };

    semantic.issues = [];
    if (semantic.missingTypes.length > chunks.length * 0.5) {
      semantic.issues.push(`Missing semantic types: ${semantic.missingTypes.length}/${chunks.length}`);
    }
    if (semantic.importOnlyChunks.length > 0) {
      semantic.issues.push(`Import-only chunks detected: ${semantic.importOnlyChunks.length}`);
    }
    if (semantic.fragmentedFunctions.length > 0) {
      semantic.issues.push(`Fragmented functions: ${semantic.fragmentedFunctions.length}`);
    }

    return semantic;
  }

  /**
   * Analyze duplicate content issues
   */
  analyzeDuplicateIssues(chunks) {
    const contentMap = new Map();
    chunks.forEach((chunk, index) => {
      const content = chunk.content.trim();
      if (!contentMap.has(content)) {
        contentMap.set(content, []);
      }
      contentMap.get(content).push({ chunk, index });
    });

    const duplicates = Array.from(contentMap.entries())
      .filter(([content, instances]) => instances.length > 1)
      .map(([content, instances]) => ({
        content: content.substring(0, 100),
        count: instances.length,
        instances: instances.map(i => i.index)
      }));

    return {
      duplicateGroups: duplicates,
      totalDuplicates: duplicates.reduce((sum, d) => sum + d.count - 1, 0),
      issues: duplicates.length > 0 ? [`Found ${duplicates.length} duplicate content groups`] : []
    };
  }

  /**
   * Analyze context completeness issues
   */
  analyzeContextIssues(chunks) {
    const context = {
      missingImports: chunks.filter(c => this.needsImportContext(c.content) && !this.hasImportContext(c.content)),
      incompleteClasses: chunks.filter(c => this.isIncompleteClass(c.content)),
      orphanedMethods: chunks.filter(c => this.isOrphanedMethod(c.content))
    };

    context.issues = [];
    if (context.missingImports.length > 0) {
      context.issues.push(`Chunks missing import context: ${context.missingImports.length}`);
    }
    if (context.incompleteClasses.length > 0) {
      context.issues.push(`Incomplete class definitions: ${context.incompleteClasses.length}`);
    }

    return context;
  }

  /**
   * Analyze metadata quality issues
   */
  analyzeMetadataIssues(chunks) {
    const metadata = {
      missingSource: chunks.filter(c => !c.source),
      missingLineNumbers: chunks.filter(c => !c.metadata.start_line),
      missingSemanticInfo: chunks.filter(c => !c.semanticUnit && !c.functionName)
    };

    metadata.issues = [];
    if (metadata.missingSemanticInfo.length > chunks.length * 0.7) {
      metadata.issues.push(`Missing semantic metadata: ${metadata.missingSemanticInfo.length}/${chunks.length}`);
    }

    return metadata;
  }

  /**
   * Calculate overall quality score (0-100)
   */
  calculateQualityScore(analysis) {
    let score = 100;
    const totalChunks = analysis.totalChunks;

    // Sizing penalties
    score -= (analysis.sizingIssues.tooSmall.length / totalChunks) * 30;
    score -= (analysis.sizingIssues.tooLarge.length / totalChunks) * 20;

    // Semantic penalties
    score -= (analysis.semanticIssues.missingTypes.length / totalChunks) * 25;
    score -= analysis.semanticIssues.importOnlyChunks.length * 5;

    // Duplicate penalties
    score -= analysis.duplicateIssues.totalDuplicates * 2;

    // Context penalties
    score -= (analysis.contextIssues.missingImports.length / totalChunks) * 15;

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Sizing recommendations
    if (analysis.sizingIssues.tooSmall.length > 0) {
      recommendations.push({
        category: 'sizing',
        priority: 'high',
        issue: 'Too many small chunks',
        solution: 'Increase minimum chunk size and merge related code blocks',
        implementation: 'Update AST splitter to combine import statements with following code'
      });
    }

    // Semantic recommendations
    if (analysis.semanticIssues.missingTypes.length > 0) {
      recommendations.push({
        category: 'semantic',
        priority: 'high',
        issue: 'Missing semantic types',
        solution: 'Enhance AST-based chunking to properly identify code structures',
        implementation: 'Improve AST traversal to set proper chunk_type metadata'
      });
    }

    if (analysis.semanticIssues.importOnlyChunks.length > 0) {
      recommendations.push({
        category: 'semantic',
        priority: 'medium',
        issue: 'Import-only chunks detected',
        solution: 'Merge import statements with following functional code',
        implementation: 'Modify splitter to treat imports as context for subsequent chunks'
      });
    }

    // Duplicate recommendations
    if (analysis.duplicateIssues.totalDuplicates > 0) {
      recommendations.push({
        category: 'deduplication',
        priority: 'medium',
        issue: 'Duplicate chunks found',
        solution: 'Implement deduplication logic in document processing',
        implementation: 'Add content hashing and duplicate detection in repositoryProcessor'
      });
    }

    return recommendations;
  }

  /**
   * Helper methods for content analysis
   */
  isImportOnlyChunk(content) {
    const lines = content.trim().split('\n').filter(line => line.trim());
    return lines.length <= 3 && lines.every(line => 
      line.includes('require(') || 
      line.includes('import ') || 
      line.includes('from ') ||
      line.startsWith('//') ||
      line.startsWith('/*')
    );
  }

  needsImportContext(content) {
    return content.includes('require(') || 
           content.includes('import ') ||
           /class\s+\w+/.test(content) ||
           /function\s+\w+/.test(content);
  }

  hasImportContext(content) {
    const lines = content.split('\n');
    return lines.some(line => line.includes('require(') || line.includes('import '));
  }

  isIncompleteClass(content) {
    const hasClassDeclaration = /class\s+\w+/.test(content);
    const hasClosingBrace = content.includes('}');
    return hasClassDeclaration && !hasClosingBrace;
  }

  isOrphanedMethod(content) {
    const hasMethodSignature = /\w+\s*\([^)]*\)\s*{/.test(content);
    const hasClassContext = /class\s+\w+/.test(content);
    return hasMethodSignature && !hasClassContext;
  }

  isOrphanedCode(content) {
    const trimmed = content.trim();
    return trimmed.length > 50 && 
           !trimmed.includes('function') && 
           !trimmed.includes('class') &&
           !trimmed.includes('const') &&
           !trimmed.includes('let') &&
           !trimmed.includes('var') &&
           !trimmed.includes('import') &&
           !trimmed.includes('require');
  }

  findFragmentedFunctions(chunks) {
    const functionStarts = chunks.filter(c => 
      /function\s+\w+|const\s+\w+\s*=.*=>|\w+\s*\([^)]*\)\s*{/.test(c.content) &&
      !c.content.includes('}')
    );
    return functionStarts;
  }

  /**
   * Generate improvement plan
   */
  generateImprovementPlan(analysis) {
    return {
      immediate: analysis.recommendations.filter(r => r.priority === 'high'),
      shortTerm: analysis.recommendations.filter(r => r.priority === 'medium'),
      longTerm: analysis.recommendations.filter(r => r.priority === 'low'),
      qualityTargets: {
        targetScore: Math.min(analysis.qualityScore + 30, 95),
        sizingTarget: 'Reduce small chunks by 80%',
        semanticTarget: 'Achieve 90% semantic type coverage',
        duplicateTarget: 'Eliminate all duplicate chunks'
      }
    };
  }
}

module.exports = ChunkQualityAnalyzer;
