// Production-Ready RAG Pipeline Implementation
'use strict';

const IAIPort = require('../../domain/ports/IAIPort');
const QueryProcessor = require('./improvements/queryProcessor');
const AdvancedRetriever = require('./improvements/advancedRetriever');
const ContextManager = require('./improvements/contextManager');
const ResponseGenerator = require('./improvements/responseGenerator');
const RAGAnalytics = require('./improvements/ragAnalytics');

const Bottleneck = require("bottleneck");
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

class ProductionRAGAdapter extends IAIPort {
  constructor(options = {}) {
    super();
    
    // Core configuration
    this.userId = null;
    this.aiProvider = options.aiProvider || 'openai';
    this.aiPersistAdapter = options.aiPersistAdapter || null;
    
    // Initialize event bus connection
    try {
      const { eventBus } = require('../../../../eventDispatcher');
      this.eventBus = eventBus;
      console.log(`[${new Date().toISOString()}] 📡 Connected to shared event bus`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Could not access shared event bus: ${error.message}`);
      this.eventBus = null;
    }

    // Rate limiting and queue management
    this.maxRetries = 10;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Bottleneck for Pinecone operations
    this.pineconeLimiter = new Bottleneck({
      reservoir: 100,
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 1000,
      maxConcurrent: 1
    });

    try {
      // Initialize core components
      this.initializeEmbeddings();
      this.initializePinecone();
      this.initializeLLM();
      
      // Initialize production components (will be set up after userId is available)
      this.queryProcessor = null;
      this.retriever = null;
      this.contextManager = null;
      this.responseGenerator = null;
      this.analytics = null;
      
      // Vector store will be initialized per user
      this.vectorStore = null;
      
      console.log(`[${new Date().toISOString()}] ✅ ProductionRAGAdapter initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error initializing ProductionRAGAdapter:`, error.message);
      throw error;
    }

    // Start background processes
    this.startQueueProcessor();
  }

  // Initialize embeddings
  initializeEmbeddings() {
    this.embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log(`[${new Date().toISOString()}] 🔧 Embeddings model initialized`);
  }

  // Initialize Pinecone
  initializePinecone() {
    if (process.env.PINECONE_API_KEY) {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });
      console.log(`[${new Date().toISOString()}] 🔧 Pinecone client initialized`);
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠️ No Pinecone API key found`);
      this.pinecone = null;
    }
  }

  // Initialize LLM with improved configuration
  initializeLLM() {
    switch (this.aiProvider.toLowerCase()) {
      case 'openai': {
        const { ChatOpenAI } = require('@langchain/openai');
        this.llm = new ChatOpenAI({
          modelName: 'gpt-4', // Upgraded to GPT-4 for better quality
          temperature: 0.1, // Slightly higher for more natural responses
          apiKey: process.env.OPENAI_API_KEY,
          maxRetries: this.maxRetries,
          maxConcurrency: 3, // Increased concurrency
          timeout: 120000
        });
        break;
      }
      case 'anthropic': {
        const { ChatAnthropic } = require('@langchain/anthropic');
        this.llm = new ChatAnthropic({
          modelName: 'claude-3-sonnet-20240229', // Upgraded model
          temperature: 0.1,
          apiKey: process.env.ANTHROPIC_API_KEY,
          maxRetries: this.maxRetries,
          maxConcurrency: 2,
          timeout: 120000
        });
        break;
      }
      default: {
        console.warn(`[${new Date().toISOString()}] Unknown provider: ${this.aiProvider}, falling back to OpenAI`);
        const { ChatOpenAI } = require('@langchain/openai');
        this.llm = new ChatOpenAI({
          modelName: 'gpt-4',
          temperature: 0.1,
          apiKey: process.env.OPENAI_API_KEY,
          maxRetries: this.maxRetries,
          maxConcurrency: 3
        });
      }
    }
    console.log(`[${new Date().toISOString()}] 🔧 LLM initialized with provider: ${this.aiProvider}`);
  }

