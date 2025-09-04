const { 
  LoggingManager, 
  VectorSearchManager, 
  ContextAnalyzer, 
  ResponseManager, 
  EventManager 
} = require('./utils');

/**
 * Modularized QueryPipeline that handles all RAG query processing
 * Uses specialized utility classes for clean separation of concerns
 */
class QueryPipeline {
  constructor(options = {}) {
    this.vectorStore = options.vectorStore;
    this.pinecone = options.pinecone;
    this.embeddings = options.embeddings;
    this.llm = options.llm;
    this.requestQueue = options.requestQueue;
    this.userId = options.userId;
    this.eventBus = options.eventBus;
    
    // Initialize utility managers with proper dependencies
    this.logger = new LoggingManager({ 
      component: 'QueryPipeline',
      level: options.logLevel || process.env.RAG_LOG_LEVEL || 'INFO'
    });
    
    this.vectorSearchManager = new VectorSearchManager({
      embeddings: this.embeddings,
      pinecone: this.pinecone,
      timeout: options.searchTimeout || 30000
    });
    
    this.contextAnalyzer = new ContextAnalyzer({
      maxContentLength: options.maxContentLength
    });
    
    this.responseManager = new ResponseManager({
      llm: this.llm,
      requestQueue: this.requestQueue
    });
    
    this.eventManager = new EventManager({
      eventBus: this.eventBus,
      userId: this.userId,
      enableEvents: options.enableEvents
    });
    
    this.logger.info('QueryPipeline initialized with modular architecture for comprehensive RAG processing');
  }

  /**
   * Main method that handles the complete RAG pipeline for responding to prompts
   */
  async respondToPrompt(userId, conversationId, prompt, conversationHistory = [], vectorStore = null) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Processing prompt for user ${userId}`, { conversationId });
      this.eventManager.emitProcessingStarted(conversationId, prompt);
      
      // Use provided vectorStore or fall back to instance vectorStore
      const activeVectorStore = vectorStore || this.vectorStore;
      
      // Check vector database availability
      if (!this.isVectorDatabaseAvailable(activeVectorStore)) {
        this.logger.warn('Vector database not available, indicating standard response should be used');
        return this.createStandardResponseResult(conversationId, 'Vector database not available');
      }

      // Perform intelligent vector search
      const searchResults = await this.vectorSearchManager.performIntelligentSearch(
        prompt, 
        activeVectorStore
      );
      
      if (searchResults.documents.length === 0) {
        this.logger.info('No relevant documents found, indicating standard response should be used');
        return this.createStandardResponseResult(conversationId, 'No relevant documents found');
      }

      // Emit retrieval success event
      this.emitRetrievalSuccessEvent(searchResults);

      // Analyze and format context
      const contextData = this.contextAnalyzer.analyzeAndFormatContext(searchResults.documents);
      
      // Generate LLM response with context
      const response = await this.responseManager.generateLLMResponse(prompt, contextData, conversationHistory);
      
      const result = this.createSuccessResult(conversationId, response, contextData, conversationHistory);
      
      // Emit processing completed event
      this.eventManager.emitProcessingCompleted(
        conversationId,
        response.content.length,
        true,
        contextData.context.length,
        contextData.sourceAnalysis
      );
      
      const duration = Date.now() - startTime;
      this.logger.performance('Complete RAG pipeline processing', duration, {
        documentsUsed: searchResults.documents.length,
        contextSize: contextData.context.length
      });
      
      return result;

    } catch (error) {
      this.handlePromptProcessingError(error, conversationId, prompt, startTime);
      return this.createErrorResult(conversationId, error);
    }
  }

  /**
   * Checks if vector database is available and properly configured
   */
  isVectorDatabaseAvailable(vectorStore) {
    return vectorStore && this.pinecone;
  }

  /**
   * Creates a standard response result when RAG is not available
   */
  createStandardResponseResult(conversationId, reason) {
    return {
      success: true,
      useStandardResponse: true,
      reason,
      conversationId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Emits retrieval success event with appropriate data
   */
  emitRetrievalSuccessEvent(searchResults) {
    if (searchResults.documents.length > 0) {
      this.eventManager.emitRetrievalSuccess(
        searchResults.documents.length,
        searchResults.sourcesAnalysis?.sources || [],
        searchResults.sourcesAnalysis?.sourceTypes || {},
        searchResults.documents[0].pageContent.substring(0, 100) + '...'
      );
    }
  }

  /**
   * Creates a success result object
   */
  createSuccessResult(conversationId, response, contextData, conversationHistory) {
    return {
      success: true,
      response: response.content,
      conversationId,
      timestamp: new Date().toISOString(),
      ragEnabled: true,
      contextSize: contextData.context.length,
      sourcesUsed: contextData.sourceAnalysis,
      sourcesBreakdown: contextData.sourcesBreakdown,
      conversationHistoryUsed: conversationHistory.length > 0,
      historyMessages: conversationHistory.length
    };
  }

  /**
   * Handles errors during prompt processing
   */
  handlePromptProcessingError(error, conversationId, prompt, startTime) {
    const duration = Date.now() - startTime;
    this.logger.error('Error in QueryPipeline.respondToPrompt', error, { 
      conversationId, 
      duration,
      promptPreview: prompt.substring(0, 100)
    });
    
    this.eventManager.emitProcessingError(conversationId, error, prompt);
  }

  /**
   * Creates an error result object
   */
  createErrorResult(conversationId, error) {
    return {
      success: false,
      response: "I encountered an issue while processing your request. Please try again shortly.",
      conversationId,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }

  /**
   * Performs intelligent vector search with multiple strategies and fallbacks
   * Delegates to VectorSearchManager for clean separation of concerns
   */
  async performIntelligentVectorSearch(prompt, vectorStore) {
    try {
      return await this.vectorSearchManager.performIntelligentSearch(prompt, vectorStore);
    } catch (error) {
      this.eventManager.emitRetrievalError(error, prompt);
      throw error;
    }
  }

  /**
   * Analyzes retrieved documents and formats them into structured context
   * Delegates to ContextAnalyzer for clean separation of concerns
   */
  analyzeAndFormatContext(documents) {
    return this.contextAnalyzer.analyzeAndFormatContext(documents);
  }

  /**
   * Generates LLM response using the provided context
   * Delegates to ResponseManager for clean separation of concerns
   */
  async generateLLMResponse(prompt, contextData, conversationHistory = []) {
    return await this.responseManager.generateLLMResponse(prompt, contextData, conversationHistory);
  }

  /**
   * Generates response with retry logic for rate limiting
   * Delegates to ResponseManager for implementation
   */
  async generateResponseWithRetry(messages) {
    return await this.responseManager.generateResponseWithRetry(messages);
  }

  /**
   * Generates a standard response without RAG context
   * Delegates to ResponseManager for implementation
   */
  async generateStandardResponse(prompt, conversationId, conversationHistory = []) {
    return await this.responseManager.generateStandardResponse(prompt, conversationId, conversationHistory);
  }

  /**
   * Emits RAG status events for monitoring
   * Delegates to EventManager for implementation
   */
  emitRagStatus(status, data) {
    this.eventManager.emitRagStatus(status, data);
  }
}

module.exports = QueryPipeline;
