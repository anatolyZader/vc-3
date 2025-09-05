const VectorSearchManager = require('./VectorSearchManager');
const ContextAnalyzer = require('./ContextAnalyzer');
const ResponseGenerator = require('./ResponseGenerator');

/**
 * Consolidated QueryPipeline that handles all RAG query processing
 * Combines functionality from both QueryPipeline and RagResponseGenerator
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
    
    // Initialize managers
    this.vectorSearchManager = new VectorSearchManager(
      this.vectorStore, 
      this.pinecone, 
      this.embeddings
    );
    this.responseGenerator = new ResponseGenerator(this.llm, this.requestQueue);
    
    console.log(`[${new Date().toISOString()}] QueryPipeline initialized for comprehensive RAG processing`);
  }

  /**
   * Main method that handles the complete RAG pipeline for responding to prompts
   */
  async respondToPrompt(userId, conversationId, prompt, conversationHistory = [], vectorStore = null) {
    try {
      console.log(`[${new Date().toISOString()}] QueryPipeline processing prompt for user ${userId}`);
      
      const activeVectorStore = vectorStore || this.vectorStore;
      
      if (!this.isVectorStoreAvailable(activeVectorStore)) {
        return this.createStandardResponseIndicator('Vector database not available');
      }

      const searchResults = await this.performVectorSearch(prompt, activeVectorStore);
      
      if (searchResults.length === 0) {
        return this.createStandardResponseIndicator('No relevant documents found');
      }

      const contextData = ContextAnalyzer.formatContext(searchResults);
      const response = await this.responseGenerator.generateWithContext(prompt, contextData, conversationHistory);
      
      this.emitRagStatus('retrieval_success', this.createSuccessMetrics(searchResults, userId, conversationId));
      
      return this.createSuccessResponse(response, conversationId, contextData, conversationHistory);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in QueryPipeline.respondToPrompt:`, error.message);
      return this.createErrorResponse(error, conversationId);
    }
  }

  /**
   * Generates a standard response without RAG context
   */
  async generateStandardResponse(prompt, conversationId, conversationHistory = []) {
    try {
      const result = await this.responseGenerator.generateStandard(prompt, conversationHistory);
      
      console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Generated standard response with conversation history for conversation ${conversationId}`);
      
      return {
        success: true,
        response: result.content,
        conversationId,
        timestamp: new Date().toISOString(),
        sourcesUsed: 0,
        ragEnabled: false,
        conversationHistoryUsed: conversationHistory.length > 0,
        historyMessages: conversationHistory.length
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in generateStandardResponse:`, error.message);
      
      if (this.responseGenerator.isRateLimitError(error)) {
        return this.createRateLimitResponse(conversationId, error);
      }

      return this.createErrorResponse(error, conversationId);
    }
  }

  // Helper methods
  isVectorStoreAvailable(vectorStore) {
    return vectorStore && this.pinecone;
  }

  async performVectorSearch(prompt, vectorStore) {
    if (vectorStore !== this.vectorStore) {
      // Create temporary search manager for different vector store
      const tempSearchManager = new VectorSearchManager(vectorStore, this.pinecone, this.embeddings);
      const results = await tempSearchManager.performSearch(prompt);
      
      // Emit retrieval success status
      if (results.length > 0) {
        this.emitRagStatus('retrieval_success', {
          userId: this.userId,
          conversationId: '',
          documentsFound: results.length,
          sources: results.map(doc => doc.metadata.source || 'Unknown'),
          sourceTypes: {
            apiSpec: results.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
            githubCode: results.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
          },
          firstDocContentPreview: results[0].pageContent.substring(0, 100) + '...'
        });
      }
      
      return results;
    }
    
    const results = await this.vectorSearchManager.performSearch(prompt);
    
    // Emit retrieval success status
    if (results.length > 0) {
      this.emitRagStatus('retrieval_success', {
        userId: this.userId,
        conversationId: '',
        documentsFound: results.length,
        sources: results.map(doc => doc.metadata.source || 'Unknown'),
        sourceTypes: {
          apiSpec: results.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
          githubCode: results.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
        },
        firstDocContentPreview: results[0].pageContent.substring(0, 100) + '...'
      });
    }
    
    return results;
  }

  createStandardResponseIndicator(reason) {
    console.warn(`[${new Date().toISOString()}] ${reason}, indicating standard response should be used`);
    return {
      success: true,
      useStandardResponse: true,
      reason
    };
  }

  createSuccessResponse(response, conversationId, contextData, conversationHistory) {
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

  createErrorResponse(error, conversationId) {
    return {
      success: false,
      response: "I encountered an issue while processing your request. Please try again shortly.",
      conversationId,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }

  createRateLimitResponse(conversationId, error) {
    return {
      success: false,
      response: "I'm currently experiencing high demand. Please try again in a few moments.",
      conversationId,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }

  createSuccessMetrics(searchResults, userId, conversationId) {
    return {
      userId,
      conversationId,
      documentsFound: searchResults.length,
      sources: searchResults.map(doc => doc.metadata.source || 'Unknown'),
      sourceTypes: {
        apiSpec: searchResults.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
        githubCode: searchResults.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
      },
      firstDocContentPreview: searchResults[0]?.pageContent.substring(0, 100) + '...'
    };
  }

  emitRagStatus(status, data) {
    if (this.eventBus && this.eventBus.emit) {
      this.eventBus.emit('ragStatus', { status, ...data });
      console.log(`[${new Date().toISOString()}] Emitted RAG status: ${status}`);
    }
  }
}

module.exports = QueryPipeline;
