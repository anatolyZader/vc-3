/**
 * ModernVectorSearchOrchestrator - Advanced vector search implementation
 * 
 * Replaces the old vectorSearchOrchestrator with a modern implementation
 * that uses the centralized PineconeService for efficient similarity search.
 */

const PineconeService = require('../pinecone/PineconeService');

class ModernVectorSearchOrchestrator {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.rateLimiter = options.rateLimiter;
    
    // Initialize PineconeService
    this.pineconeService = new PineconeService({
      rateLimiter: this.rateLimiter,
      apiKey: options.apiKey,
      indexName: options.indexName,
      region: options.region
    });

    // Search configuration
    this.defaultTopK = options.defaultTopK || 10;
    this.defaultThreshold = options.defaultThreshold || 0.7;
    this.maxResults = options.maxResults || 50;

    this.logger = {
      info: (msg, ...args) => console.log(`[${new Date().toISOString()}] [VectorSearch] ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`[${new Date().toISOString()}] [VectorSearch] ${msg}`, ...args),
      error: (msg, ...args) => console.error(`[${new Date().toISOString()}] [VectorSearch] ${msg}`, ...args),
      debug: (msg, ...args) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${new Date().toISOString()}] [VectorSearch:DEBUG] ${msg}`, ...args);
        }
      }
    };
  }

  /**
   * Perform semantic similarity search
   */
  async searchSimilar(query, options = {}) {
    const {
      namespace = null,
      topK = this.defaultTopK,
      threshold = this.defaultThreshold,
      filter = null,
      includeMetadata = true,
      includeValues = false
    } = options;

    this.logger.info(`🔍 Searching for similar documents: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    this.logger.debug(`Search parameters: namespace=${namespace}, topK=${topK}, threshold=${threshold}`);

    try {
      // Generate query embedding
      this.logger.debug('Generating query embedding...');
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Perform vector search
      const searchResults = await this.pineconeService.querySimilar(queryEmbedding, {
        namespace,
        topK: Math.min(topK, this.maxResults),
        filter,
        includeMetadata,
        includeValues
      });

      // Filter results by similarity threshold
      const filteredMatches = searchResults.matches
        ?.filter(match => match.score >= threshold)
        .map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
          values: includeValues ? match.values : undefined
        })) || [];

      this.logger.info(`📊 Found ${filteredMatches.length} relevant documents (threshold: ${threshold})`);
      
      if (filteredMatches.length > 0) {
        this.logger.debug('Top matches:', filteredMatches.slice(0, 3).map(m => ({
          id: m.id,
          score: m.score.toFixed(3),
          source: m.metadata?.source || 'unknown'
        })));
      }

      return {
        matches: filteredMatches,
        query,
        namespace,
        totalFound: searchResults.matches?.length || 0,
        filteredCount: filteredMatches.length,
        searchTime: Date.now()
      };

    } catch (error) {
      this.logger.error('Error performing similarity search:', error.message);
      throw error;
    }
  }

  /**
   * Advanced search with multiple strategies
   */
  async advancedSearch(query, options = {}) {
    const {
      namespace = null,
      strategies = ['semantic', 'keyword'],
      combineResults = true,
      topK = this.defaultTopK,
      threshold = this.defaultThreshold
    } = options;

    this.logger.info(`🎯 Advanced search using strategies: ${strategies.join(', ')}`);

    const results = {};

    // Semantic search
    if (strategies.includes('semantic')) {
      try {
        results.semantic = await this.searchSimilar(query, {
          namespace,
          topK,
          threshold,
          includeMetadata: true
        });
        this.logger.debug(`Semantic search found ${results.semantic.filteredCount} results`);
      } catch (error) {
        this.logger.warn('Semantic search failed:', error.message);
        results.semantic = { matches: [], error: error.message };
      }
    }

    // Keyword-based metadata search
    if (strategies.includes('keyword')) {
      try {
        results.keyword = await this.keywordSearch(query, {
          namespace,
          topK,
          threshold
        });
        this.logger.debug(`Keyword search found ${results.keyword.filteredCount} results`);
      } catch (error) {
        this.logger.warn('Keyword search failed:', error.message);
        results.keyword = { matches: [], error: error.message };
      }
    }

    // Combine results if requested
    if (combineResults && results.semantic && results.keyword) {
      const combined = this.combineSearchResults(results.semantic, results.keyword);
      results.combined = combined;
      this.logger.info(`📈 Combined search yielded ${combined.matches.length} unique results`);
    }

    return results;
  }

  /**
   * Keyword-based search using metadata filters
   */
  async keywordSearch(query, options = {}) {
    const {
      namespace = null,
      topK = this.defaultTopK,
      threshold = 0.0 // Lower threshold for keyword search
    } = options;

    // Extract potential keywords for metadata filtering
    const keywords = this.extractKeywords(query);
    
    // Create metadata filters for common fields
    const filters = this.createKeywordFilters(keywords);

    this.logger.debug(`Keyword search with filters for: ${keywords.join(', ')}`);

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Search with metadata filters
      const searchResults = await this.pineconeService.querySimilar(queryEmbedding, {
        namespace,
        topK,
        filter: filters,
        includeMetadata: true
      });

      const filteredMatches = searchResults.matches
        ?.filter(match => match.score >= threshold)
        .map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
          matchType: 'keyword'
        })) || [];

      return {
        matches: filteredMatches,
        query,
        keywords,
        filters,
        namespace,
        totalFound: searchResults.matches?.length || 0,
        filteredCount: filteredMatches.length
      };

    } catch (error) {
      this.logger.error('Keyword search failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract keywords from query text
   */
  extractKeywords(query) {
    // Simple keyword extraction - can be enhanced with NLP
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Create metadata filters for keyword search
   */
  createKeywordFilters(keywords) {
    if (keywords.length === 0) {
      return null;
    }

    // Create OR filters for various metadata fields
    const orConditions = [];

    keywords.forEach(keyword => {
      // Search in source paths
      orConditions.push({ source: { $regex: `.*${keyword}.*` } });
      
      // Search in file types
      orConditions.push({ fileType: { $regex: `.*${keyword}.*` } });
      
      // Search in module names
      orConditions.push({ eventstorm_module: { $regex: `.*${keyword}.*` } });
      
      // Search in semantic roles
      orConditions.push({ semantic_role: { $regex: `.*${keyword}.*` } });
    });

    return orConditions.length > 0 ? { $or: orConditions } : null;
  }

  /**
   * Combine results from multiple search strategies
   */
  combineSearchResults(semanticResults, keywordResults) {
    const combined = new Map();

    // Add semantic results with higher weight
    semanticResults.matches?.forEach(match => {
      combined.set(match.id, {
        ...match,
        combinedScore: match.score * 0.7, // Semantic weight
        sources: ['semantic']
      });
    });

    // Add keyword results
    keywordResults.matches?.forEach(match => {
      if (combined.has(match.id)) {
        // Boost score if found in both searches
        const existing = combined.get(match.id);
        existing.combinedScore += match.score * 0.3; // Keyword weight
        existing.sources.push('keyword');
      } else {
        combined.set(match.id, {
          ...match,
          combinedScore: match.score * 0.3,
          sources: ['keyword']
        });
      }
    });

    // Sort by combined score
    const sortedMatches = Array.from(combined.values())
      .sort((a, b) => b.combinedScore - a.combinedScore);

    return {
      matches: sortedMatches,
      totalUnique: sortedMatches.length,
      semanticCount: semanticResults.filteredCount || 0,
      keywordCount: keywordResults.filteredCount || 0
    };
  }

  /**
   * Search within specific repository
   */
  async searchInRepository(query, userId, repoId, options = {}) {
    const {
      topK = this.defaultTopK,
      threshold = this.defaultThreshold,
      fileTypes = null,
      semanticRoles = null
    } = options;

    this.logger.info(`🏠 Searching within repository: ${repoId} for user: ${userId}`);

    // Create repository-specific filters
    const filters = this.createRepositoryFilters(repoId, fileTypes, semanticRoles);

    return await this.searchSimilar(query, {
      namespace: userId,
      topK,
      threshold,
      filter: filters,
      includeMetadata: true
    });
  }

  /**
   * Create filters for repository-specific search
   */
  createRepositoryFilters(repoId, fileTypes, semanticRoles) {
    const filters = {};

    if (repoId) {
      filters.repoId = repoId;
    }

    if (fileTypes && fileTypes.length > 0) {
      filters.fileType = { $in: fileTypes };
    }

    if (semanticRoles && semanticRoles.length > 0) {
      filters.semantic_role = { $in: semanticRoles };
    }

    return Object.keys(filters).length > 0 ? filters : null;
  }

  /**
   * Get namespace statistics
   */
  async getSearchableContent(namespace) {
    try {
      const stats = await this.pineconeService.getNamespaceStats(namespace);
      return stats;
    } catch (error) {
      this.logger.error(`Error getting searchable content for ${namespace}:`, error.message);
      throw error;
    }
  }

  /**
   * Create vector store for LangChain integration
   */
  async createVectorStore(namespace = null) {
    if (!this.embeddings) {
      throw new Error('Embeddings model not provided');
    }

    return await this.pineconeService.createVectorStore(this.embeddings, namespace);
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.pineconeService.isConnectedToIndex();
  }

  /**
   * Disconnect from Pinecone
   */
  async disconnect() {
    await this.pineconeService.disconnect();
    this.logger.info('Vector search orchestrator disconnected');
  }
}

module.exports = ModernVectorSearchOrchestrator;