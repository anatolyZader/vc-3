/**
 * ChunkPostprocessor - Enhances chunks after splitting for better retrieval
 * Handles context enrichment, deduplication, and quality optimization
 * 
 * EMBEDDING SAFETY RULES:
 * 1. NEVER modifies pageContent - embedder must only use this field
 * 2. NO concatenated fields in metadata that mix content with synthetic data
 * 3. Synthetic questions stored as pure metadata for sparse search (BM25/TF-IDF) only
 * 4. Use extractSparseTerms() to safely get keyword search terms
 * 
 * PERFORMANCE & PRECISION IMPROVEMENTS:
 * 5. Robust SHA-1 hashing for exact dedup (prevents collision issues)
 * 6. MMR reranking for relevance + diversity balance
 * 7. Soft diversity penalties instead of hard source caps
 * 8. Reduced complexity algorithms for production scale
 * 
 * This prevents vector contamination and ensures production-ready performance.
 */
class ChunkPostprocessor {
  constructor(options = {}) {
    this.minChunkQuality = options.minChunkQuality || 0.4;
    // Remove unreliable similarity threshold - MMR handles this better
    this.mmrLambda = options.mmrLambda || 0.7; // Balance relevance vs diversity
    this.maxResults = options.maxResults || 30; // Cap early to reduce downstream cost
    
    // Import robust utilities
    this.robustHash = require('./robustHash');
    this.mmr = require('./mmr');
  }

