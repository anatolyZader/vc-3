// Advanced Retrieval Strategies for Production RAG
'use strict';

const { PineconeStore } = require('@langchain/pinecone');

class AdvancedRetriever {
  constructor({ pinecone, embeddings, userId }) {
    this.pinecone = pinecone;
    this.embeddings = embeddings;
    this.userId = userId;
    this.indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
  }

  // 1. Hybrid Search: Combine semantic similarity with metadata filtering
  async hybridSearch(processedQuery, options = {}) {
    const {
      topK = 15,
      diversityThreshold = 0.7,
      sourceTypeWeights = {
        'apiSpec': 1.2,
        'root_documentation': 1.1, 
        'module_documentation': 1.0,
        'githubCode': 0.9
      }
    } = options;

    const results = [];
    const classification = processedQuery.classification;

    // Create multiple vector stores for different namespaces
    const vectorStores = {
      user: new PineconeStore(this.embeddings, {
        pineconeIndex: this.pinecone.Index(this.indexName),
        namespace: this.userId
      }),
      coreDocs: new PineconeStore(this.embeddings, {
        pineconeIndex: this.pinecone.Index(this.indexName),
        namespace: 'core-docs'
      })
    };

    // 2. Multi-query retrieval with different strategies
    for (const query of processedQuery.searchQueries) {
      try {
        // Strategy 1: Semantic similarity search
        const semanticResults = await this.semanticSearch(vectorStores, query, {
          topK: Math.ceil(topK / processedQuery.searchQueries.length),
          classification
        });

        // Strategy 2: Metadata-filtered search
        const filteredResults = await this.metadataFilteredSearch(vectorStores, query, {
          topK: Math.ceil(topK / processedQuery.searchQueries.length),
          classification
        });

        results.push(...semanticResults, ...filteredResults);
      } catch (error) {
        console.warn(`Search failed for query "${query}":`, error.message);
      }
    }

    // 3. Deduplicate and rank results
    const uniqueResults = this.deduplicateResults(results);
    const rankedResults = this.rankResults(uniqueResults, processedQuery, sourceTypeWeights);
    
    // 4. Apply diversity filtering
    const diverseResults = this.applyDiversityFilter(rankedResults, diversityThreshold);

    console.log(`🔍 HYBRID SEARCH: Retrieved ${diverseResults.length} diverse results from ${results.length} total matches`);
    
    return diverseResults.slice(0, topK);
  }

  // Semantic similarity search
  async semanticSearch(vectorStores, query, options) {
    const results = [];
    
    // Search user namespace
    try {
      const userResults = await vectorStores.user.similaritySearchWithScore(query, options.topK);
      results.push(...userResults.map(([doc, score]) => ({ ...doc, score, namespace: 'user' })));
    } catch (error) {
      console.warn('User namespace search failed:', error.message);
    }

    // Search core docs namespace
    try {
      const coreResults = await vectorStores.coreDocs.similaritySearchWithScore(query, options.topK);
      results.push(...coreResults.map(([doc, score]) => ({ ...doc, score, namespace: 'core-docs' })));
    } catch (error) {
      console.warn('Core docs namespace search failed:', error.message);
    }

    return results;
  }

  // Metadata-filtered search based on query classification
  async metadataFilteredSearch(vectorStores, query, options) {
    const { classification } = options;
    const results = [];

    // Define filters based on query classification
    const filters = this.buildMetadataFilters(classification);

    for (const filter of filters) {
      try {
        // Apply filter to user namespace
        const userResults = await vectorStores.user.similaritySearchWithScore(query, 
          Math.ceil(options.topK / filters.length), 
          filter
        );
        results.push(...userResults.map(([doc, score]) => ({ 
          ...doc, 
          score, 
          namespace: 'user',
          filterApplied: filter 
        })));

        // Apply filter to core docs namespace
        const coreResults = await vectorStores.coreDocs.similaritySearchWithScore(query, 
          Math.ceil(options.topK / filters.length), 
          filter
        );
        results.push(...coreResults.map(([doc, score]) => ({ 
          ...doc, 
          score, 
          namespace: 'core-docs',
          filterApplied: filter 
        })));
      } catch (error) {
        console.warn(`Filtered search failed for filter ${JSON.stringify(filter)}:`, error.message);
      }
    }

    return results;
  }

  // Build metadata filters based on query classification
  buildMetadataFilters(classification) {
    const filters = [];

    switch (classification.primary_category) {
      case 'API_USAGE':
        filters.push(
          { type: { $in: ['apiSpec', 'apiSpecFull', 'apiSpecEndpoints'] } },
          { source: { $regex: 'api' } }
        );
        break;
        
      case 'CODE_IMPLEMENTATION':
        filters.push(
          { type: { $in: ['githubCode'] } },
          { source: { $regex: '\\.(js|ts|jsx|tsx)$' } }
        );
        break;
        
      case 'ARCHITECTURE':
        filters.push(
          { type: { $in: ['root_documentation', 'architecture_documentation'] } },
          { source: { $regex: 'ARCHITECTURE|README' } }
        );
        break;
        
      case 'CONFIGURATION':
        filters.push(
          { type: { $in: ['root_documentation'] } },
          { source: { $regex: '\\.(json|yaml|yml|env)$' } }
        );
        break;
        
      default:
        // General search - no specific filters
        filters.push({});
    }

    return filters.length > 0 ? filters : [{}];
  }

