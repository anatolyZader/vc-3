// hybridSearchService.js
'use strict';

/**
 * HybridSearchService - Combines vector and text search capabilities
 * 
 * This service orchestrates both Pinecone vector search and PostgreSQL text search
 * to provide comprehensive search functionality. It can run both searches in parallel
 * and merge/rank the results intelligently.
 */
class HybridSearchService {
  constructor({ 
    vectorSearchOrchestrator, 
    textSearchService, 
    logger = console 
  }) {
    this.vectorSearchOrchestrator = vectorSearchOrchestrator;
    this.textSearchService = textSearchService;
    this.logger = logger;
  }

  /**
   * Perform hybrid search combining vector and text search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @param {string} options.userId - User ID filter
   * @param {string} options.repoId - Repository ID filter
   * @param {number} options.limit - Total result limit (default: 10)
   * @param {boolean} options.includeVector - Include vector search results (default: true)
   * @param {boolean} options.includeText - Include text search results (default: true)
   * @param {string} options.strategy - Merge strategy: 'interleave', 'vector_first', 'text_first' (default: 'interleave')
   * @param {string} options.namespace - Vector search namespace
   * @returns {Array} Combined and ranked search results
   */
  async search(query, options = {}) {
    const {
      userId = null,
      repoId = null,
      limit = 10,
      includeVector = true,
      includeText = true,
      strategy = 'interleave',
      namespace = null
    } = options;

    this.logger.info(`🔄 Starting hybrid search: "${query}" (vector: ${includeVector}, text: ${includeText})`);

    const searchPromises = [];
    
    // Prepare vector search
    if (includeVector && this.vectorSearchOrchestrator) {
      searchPromises.push(
        this.performVectorSearch(query, { namespace, userId, repoId, limit: Math.ceil(limit * 1.5) })
          .catch(error => {
            this.logger.warn('Vector search failed:', error.message);
            return [];
          })
      );
    } else {
      searchPromises.push(Promise.resolve([]));
    }

    // Prepare text search
    if (includeText && this.textSearchService) {
      searchPromises.push(
        this.textSearchService.searchDocuments(query, { userId, repoId, limit: Math.ceil(limit * 1.5) })
          .catch(error => {
            this.logger.warn('Text search failed:', error.message);
            return [];
          })
      );
    } else {
      searchPromises.push(Promise.resolve([]));
    }

    // Execute searches in parallel
    const [vectorResults, textResults] = await Promise.all(searchPromises);

    this.logger.info(`📊 Search results: ${vectorResults.length} vector, ${textResults.length} text`);

    // Merge and rank results
    const mergedResults = this.mergeResults(vectorResults, textResults, strategy);
    
    // Apply final limit and deduplication
    const finalResults = this.deduplicateAndLimit(mergedResults, limit);

    this.logger.info(`✅ Hybrid search completed: ${finalResults.length} final results`);
    
    return finalResults;
  }

  /**
   * Perform vector search with error handling
   * @private
   */
  async performVectorSearch(query, options = {}) {
    try {
      const vectorResults = await this.vectorSearchOrchestrator.searchSimilar(query, {
        namespace: options.namespace,
        topK: options.limit || 10,
        threshold: 0.3,
        includeMetadata: true
      });

      // Normalize vector results to common format
      return vectorResults.map(result => ({
        id: result.id || `vector_${Date.now()}_${Math.random()}`,
        content: result.pageContent || result.metadata?.text || '',
        rank: result.score || 0,
        searchType: 'vector',
        source: 'pinecone',
        metadata: result.metadata || {},
        snippet: this.createSnippet(result.pageContent || result.metadata?.text || '', query)
      }));
    } catch (error) {
      this.logger.error('Vector search error in hybrid search:', error);
      return [];
    }
  }

  /**
   * Merge results from different search types
   * @private
   */
  mergeResults(vectorResults, textResults, strategy) {
    const allResults = [];

    switch (strategy) {
      case 'vector_first':
        allResults.push(...vectorResults, ...textResults);
        break;
      
      case 'text_first':
        allResults.push(...textResults, ...vectorResults);
        break;
      
      case 'interleave':
      default:
        // Interleave results by alternating between vector and text
        const maxLength = Math.max(vectorResults.length, textResults.length);
        for (let i = 0; i < maxLength; i++) {
          if (i < vectorResults.length) allResults.push(vectorResults[i]);
          if (i < textResults.length) allResults.push(textResults[i]);
        }
        break;
    }

    return allResults;
  }

  /**
   * Remove duplicate results and apply limit
   * @private
   */
  deduplicateAndLimit(results, limit) {
    const seen = new Set();
    const unique = [];

    for (const result of results) {
      // Create a simple deduplication key based on content similarity
      const contentKey = this.createContentKey(result.content);
      
      if (!seen.has(contentKey) && unique.length < limit) {
        seen.add(contentKey);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Create a key for content deduplication
   * @private
   */
  createContentKey(content) {
    if (!content) return '';
    
    // Simple approach: use first 100 characters normalized
    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  /**
   * Create a snippet from content
   * @private
   */
  createSnippet(content, searchTerm, maxLength = 150) {
    if (!content) return '';
    
    const searchIndex = content.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (searchIndex === -1) return content.substring(0, maxLength);

    const start = Math.max(0, searchIndex - 50);
    const end = Math.min(content.length, searchIndex + searchTerm.length + 50);
    
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  }

  /**
   * Get comprehensive search statistics
   * @param {string} userId - Optional user filter
   * @param {string} repoId - Optional repo filter
   * @returns {object} Combined statistics from both search systems
   */
  async getSearchCapabilities(userId = null, repoId = null) {
    const capabilities = {
      textSearch: {
        available: false,
        stats: null
      },
      vectorSearch: {
        available: false,
        stats: null
      }
    };

    // Check text search capabilities
    if (this.textSearchService) {
      try {
        capabilities.textSearch.available = await this.textSearchService.isAvailable();
        if (capabilities.textSearch.available) {
          capabilities.textSearch.stats = await this.textSearchService.getSearchStats(userId, repoId);
        }
      } catch (error) {
        this.logger.warn('Failed to get text search capabilities:', error.message);
      }
    }

    // Check vector search capabilities
    if (this.vectorSearchOrchestrator) {
      try {
        capabilities.vectorSearch.available = this.vectorSearchOrchestrator.isConnected();
        // Add more vector stats if needed
      } catch (error) {
        this.logger.warn('Failed to get vector search capabilities:', error.message);
      }
    }

    return capabilities;
  }

  /**
   * Test both search systems with a simple query
   * @param {string} testQuery - Query to test with (default: 'test')
   * @returns {object} Test results from both systems
   */
  async testSearchSystems(testQuery = 'function') {
    const results = {
      textSearch: { success: false, results: [], error: null },
      vectorSearch: { success: false, results: [], error: null }
    };

    // Test text search
    if (this.textSearchService) {
      try {
        const textResults = await this.textSearchService.searchDocumentsSimple(testQuery, { limit: 3 });
        results.textSearch.success = true;
        results.textSearch.results = textResults;
      } catch (error) {
        results.textSearch.error = error.message;
      }
    }

    // Test vector search
    if (this.vectorSearchOrchestrator) {
      try {
        const vectorResults = await this.performVectorSearch(testQuery, { limit: 3 });
        results.vectorSearch.success = true;
        results.vectorSearch.results = vectorResults;
      } catch (error) {
        results.vectorSearch.error = error.message;
      }
    }

    return results;
  }
}

module.exports = HybridSearchService;