  /**
   * Main post-processing pipeline for chunks
   * PRODUCTION-READY: Fast, precise, embedding-safe
   */
  async postprocessChunks(chunks, originalDocument, options = {}) {
    console.log(`[${new Date().toISOString()}] 🔧 POST-PROCESSING: ${chunks.length} chunks (production mode)`);
    const startTime = Date.now();
    
    let processedChunks = chunks;

    // 1. Context enrichment (metadata only - pageContent untouched)
    processedChunks = await this.enrichChunkContext(processedChunks, originalDocument);
    
    // 2. Quality filtering (based on pageContent, score in metadata)
    processedChunks = this.filterLowQualityChunks(processedChunks);
    
    // 3. Robust exact deduplication (SHA-1 based, fast and collision-resistant)
    processedChunks = this.deduplicateChunks(processedChunks);
    
    // 4. Add synthetic questions (metadata only - never concatenated)
    processedChunks = await this.addSyntheticQuestions(processedChunks);
    
    // 5. Enhance metadata for retrieval (sparse search terms separate)
    processedChunks = this.enhanceRetrievalMetadata(processedChunks);

    // 6. Optional: Rerank with MMR if we have too many results
    if (options.maxResults && processedChunks.length > options.maxResults) {
      processedChunks = this.rerank(processedChunks, options.queryEmbedding, options.maxResults);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ✅ POST-PROCESSING: ${chunks.length} → ${processedChunks.length} chunks (${processingTime}ms, embedding-safe)`);
    return processedChunks;
  }

  /**
   * 1. Context Enrichment - Add surrounding context to metadata (not pageContent)
   */
  async enrichChunkContext(chunks, originalDocument) {
    const enrichedChunks = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const enrichedChunk = { ...chunk };
      
      // Keep pageContent pure - add all context to metadata
      enrichedChunk.metadata = {
        ...chunk.metadata,
        
        // Add file-level context to metadata
        file_header: this.createFileHeader(originalDocument),
        
        // Add surrounding chunks context (for code continuity)
        ...(originalDocument.metadata?.file_type === 'code' && {
          context_prev: this.getPreviousChunkContext(chunks, i),
          context_next: this.getNextChunkContext(chunks, i)
        }),
        
        // Add import context for code chunks
        ...(originalDocument.metadata?.import_dependencies && {
          related_imports: this.extractRelevantImports(
            chunk.pageContent, 
            originalDocument.metadata.import_dependencies
          )
        })
      };
      
      enrichedChunks.push(enrichedChunk);
    }
    
    return enrichedChunks;
  }

  createFileHeader(originalDocument) {
    return {
      file_path: originalDocument.metadata?.source || 'unknown',
      file_type: originalDocument.metadata?.file_type || 'unknown',
      language: originalDocument.metadata?.language,
      main_entities: originalDocument.metadata?.main_entities?.slice(0, 3) || [],
      imports_excluded: originalDocument.metadata?.imports_excluded_from_chunking || false
    };
  }

  getPreviousChunkContext(allChunks, currentIndex) {
    if (currentIndex === 0) return null;
    
    const prevChunk = allChunks[currentIndex - 1];
    const currentChunk = allChunks[currentIndex];
    
    // Only add context if chunks are related
    if (this.isRelatedCodeContext(prevChunk.pageContent, currentChunk.pageContent)) {
      return {
        content: this.extractRelevantLines(prevChunk.pageContent, 3),
        chunk_index: currentIndex - 1,
        relation_score: this.calculateContextRelevance(prevChunk.pageContent, currentChunk.pageContent)
      };
    }
    
    return null;
  }

  getNextChunkContext(allChunks, currentIndex) {
    if (currentIndex >= allChunks.length - 1) return null;
    
    const nextChunk = allChunks[currentIndex + 1];
    const currentChunk = allChunks[currentIndex];
    
    // Only add context if chunks are related
    if (this.isRelatedCodeContext(currentChunk.pageContent, nextChunk.pageContent)) {
      return {
        content: this.extractRelevantLines(nextChunk.pageContent, 3),
        chunk_index: currentIndex + 1,
        relation_score: this.calculateContextRelevance(currentChunk.pageContent, nextChunk.pageContent)
      };
    }
    
    return null;
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

  calculateContextRelevance(chunk1, chunk2) {
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
    
    const intersection = new Set([...ids1].filter(x => ids2.has(x)));
    const union = new Set([...ids1, ...ids2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
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
   * 3. Robust Exact Deduplication - Remove literal duplicates efficiently
   * Uses SHA-1 hashing to prevent collision issues from heuristic approaches
   */
  deduplicateChunks(chunks) {
    const uniqueChunks = [];
    const seenHashes = new Set();
    let duplicatesRemoved = 0;
    
    for (const chunk of chunks) {
      // Use robust SHA-1 hash instead of weak character-based hash
      const contentHash = this.robustHash.sha1Hash(chunk.pageContent);
      
      if (!seenHashes.has(contentHash)) {
        seenHashes.add(contentHash);
        uniqueChunks.push({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            content_hash: contentHash // Store for debugging/tracking
          }
        });
      } else {
        duplicatesRemoved++;
        console.log(`[${new Date().toISOString()}] 🗑️ EXACT_DEDUPE: Removed duplicate (SHA-1 collision)`);
      }
    }
    
    if (duplicatesRemoved > 0) {
      console.log(`[${new Date().toISOString()}] ✅ DEDUPE: Removed ${duplicatesRemoved} exact duplicates via robust hashing`);
    }
    
    return uniqueChunks;
  }

  /**
   * MMR-based reranking for retrieval results
   * Replaces O(n²) similarity checking with efficient relevance+diversity optimization
   */
  rerank(chunks, queryEmbedding = null, maxResults = null) {
    const k = maxResults || this.maxResults;
    
    if (chunks.length <= k) {
      return chunks; // No need to rerank
    }
    
    // Prepare candidates for MMR
    const candidates = chunks.map(chunk => ({
      ...chunk,
      relevance: chunk.metadata?.relevance_score || chunk.metadata?.quality_score || 0.5,
      embedding: chunk.metadata?.embedding || null
    }));
    
    // Apply soft diversity penalties instead of hard caps
    const diversified = this.mmr.applyDiversityPenalties(candidates, 'source');
    
    // Use MMR for final reranking if embeddings available
    if (queryEmbedding && candidates.some(c => c.embedding)) {
      const reranked = this.mmr.mmr(diversified, k, this.mmrLambda);
      console.log(`[${new Date().toISOString()}] 🎯 MMR: Reranked ${chunks.length} → ${reranked.length} (λ=${this.mmrLambda})`);
      return reranked;
    } else {
      // Fallback: sort by relevance with diversity penalties
      const sorted = diversified
        .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
        .slice(0, k);
      console.log(`[${new Date().toISOString()}] 📊 RELEVANCE: Sorted ${chunks.length} → ${sorted.length} by score`);
      return sorted;
    }
  }

  /**
   * 4. Add Synthetic Questions for Better Retrieval
   * CRITICAL: Questions stay in metadata only - never concatenated to any embeddable field
   */
  async addSyntheticQuestions(chunks) {
    const enhancedChunks = [];
    
    for (const chunk of chunks) {
      const questions = this.generateSyntheticQuestions(chunk);
      
      enhancedChunks.push({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          // Store questions as pure metadata for hybrid search (BM25/TF-IDF)
          synthetic_questions: questions,
          // No concatenated fields - embedder must only use pageContent
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

  /**
   * Extract sparse search terms for hybrid search (BM25/TF-IDF)
   * NEVER use this for embeddings - this is for keyword search only
   */
  extractSparseTerms(chunk) {
    const sparseTerms = [];
    
    // Add synthetic questions as sparse terms
    if (chunk.metadata?.synthetic_questions) {
      sparseTerms.push(...chunk.metadata.synthetic_questions);
    }
    
    // Add keywords as sparse terms
    if (chunk.metadata?.keywords) {
      sparseTerms.push(...chunk.metadata.keywords);
    }
    
    // Add file context as sparse terms
    if (chunk.metadata?.file_header) {
      const header = chunk.metadata.file_header;
      if (header.file_path) sparseTerms.push(header.file_path);
      if (header.language) sparseTerms.push(header.language);
      if (header.main_entities) sparseTerms.push(...header.main_entities);
    }
    
    return {
      sparse_terms: sparseTerms,
      warning: 'FOR_SPARSE_SEARCH_ONLY_NOT_FOR_EMBEDDINGS'
    };
  }

  /**
   * Production retrieval pipeline - implements your recommended flow
   * 1. Vector search with smaller topK (reduce downstream cost)
   * 2. Exact dedup via robust hash
   * 3. Optional near-duplicate detection for large K
   * 4. MMR rerank with relevance vs diversity
   * 5. Soft diversity penalties instead of hard caps
   */
  async processRetrievalResults(results, queryEmbedding, options = {}) {
    const {
      initialK = 50,        // Reduced from typical 100 to cut O(n²) operations
      finalK = 20,          // Final results after reranking
      lambda = 0.7,         // MMR balance: higher = more relevance, lower = more diversity
      enableNearDedupe = false,  // Set true if scaling beyond K=50
      diversityField = 'source'  // Field to use for soft diversity penalties
    } = options;

    console.log(`[${new Date().toISOString()}] 🔍 RETRIEVAL: Processing ${results.length} results (production pipeline)`);
    const startTime = Date.now();

    // Step 1: Early K reduction - already done by vector search
    let processedResults = results.slice(0, initialK);
    
    // Step 2: Robust exact deduplication (fast path)
    const seenHashes = new Set();
    processedResults = processedResults.filter(result => {
      const hash = this.robustHash.sha1Hash(result.pageContent || '');
      if (seenHashes.has(hash)) {
        return false; // Skip duplicate
      }
      seenHashes.add(hash);
      result.metadata = result.metadata || {};
      result.metadata.content_hash = hash;
      return true;
    });

    // Step 3: Optional near-duplicate detection for larger scales
    if (enableNearDedupe && processedResults.length > 30) {
      // TODO: Implement LSH-based near-duplicate clustering if needed
      console.log(`[${new Date().toISOString()}] ⚠️  Near-dedupe recommended for ${processedResults.length} results but not implemented`);
    }

    // Step 4: Apply soft diversity penalties
    processedResults = this.mmr.applyDiversityPenalties(processedResults, diversityField);

    // Step 5: MMR reranking for relevance + diversity
    const candidates = processedResults.map(result => ({
      ...result,
      relevance: result.score || result.metadata?.relevance_score || 0.5,
      embedding: result.embedding || result.metadata?.embedding
    }));

    const finalResults = this.mmr.mmr(candidates, finalK, lambda);

    const processingTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ✅ RETRIEVAL: ${results.length} → ${processedResults.length} → ${finalResults.length} results (${processingTime}ms, λ=${lambda})`);

    // Add retrieval metadata
    return finalResults.map((result, index) => ({
      ...result,
      metadata: {
        ...result.metadata,
        retrieval_rank: index + 1,
        retrieval_score: result.relevance,
        diversity_penalty: result.diversity_penalty || 1.0,
        processed_at: new Date().toISOString()
      }
    }));
  }

  /**
   * Metrics tracking for retrieval quality
   * Use these to tune λ and penalties, not hard-coded rules
   */
  computeRetrievalMetrics(results) {
    if (!results || results.length === 0) return {};

    // Source type distribution
    const sourceTypes = {};
    results.forEach(result => {
      const type = result.metadata?.source || result.metadata?.file_type || 'unknown';
      sourceTypes[type] = (sourceTypes[type] || 0) + 1;
    });

    // Diversity metrics
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < results.length - 1; i++) {
      for (let j = i + 1; j < results.length; j++) {
        if (results[i].embedding && results[j].embedding) {
          const similarity = this.mmr.cosine(results[i].embedding, results[j].embedding);
          totalSimilarity += similarity;
          comparisons++;
        }
      }
    }

    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

    return {
      result_count: results.length,
      source_distribution: sourceTypes,
      avg_inter_result_similarity: avgSimilarity,
      diversity_score: 1 - avgSimilarity, // Higher is more diverse
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ChunkPostprocessor;
