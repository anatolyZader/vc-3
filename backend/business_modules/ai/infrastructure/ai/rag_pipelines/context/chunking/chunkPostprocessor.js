/**
 * ChunkPostprocessor - Enhances chunks after splitting for better retrieval
 * Handles context enrichment, deduplication, and quality optimization
 */
class ChunkPostprocessor {
  constructor() {
    this.minChunkQuality = 0.4;
    this.maxSimilarityThreshold = 0.95;
  }

  /**
   * Main post-processing pipeline for chunks
   */
  async postprocessChunks(chunks, originalDocument) {
    console.log(`[${new Date().toISOString()}] 🔧 POST-PROCESSING: ${chunks.length} chunks`);
    
    let processedChunks = chunks;

    // 1. Context enrichment
    processedChunks = await this.enrichChunkContext(processedChunks, originalDocument);
    
    // 2. Quality filtering
    processedChunks = this.filterLowQualityChunks(processedChunks);
    
    // 3. Deduplication
    processedChunks = this.deduplicateChunks(processedChunks);
    
    // 4. Add synthetic questions for better retrieval
    processedChunks = await this.addSyntheticQuestions(processedChunks);
    
    // 5. Enhance metadata for retrieval
    processedChunks = this.enhanceRetrievalMetadata(processedChunks);

    console.log(`[${new Date().toISOString()}] ✅ POST-PROCESSING: ${chunks.length} → ${processedChunks.length} chunks`);
    return processedChunks;
  }

  /**
   * 1. Context Enrichment - Add surrounding context to chunks
   */
  async enrichChunkContext(chunks, originalDocument) {
    const enrichedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const enrichedChunk = { ...chunk };
      
      // Add file-level context
      enrichedChunk.pageContent = this.addFileContext(chunk.pageContent, originalDocument);
      
      // Add surrounding chunks context (for code continuity)
      if (originalDocument.metadata?.file_type === 'code') {
        enrichedChunk.pageContent = this.addCodeContext(chunk.pageContent, chunks, i);
      }
      
      // Add import context for code chunks
      if (originalDocument.metadata?.import_dependencies) {
        enrichedChunk.metadata.related_imports = this.extractRelevantImports(
          chunk.pageContent, 
          originalDocument.metadata.import_dependencies
        );
      }
      
      enrichedChunks.push(enrichedChunk);
    }
    
