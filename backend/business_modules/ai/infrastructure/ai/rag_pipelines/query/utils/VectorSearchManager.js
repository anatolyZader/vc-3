const { PineconeStore } = require('@langchain/pinecone');
const VectorSearchStrategy = require('../VectorSearchStrategy');
const LoggingManager = require('./LoggingManager');

/**
 * VectorSearchManager handles all vector search operations for QueryPipeline
 * Provides clean separation of vector search concerns from main pipeline logic
 */
class VectorSearchManager {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pinecone = options.pinecone;
    this.logger = new LoggingManager({ component: 'VectorSearchManager' });
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
  }

  /**
   * Performs intelligent vector search with multiple strategies and fallbacks
   */
  async performIntelligentSearch(prompt, vectorStore) {
    const startTime = Date.now();
    this.logger.vectorSearch('Starting intelligent similarity search with semantic filtering');
    
    try {
      // Determine search strategy based on prompt analysis
      const searchStrategy = this.analyzeSearchStrategy(prompt);
      
      // Execute searches in parallel
      const searchResults = await this.executeParallelSearches(prompt, vectorStore, searchStrategy);
      
      // Process and validate results
      const processedResults = this.processSearchResults(searchResults);
      
      const duration = Date.now() - startTime;
      this.logger.performance('Intelligent vector search', duration, {
        documentsFound: processedResults.documents.length,
        strategy: searchStrategy
      });
      
      return processedResults;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Vector search failed', error, { duration, prompt: prompt.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Analyzes prompt and determines optimal search strategy
   */
  analyzeSearchStrategy(prompt) {
    const strategy = VectorSearchStrategy.determineSearchStrategy(prompt);
    
    this.logger.debug('Search strategy determined', {
      userResults: strategy.userResults,
      coreResults: strategy.coreResults,
      userFilters: strategy.userFilters,
      coreFilters: strategy.coreFilters
    });
    
    return strategy;
  }

  /**
   * Executes parallel searches across user and core namespaces
   */
  async executeParallelSearches(prompt, vectorStore, searchStrategy) {
    const userSearchPromise = this.executeUserSearch(prompt, vectorStore, searchStrategy);
    const coreSearchPromise = this.executeCoreSearch(prompt, searchStrategy);
    const timeoutPromise = this.createTimeoutPromise();
    
    try {
      const [userDocs, coreDocs] = await Promise.race([
        Promise.all([userSearchPromise, coreSearchPromise]),
        timeoutPromise
      ]);
      
      return [...userDocs, ...coreDocs];
      
    } catch (timeoutError) {
      this.logger.warn('Vector search timed out', { timeout: this.timeout, error: timeoutError.message });
      throw timeoutError;
    }
  }

  /**
   * Executes search in user-specific namespace with error handling
   */
  async executeUserSearch(prompt, vectorStore, searchStrategy) {
    try {
      if (this.hasValidFilters(searchStrategy.userFilters)) {
        this.logger.vectorSearch('Attempting filtered user search', { filters: searchStrategy.userFilters });
        return await vectorStore.similaritySearch(
          prompt, 
          searchStrategy.userResults,
          { filter: searchStrategy.userFilters }
        );
      } else {
        return await vectorStore.similaritySearch(prompt, searchStrategy.userResults);
      }
    } catch (filterError) {
      this.logger.warn('User search filter error, retrying without filters', { error: filterError.message });
      return await vectorStore.similaritySearch(prompt, searchStrategy.userResults);
    }
  }

  /**
   * Executes search in core documentation namespace with error handling
   */
  async executeCoreSearch(prompt, searchStrategy) {
    const coreDocsVectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pinecone.Index(this.indexName),
      namespace: 'core-docs'
    });
    
    try {
      if (this.hasValidFilters(searchStrategy.coreFilters)) {
        this.logger.vectorSearch('Attempting filtered core docs search', { filters: searchStrategy.coreFilters });
        return await coreDocsVectorStore.similaritySearch(
          prompt, 
          searchStrategy.coreResults,
          { filter: searchStrategy.coreFilters }
        );
      } else {
        return await coreDocsVectorStore.similaritySearch(prompt, searchStrategy.coreResults);
      }
    } catch (filterError) {
      this.logger.warn('Core docs filter error, retrying without filters', { error: filterError.message });
      return await coreDocsVectorStore.similaritySearch(prompt, searchStrategy.coreResults);
    }
  }

  /**
   * Checks if filters are valid and non-empty
   */
  hasValidFilters(filters) {
    return filters && Object.keys(filters).length > 0;
  }

  /**
   * Creates a timeout promise for search operations
   */
  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Vector search timeout')), this.timeout);
    });
  }

  /**
   * Processes and logs search results
   */
  processSearchResults(documents) {
    this.logger.vectorSearch('Retrieved documents from vector store', { count: documents.length });
    
    if (documents.length > 0) {
      this.logSearchResultsDetails(documents);
      return { 
        documents,
        sourcesAnalysis: this.analyzeDocumentSources(documents)
      };
    }
    
    this.logger.info('No relevant documents found in vector search');
    return { documents: [], sourcesAnalysis: {} };
  }

  /**
   * Logs detailed information about search results
   */
  logSearchResultsDetails(documents) {
    // Log first document details for debugging
    if (documents.length > 0) {
      this.logger.debug('First document metadata', documents[0].metadata);
      this.logger.debug('First document content preview', { 
        content: documents[0].pageContent.substring(0, 100) + '...'
      });
    }
    
    // Log all document sources
    const sources = documents.map((doc, index) => ({
      index: index + 1,
      source: doc.metadata.source || 'Unknown',
      contentLength: doc.pageContent.length
    }));
    
    this.logger.debug('All retrieved document sources', { sources });
  }

  /**
   * Analyzes the types and sources of retrieved documents
   */
  analyzeDocumentSources(documents) {
    const sourceTypes = {
      apiSpec: documents.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
      githubCode: documents.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
    };
    
    const sources = documents.map(doc => doc.metadata.source || 'Unknown');
    
    return { sourceTypes, sources };
  }
}

module.exports = VectorSearchManager;