  // Remove duplicate results based on content similarity
  deduplicateResults(results) {
    const unique = [];
    const seen = new Set();

    for (const result of results) {
      // Create a hash based on content and source
      const contentHash = this.hashContent(result.pageContent, result.metadata?.source);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(result);
      }
    }

    return unique;
  }

  // Simple content hashing for deduplication
  hashContent(content, source) {
    const key = `${source}:${content.substring(0, 100)}`;
    return key.replace(/\s+/g, ' ').toLowerCase();
  }

  // Rank results based on relevance, source type, and other factors
  rankResults(results, processedQuery, sourceTypeWeights) {
    return results.map(result => {
      let score = result.score || 0;
      
      // Apply source type weighting
      const sourceType = result.metadata?.type || 'unknown';
      const weight = sourceTypeWeights[sourceType] || 1.0;
      score *= weight;

      // Boost results that match query keywords
      const keywordMatches = processedQuery.classification.keywords.filter(keyword =>
        result.pageContent.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      score += keywordMatches * 0.1;

      // Boost results from preferred namespaces for certain query types
      if (processedQuery.classification.primary_category === 'CODE_IMPLEMENTATION' && 
          result.namespace === 'user') {
        score *= 1.2;
      }

      return { ...result, finalScore: score };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }

  // Apply diversity filter to avoid too many similar results
  applyDiversityFilter(rankedResults, threshold) {
    const diverse = [];
    const sources = new Set();
    const contentHashes = new Set();

    for (const result of rankedResults) {
      const source = result.metadata?.source || 'unknown';
      const contentHash = this.hashContent(result.pageContent, source);
      
      // Calculate diversity score
      const diversityScore = this.calculateDiversityScore(result, diverse);
      
      // Include if diverse enough or high quality
      if (diversityScore >= threshold || result.finalScore > 0.9 || diverse.length < 3) {
        diverse.push(result);
        sources.add(source);
        contentHashes.add(contentHash);
      }

      // Stop if we have enough diverse results
      if (diverse.length >= 15) break;
    }

    return diverse;
  }

  // Calculate how diverse a result is compared to already selected results
  calculateDiversityScore(candidate, selectedResults) {
    if (selectedResults.length === 0) return 1.0;

    let diversityScore = 1.0;
    const candidateSource = candidate.metadata?.source || '';
    const candidateType = candidate.metadata?.type || '';

    for (const selected of selectedResults) {
      const selectedSource = selected.metadata?.source || '';
      const selectedType = selected.metadata?.type || '';

      // Reduce diversity score for similar sources
      if (candidateSource === selectedSource) {
        diversityScore *= 0.5;
      }

      // Reduce diversity score for same types (but less penalty)
      if (candidateType === selectedType) {
        diversityScore *= 0.8;
      }

      // Content similarity check (simple)
      const contentSimilarity = this.calculateContentSimilarity(
        candidate.pageContent, 
        selected.pageContent
      );
      diversityScore *= (1 - contentSimilarity * 0.3);
    }

    return Math.max(diversityScore, 0.1); // Minimum diversity score
  }

  // Simple content similarity calculation
  calculateContentSimilarity(content1, content2) {
    const words1 = new Set(content1.toLowerCase().split(/\W+/));
    const words2 = new Set(content2.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  // 3. Contextual Retrieval - retrieve documents based on conversation context
  async contextualRetrieval(processedQuery, conversationHistory, topK = 5) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return [];
    }

    console.log(`🔍 CONTEXTUAL RETRIEVAL: Searching based on conversation context`);

    // Extract context from recent conversation
    const contextTerms = conversationHistory
      .slice(-3) // Last 3 exchanges
      .flatMap(exchange => [
        ...exchange.prompt.split(/\W+/).filter(word => word.length > 3),
        ...exchange.response.split(/\W+/).filter(word => word.length > 3)
      ])
      .filter((term, index, array) => array.indexOf(term) === index) // Unique terms
      .slice(0, 10); // Top 10 terms

    if (contextTerms.length === 0) return [];

    // Create context-enhanced query
    const contextQuery = `${processedQuery.originalQuery} ${contextTerms.join(' ')}`;

    // Search with context
    const vectorStores = {
      user: new PineconeStore(this.embeddings, {
        pineconeIndex: this.pinecone.Index(this.indexName),
        namespace: this.userId
      }),
      coreDocs: new PineconeStore(this.embeddings, {
        pineconeIndex: this.pinecone.Index(this.indexName),
        namespace: 'core-docs'
      })
    };

    const contextResults = await this.semanticSearch(vectorStores, contextQuery, {
      topK: topK,
      classification: processedQuery.classification
    });

    console.log(`🔍 CONTEXTUAL RETRIEVAL: Found ${contextResults.length} contextually relevant documents`);
    return contextResults;
  }
}

module.exports = AdvancedRetriever;