    return enrichedChunks;
  }

  addFileContext(chunkContent, originalDocument) {
    const fileInfo = `
// File: ${originalDocument.metadata?.source || 'unknown'}
// Type: ${originalDocument.metadata?.file_type || 'unknown'}
${originalDocument.metadata?.language ? `// Language: ${originalDocument.metadata.language}` : ''}
${originalDocument.metadata?.main_entities?.length > 0 ? `// Contains: ${originalDocument.metadata.main_entities.slice(0, 3).join(', ')}` : ''}
${originalDocument.metadata?.imports_excluded_from_chunking ? '// Note: Import statements excluded from chunking for cleaner content' : ''}

${chunkContent}`;
    
    return fileInfo.trim();
  }

  addCodeContext(chunkContent, allChunks, currentIndex) {
    // For code chunks, add minimal context from previous/next chunks if they're related
    const prevChunk = currentIndex > 0 ? allChunks[currentIndex - 1] : null;
    const nextChunk = currentIndex < allChunks.length - 1 ? allChunks[currentIndex + 1] : null;
    
    let contextualContent = chunkContent;
    
    // Add previous context if it contains related imports or class definitions
    if (prevChunk && this.isRelatedCodeContext(prevChunk.pageContent, chunkContent)) {
      const prevContext = this.extractRelevantLines(prevChunk.pageContent, 3);
      contextualContent = `// Previous context:\n${prevContext}\n\n// Current chunk:\n${contextualContent}`;
    }
    
    // Add next context if it contains related method implementations
    if (nextChunk && this.isRelatedCodeContext(chunkContent, nextChunk.pageContent)) {
      const nextContext = this.extractRelevantLines(nextChunk.pageContent, 3);
      contextualContent = `${contextualContent}\n\n// Following context:\n${nextContext}`;
    }
    
    return contextualContent;
  }

  isRelatedCodeContext(chunk1, chunk2) {
    // Check if chunks are related (same class, related functions, etc.)
    const extractIdentifiers = (text) => {
      const identifiers = new Set();
      const matches = text.matchAll(/\b([A-Z][a-zA-Z0-9]*|[a-z][a-zA-Z0-9]*)\b/g);
      for (const match of matches) {
        if (match[1].length > 2) identifiers.add(match[1]);
      }
      return identifiers;
    };
    
    const ids1 = extractIdentifiers(chunk1);
    const ids2 = extractIdentifiers(chunk2);
    
    // Check for common identifiers (shared classes, functions, variables)
    const intersection = new Set([...ids1].filter(x => ids2.has(x)));
    return intersection.size > 2; // If they share more than 2 meaningful identifiers
  }

  extractRelevantLines(content, maxLines) {
    const lines = content.split('\n');
    const relevantLines = [];
    
    for (const line of lines.slice(0, maxLines)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        relevantLines.push(line);
      }
    }
    
    return relevantLines.join('\n');
  }

  extractRelevantImports(chunkContent, availableImports) {
    const relevantImports = [];
    
    for (const importPath of availableImports) {
      // Extract module name from import path
      const moduleName = importPath.split('/').pop()?.replace(/\.(js|ts|jsx|tsx)$/, '');
      
      if (moduleName && chunkContent.toLowerCase().includes(moduleName.toLowerCase())) {
        relevantImports.push(importPath);
      }
    }
    
    return relevantImports.slice(0, 5); // Limit to 5 most relevant
  }

  /**
   * 2. Quality Filtering - Remove low-quality chunks
   */
  filterLowQualityChunks(chunks) {
    return chunks.filter(chunk => {
      const quality = this.calculateChunkQuality(chunk);
      chunk.metadata.quality_score = quality;
      return quality >= this.minChunkQuality;
    });
  }

  calculateChunkQuality(chunk) {
    const content = chunk.pageContent;
    let score = 1.0;
    
    // Penalize very short chunks (less meaningful)
    if (content.length < 100) score -= 0.3;
    
    // Penalize chunks that are mostly comments
    const lines = content.split('\n');
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('*') || 
      line.trim().startsWith('#')
    ).length;
    
    if (commentLines / lines.length > 0.7) score -= 0.2;
    
    // Penalize chunks with excessive whitespace
    const nonWhitespaceRatio = content.replace(/\s/g, '').length / content.length;
    if (nonWhitespaceRatio < 0.3) score -= 0.2;
    
    // Bonus for chunks with structured content
    if (content.includes('function') || content.includes('class') || content.includes('def')) {
      score += 0.1;
    }
    
    // Bonus for chunks with meaningful comments/documentation
    if (content.includes('/**') || content.includes('"""') || content.includes('Args:')) {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 3. Deduplication - Remove similar chunks
   */
  deduplicateChunks(chunks) {
    const uniqueChunks = [];
    const seenHashes = new Set();
    
    for (const chunk of chunks) {
      const contentHash = this.calculateContentHash(chunk.pageContent);
      
      if (!seenHashes.has(contentHash)) {
        // Check similarity with existing chunks
        const isDuplicate = uniqueChunks.some(existingChunk => 
          this.calculateSimilarity(chunk.pageContent, existingChunk.pageContent) > this.maxSimilarityThreshold
        );
        
        if (!isDuplicate) {
          uniqueChunks.push(chunk);
          seenHashes.add(contentHash);
        } else {
          console.log(`[${new Date().toISOString()}] 🗑️ DEDUPE: Removed similar chunk`);
        }
      }
    }
    
    return uniqueChunks;
  }

  calculateContentHash(content) {
    // Simple hash for exact duplicate detection
    const normalized = content.replace(/\s+/g, ' ').trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  calculateSimilarity(text1, text2) {
    // Simple Jaccard similarity for near-duplicate detection
    const getWords = (text) => new Set(text.toLowerCase().split(/\s+/));
    
    const words1 = getWords(text1);
    const words2 = getWords(text2);
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * 4. Add Synthetic Questions for Better Retrieval
   */
  async addSyntheticQuestions(chunks) {
    const enhancedChunks = [];
    
    for (const chunk of chunks) {
      const questions = this.generateSyntheticQuestions(chunk);
      
      enhancedChunks.push({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          synthetic_questions: questions,
          searchable_content: `${chunk.pageContent}\n\nRelated questions: ${questions.join(' ')}`
        }
      });
    }
    
    return enhancedChunks;
  }

  generateSyntheticQuestions(chunk) {
    const content = chunk.pageContent;
    const questions = [];
    
    // For code chunks
    if (chunk.metadata?.file_type === 'code') {
      // Function questions
      const functionMatches = content.matchAll(/function\s+(\w+)|def\s+(\w+)|(\w+)\s*=\s*\(/g);
      for (const match of functionMatches) {
        const funcName = match[1] || match[2] || match[3];
        if (funcName) {
          questions.push(`How does ${funcName} work?`);
          questions.push(`What does ${funcName} do?`);
          questions.push(`How to use ${funcName}?`);
        }
      }
      
      // Class questions
      const classMatches = content.matchAll(/class\s+(\w+)/g);
      for (const match of classMatches) {
        questions.push(`What is ${match[1]} class?`);
        questions.push(`How to use ${match[1]}?`);
      }
    }
    
    // For documentation chunks
    if (chunk.metadata?.file_type === 'documentation') {
      // Header-based questions
      const headerMatches = content.matchAll(/#{1,6}\s+(.+)/g);
      for (const match of headerMatches) {
        const headerText = match[1].trim();
        questions.push(`${headerText}?`);
        questions.push(`How to ${headerText.toLowerCase()}?`);
      }
    }
    
    // Generic questions based on content
    if (content.includes('install') || content.includes('setup')) {
      questions.push('How to install?');
      questions.push('Setup instructions?');
    }
    
    if (content.includes('example') || content.includes('usage')) {
      questions.push('How to use?');
      questions.push('Usage example?');
    }
    
    return questions.slice(0, 5); // Limit to 5 questions per chunk
  }

  /**
   * 5. Enhance Retrieval Metadata
   */
  enhanceRetrievalMetadata(chunks) {
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        // Add searchable keywords
        keywords: this.extractKeywords(chunk.pageContent),
        
        // Add content category
        content_category: this.categorizeContent(chunk.pageContent),
        
        // Add complexity level
        complexity_level: this.assessComplexity(chunk.pageContent),
        
        // Add token info for better chunking decisions
        estimated_tokens: Math.ceil(chunk.pageContent.length / 3.5),
        
        // Add postprocessing timestamp
        postprocessed_at: new Date().toISOString()
      }
    }));
  }

  extractKeywords(content) {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isCommonWord(word));
    
    const frequency = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  categorizeContent(content) {
    const lower = content.toLowerCase();
    
    if (lower.includes('function') || lower.includes('method') || lower.includes('def ')) {
      return 'function_implementation';
    } else if (lower.includes('class ') || lower.includes('interface ')) {
      return 'class_definition';
    } else if (lower.includes('import ') || lower.includes('require(')) {
      return 'imports_dependencies';
    } else if (lower.includes('test') || lower.includes('spec')) {
      return 'test_code';
    } else if (lower.includes('config') || lower.includes('setting')) {
      return 'configuration';
    } else if (lower.includes('# ') || lower.includes('## ')) {
      return 'documentation';
    } else {
      return 'general_content';
    }
  }

  assessComplexity(content) {
    let complexity = 0;
    
    // Count control flow statements
    const controlFlowPatterns = [
      /\bif\b/g, /\belse\b/g, /\bwhile\b/g, /\bfor\b/g, 
      /\bswitch\b/g, /\btry\b/g, /\bcatch\b/g
    ];
    
    for (const pattern of controlFlowPatterns) {
      const matches = content.match(pattern);
      if (matches) complexity += matches.length;
    }
    
    // Count nesting levels
    const openBraces = (content.match(/\{/g) || []).length;
    const indentationLevels = Math.max(...content.split('\n').map(line => 
      line.match(/^\s*/)[0].length
    )) / 2;
    
    complexity += Math.floor(indentationLevels / 4);
    
    if (complexity <= 2) return 'simple';
    if (complexity <= 5) return 'moderate';
    return 'complex';
  }

  isCommonWord(word) {
    const commonWords = new Set([
      'this', 'that', 'with', 'from', 'they', 'them', 'their', 'there', 'where',
      'when', 'what', 'which', 'will', 'would', 'should', 'could', 'function',
      'method', 'class', 'object', 'string', 'number', 'boolean', 'array'
    ]);
    
    return commonWords.has(word);
  }
}

module.exports = ChunkPostprocessor;