  // Enhanced setUserId with component initialization
  setUserId(userId) {
    if (!userId) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Attempted to set null/undefined userId`);
      return this;
    }

    this.userId = userId;
    console.log(`[${new Date().toISOString()}] 👤 Setting up production RAG pipeline for user: ${userId}`);

    try {
      // Initialize user-specific vector store
      if (this.pinecone) {
        this.vectorStore = new PineconeStore(this.embeddings, {
          pineconeIndex: this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index'),
          namespace: this.userId
        });
        console.log(`[${new Date().toISOString()}] 🗂️ Vector store initialized for user namespace: ${this.userId}`);
      }

      // Initialize production components
      this.queryProcessor = new QueryProcessor({ 
        llm: this.llm, 
        embeddings: this.embeddings 
      });

      this.retriever = new AdvancedRetriever({ 
        pinecone: this.pinecone, 
        embeddings: this.embeddings, 
        userId: this.userId 
      });

      this.contextManager = new ContextManager({ 
        maxTokens: 16000, // Increased context window for GPT-4
        llm: this.llm 
      });

      this.responseGenerator = new ResponseGenerator({ 
        llm: this.llm, 
        embeddings: this.embeddings 
      });

      this.analytics = new RAGAnalytics({ 
        eventBus: this.eventBus, 
        aiPersistAdapter: this.aiPersistAdapter 
      });

      console.log(`[${new Date().toISOString()}] 🚀 Production RAG components initialized successfully`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error initializing components for user ${userId}:`, error.message);
      throw error;
    }

    return this;
  }

  // Set persistence adapter
  setPersistenceAdapter(aiPersistAdapter) {
    this.aiPersistAdapter = aiPersistAdapter;
    
    // Update analytics component if it exists
    if (this.analytics) {
      this.analytics.aiPersistAdapter = aiPersistAdapter;
    }
    
    console.log(`[${new Date().toISOString()}] 💾 Persistence adapter configured`);
    return this;
  }

  // Production-level respondToPrompt implementation
  async respondToPrompt(userId, conversationId, prompt) {
    // Ensure user is set up
    if (this.userId !== userId) {
      this.setUserId(userId);
    }

    if (!this.userId || !this.queryProcessor) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Production RAG not properly initialized for user ${userId}`);
      return this.generateErrorResponse(conversationId, "System not properly initialized");
    }

    const operationId = `resp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`[${new Date().toISOString()}] 🚀 PRODUCTION RAG: Processing query for conversation ${conversationId} (Operation: ${operationId})`);

    // Start analytics tracking
    this.analytics.startOperation(operationId, 'full_pipeline', {
      userId,
      conversationId,
      queryLength: prompt.length
    });

    return this.queueRequest(async () => {
      try {
        // Step 1: Advanced Query Processing
        console.log(`[${new Date().toISOString()}] 🔍 Step 1: Processing and expanding query`);
        const queryStart = Date.now();
        
        const conversationHistory = await this.getConversationHistory(conversationId, 8);
        const processedQuery = await this.queryProcessor.processQuery(prompt, {
          conversationHistory,
          userId: this.userId,
          conversationId
        });
        
        const queryProcessingTime = Date.now() - queryStart;
        console.log(`[${new Date().toISOString()}] ✅ Query processing completed in ${queryProcessingTime}ms`);

        // Step 2: Advanced Retrieval
        console.log(`[${new Date().toISOString()}] 🔍 Step 2: Advanced hybrid retrieval`);
        const retrievalStart = Date.now();

        let retrievalResults = { documents: [], totalSearched: 0, searchLatency: 0 };
        
        if (this.pinecone && this.vectorStore) {
          try {
            // Hybrid search with multiple strategies
            const hybridResults = await this.retriever.hybridSearch(processedQuery, {
              topK: 20, // Increased for better coverage
              diversityThreshold: 0.6 // Lower threshold for more diversity
            });

            // Contextual retrieval based on conversation history
            const contextualResults = await this.retriever.contextualRetrieval(
              processedQuery, 
              conversationHistory, 
              5
            );

            // Combine results
            const combinedResults = [...hybridResults, ...contextualResults];
            retrievalResults = {
              documents: combinedResults,
              totalSearched: combinedResults.length,
              searchLatency: Date.now() - retrievalStart
            };

            console.log(`[${new Date().toISOString()}] ✅ Hybrid retrieval completed: ${combinedResults.length} documents in ${retrievalResults.searchLatency}ms`);

            // Emit retrieval success status
            this.emitRagStatus('retrieval_success', {
              userId: this.userId,
              conversationId,
              documentsFound: combinedResults.length,
              searchLatency: retrievalResults.searchLatency,
              strategies: ['hybrid_search', 'contextual_retrieval']
            });

          } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Advanced retrieval failed:`, error.message);
            this.emitRagStatus('retrieval_error', { userId: this.userId, conversationId, error: error.message });
            
            // Track error for analytics
            this.analytics.trackError(error, { 
              phase: 'retrieval', 
              userId: this.userId, 
              conversationId 
            });
            
            return this.generateFallbackResponse(processedQuery, conversationId, error);
          }
        } else {
          console.warn(`[${new Date().toISOString()}] ⚠️ Vector database not available, using fallback response`);
          this.emitRagStatus('retrieval_disabled', { 
            userId: this.userId, 
            conversationId, 
            reason: 'Vector database not available' 
          });
          return this.generateFallbackResponse(processedQuery, conversationId);
        }

        // Step 3: Context Optimization
        console.log(`[${new Date().toISOString()}] 🔍 Step 3: Optimizing context`);
        const contextStart = Date.now();

        const optimizedContext = await this.contextManager.optimizeContext(
          retrievalResults.documents,
          processedQuery,
          conversationHistory
        );

        const contextOptimizationTime = Date.now() - contextStart;
        console.log(`[${new Date().toISOString()}] ✅ Context optimization completed in ${contextOptimizationTime}ms`);
        console.log(`[${new Date().toISOString()}] 📊 Context stats: ${optimizedContext.contextMetadata.selectedDocuments} docs, ${optimizedContext.contextMetadata.estimatedTokens} tokens`);

        // Step 4: Advanced Response Generation
        console.log(`[${new Date().toISOString()}] 🔍 Step 4: Generating enhanced response`);
        const generationStart = Date.now();

        const responseResult = await this.responseGenerator.generateResponse(
          processedQuery,
          optimizedContext,
          conversationHistory,
          {
            temperature: 0.1,
            maxTokens: 2000,
            useChainOfThought: processedQuery.classification.technical_level === 'advanced',
            includeSourceCitations: true,
            responseStyle: this.determineResponseStyle(processedQuery.classification)
          }
        );

        const generationTime = Date.now() - generationStart;
        responseResult.generationLatency = generationTime;
        
        console.log(`[${new Date().toISOString()}] ✅ Response generation completed in ${generationTime}ms`);

        // Step 5: Analytics and Quality Tracking
        const totalTime = Date.now() - queryStart;
        const metrics = this.analytics.trackQueryMetrics(
          { ...processedQuery, userId, conversationId },
          retrievalResults,
          responseResult
        );

        // Complete operation tracking
        this.analytics.endOperation(operationId, { 
          success: true, 
          totalLatency: totalTime,
          metrics 
        });

        // Log comprehensive completion summary
        console.log(`[${new Date().toISOString()}] 🎉 PRODUCTION RAG PIPELINE COMPLETED:`);
        console.log(`[${new Date().toISOString()}]   📊 Total Time: ${totalTime}ms`);
        console.log(`[${new Date().toISOString()}]   🔍 Query Processing: ${queryProcessingTime}ms`);
        console.log(`[${new Date().toISOString()}]   📚 Context Optimization: ${contextOptimizationTime}ms`);
        console.log(`[${new Date().toISOString()}]   🤖 Response Generation: ${generationTime}ms`);
        console.log(`[${new Date().toISOString()}]   📈 Quality Score: ${responseResult.responseMetadata?.qualityScore || 'N/A'}`);
        console.log(`[${new Date().toISOString()}]   💡 Sources Used: ${optimizedContext.contextMetadata.selectedDocuments}`);

        return {
          success: true,
          response: responseResult.response,
          conversationId,
          timestamp: new Date().toISOString(),
          
          // Enhanced metadata for monitoring
          ragEnabled: true,
          ragPipeline: 'production',
          
          performance: {
            totalLatency: totalTime,
            queryProcessingLatency: queryProcessingTime,
            retrievalLatency: retrievalResults.searchLatency,
            contextOptimizationLatency: contextOptimizationTime,
            generationLatency: generationTime
          },
          
          queryAnalysis: {
            category: processedQuery.classification.primary_category,
            technicalLevel: processedQuery.classification.technical_level,
            expandedQueries: processedQuery.expansion.searchQueries.length
          },
          
          contextUsed: optimizedContext.contextMetadata,
          qualityMetrics: responseResult.responseMetadata,
          
          analytics: {
            operationId,
            metricsTracked: true,
            conversationHistoryUsed: conversationHistory.length > 0
          }
        };

      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Production RAG pipeline failed:`, error.message);
        
        // Track error
        this.analytics.trackError(error, { 
          operationId, 
          userId: this.userId, 
          conversationId, 
          phase: 'pipeline' 
        });
        
        this.analytics.endOperation(operationId, { 
          success: false, 
          error: error.message 
        });

        return this.generateErrorResponse(conversationId, error.message, {
          operationId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // Helper method to determine response style based on query classification
  determineResponseStyle(classification) {
    switch (classification.primary_category) {
      case 'CODE_IMPLEMENTATION':
        return 'tutorial';
      case 'API_USAGE':
        return 'comprehensive';
      case 'DEBUGGING':
        return 'tutorial';
      case 'ARCHITECTURE':
        return 'comprehensive';
      default:
        return classification.technical_level === 'beginner' ? 'tutorial' : 'comprehensive';
    }
  }

  // Enhanced conversation history retrieval
  async getConversationHistory(conversationId, limit = 8) {
    if (!this.aiPersistAdapter || !conversationId) {
      return [];
    }

    try {
      const history = await this.aiPersistAdapter.getConversationHistory(conversationId, limit);
      console.log(`[${new Date().toISOString()}] 💭 Retrieved ${history.length} conversation history entries`);
      return history;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error retrieving conversation history:`, error.message);
      return [];
    }
  }

  // Generate fallback response when advanced pipeline fails
  async generateFallbackResponse(processedQuery, conversationId, error = null) {
    console.log(`[${new Date().toISOString()}] 🔄 Generating fallback response`);
    
    try {
      const conversationHistory = await this.getConversationHistory(conversationId, 3);
      const messages = [
        {
          role: "system",
          content: "You are a helpful AI assistant specialized in software development. Provide accurate, helpful responses based on your general knowledge."
        },
        ...this.formatConversationHistory(conversationHistory),
        {
          role: "user",
          content: processedQuery?.originalQuery || processedQuery
        }
      ];

      const result = await this.llm.invoke(messages);
      
      return {
        success: true,
        response: result.content,
        conversationId,
        timestamp: new Date().toISOString(),
        ragEnabled: false,
        fallback: true,
        fallbackReason: error?.message || 'Advanced RAG pipeline not available'
      };
      
    } catch (fallbackError) {
      console.error(`[${new Date().toISOString()}] ❌ Fallback response generation failed:`, fallbackError.message);
      return this.generateErrorResponse(conversationId, fallbackError.message);
    }
  }

  // Generate error response
  generateErrorResponse(conversationId, errorMessage, metadata = {}) {
    return {
      success: false,
      response: `I encountered an issue processing your request: ${errorMessage}. Please try rephrasing your question or try again in a moment.`,
      conversationId,
      timestamp: new Date().toISOString(),
      error: errorMessage,
      ragEnabled: false,
      ...metadata
    };
  }

  // Format conversation history for LLM
  formatConversationHistory(history) {
    if (!history || history.length === 0) return [];

    const messages = [];
    history.forEach((entry) => {
      messages.push({ role: "user", content: entry.prompt });
      messages.push({ role: "assistant", content: entry.response });
    });

    return messages;
  }

  // Enhanced RAG status emission
  emitRagStatus(status, details = {}) {
    const statusUpdate = {
      component: 'productionRAGAdapter',
      timestamp: new Date().toISOString(),
      status,
      ...details
    };

    // Log status
    console.log(`[${new Date().toISOString()}] 📊 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? details : '');

    // Emit to event bus
    try {
      if (this.eventBus) {
        this.eventBus.emit('ragStatusUpdate', statusUpdate);
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status: ${error.message}`);
    }
  }

  // Queue management (inherited from original implementation)
  startQueueProcessor() {
    setInterval(() => this.processQueue(), 3000); // Faster processing interval
    console.log(`[${new Date().toISOString()}] 🚀 Production queue processor started`);
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    
    try {
      const request = this.requestQueue.shift();
      console.log(`[${new Date().toISOString()}] 🔄 Processing queued request: ${request.id}`);

      const result = await request.execute();
      request.resolve(result);
      
    } catch (error) {
      const request = this.requestQueue[0];
      if (request) {
        request.reject(error);
      }
    } finally {
      this.isProcessingQueue = false;
      
      // Continue processing if queue has items
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 500);
      }
    }
  }

  queueRequest(execute) {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      this.requestQueue.push({
        id: requestId,
        execute,
        resolve,
        reject,
        timestamp: new Date().toISOString()
      });

      console.log(`[${new Date().toISOString()}] 📝 Queued request ${requestId}, queue length: ${this.requestQueue.length}`);

      // Trigger processing
      if (!this.isProcessingQueue) {
        setTimeout(() => this.processQueue(), 100);
      }
    });
  }

  // Public method to get system health and analytics
  getSystemHealth() {
    if (!this.analytics) {
      return { status: 'not_initialized', message: 'Analytics not available' };
    }
    
    return this.analytics.getSystemHealth();
  }

  // Public method to get analytics report
  getAnalyticsReport(timeWindowHours = 24) {
    if (!this.analytics) {
      return { error: 'Analytics not available' };
    }
    
    return this.analytics.generateAnalyticsReport(timeWindowHours * 60 * 60 * 1000);
  }

  // Method to track user feedback
  async trackUserFeedback(conversationId, feedback) {
    if (!this.analytics) {
      console.warn('Analytics not available for feedback tracking');
      return;
    }
    
    return this.analytics.trackUserFeedback(conversationId, feedback);
  }
}

module.exports = ProductionRAGAdapter;
