// aiLangchainAdapter.js - Migrated to LangGraph
"use strict";
/* eslint-disable no-unused-vars */

const IAIPort = require('../../domain/ports/IAIPort');
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

// LangGraph imports for workflow orchestration
const { StateGraph, START, END, Annotation } = require('@langchain/langgraph');

// Import extracted utility functions
const RequestQueue = require('./utils/requestQueue');
const LLMProviderManager = require('./providers/lLMProviderManager');

// Import the DataPreparationPipeline for handling repository processing
const DataPreparationPipeline = require('./rag_pipelines/data_preparation/dataPreparationPipeline');
const QueryPipeline = require('./rag_pipelines/query/queryPipeline');

class AILangchainAdapter extends IAIPort {
  constructor(options = {}) {
    super();

    // Make userId null by default to avoid DI error
    this.userId = null;
    console.log(`[${new Date().toISOString()}] [DEBUG] LangGraph Constructor called with options:`, JSON.stringify(options));

    // Get provider from infraConfig or options
    this.aiProvider = options.aiProvider || 'openai';
    console.log(`[${new Date().toISOString()}] AILangchainAdapter (LangGraph) initializing with provider: ${this.aiProvider}`);
    console.log(`[${new Date().toISOString()}] [DEBUG] aiProvider set to: ${this.aiProvider}`);

    // Get access to the event bus for status updates
    try {
      const { eventBus } = require('../../../../eventDispatcher');
      this.eventBus = eventBus;
      console.log(`[${new Date().toISOString()}] 📡 Successfully connected to shared event bus`);
      console.log(`[${new Date().toISOString()}] [DEBUG] Event bus connected.`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Could not access shared event bus: ${error.message}`);
      this.eventBus = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Event bus unavailable.`);
    }

    // Initialize request queue for rate limiting and queuing
    this.requestQueue = new RequestQueue({
      maxRequestsPerMinute: 60,
      retryDelay: 5000,
      maxRetries: 10
    });

    // Keep direct access to pineconeLimiter for backward compatibility
    this.pineconeLimiter = this.requestQueue.pineconeLimiter;

    try {
      // Initialize embeddings model: converts text to vectors
      this.embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-large',
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] Embeddings model initialized.`);

      // Initialize Pinecone client if API key available
      if (process.env.PINECONE_API_KEY) {
        this.pinecone = new Pinecone({
          apiKey: process.env.PINECONE_API_KEY
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Pinecone client initialized.`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Pinecone environment: ${process.env.PINECONE_ENVIRONMENT}`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Pinecone index name: ${process.env.PINECONE_INDEX_NAME}`);
      } else {
        console.warn(`[${new Date().toISOString()}] No Pinecone API key found, vector search will be unavailable`);
        this.pinecone = null;
        console.log(`[${new Date().toISOString()}] [DEBUG] Pinecone client unavailable.`);
      }

      // Initialize chat model based on provider
      this.llmProviderManager = new LLMProviderManager(this.aiProvider, {
        maxRetries: this.requestQueue.maxRetries
      });
      this.llm = this.llmProviderManager.getLLM();
      console.log(`[${new Date().toISOString()}] [DEBUG] LLM initialized.`);

      // Don't initialize vectorStore until we have a userId
      this.vectorStore = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store set to null (will be initialized after userId).`);

      // Initialize DataPreparationPipeline for repository processing
      this.dataPreparationPipeline = new DataPreparationPipeline({
        embeddings: this.embeddings,
        pinecone: this.pinecone,
        eventBus: this.eventBus,
        pineconeLimiter: this.pineconeLimiter,
        maxChunkSize: 2000
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] DataPreparationPipeline initialized with specialized processors for all core documentation.`);

      // Initialize LangGraph workflow for RAG operations
      this.initializeLangGraphWorkflow();

      console.log(`[${new Date().toISOString()}] AILangchainAdapter (LangGraph) initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing AILangchainAdapter:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Initialization error stack:`, error.stack);
      // We'll continue with degraded functionality and try to recover later
    }
  }

  /**
   * Initialize the LangGraph workflow for RAG operations
   */
  initializeLangGraphWorkflow() {
    console.log(`[${new Date().toISOString()}] 🔧 Initializing LangGraph workflow for RAG operations`);
    
    // Define the state schema using Annotation
    const RagState = Annotation.Root({
      userId: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null,
      }),
      conversationId: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null,
      }),
      prompt: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null,
      }),
      conversationHistory: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => [],
      }),
      vectorStore: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null,
      }),
      searchResults: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => [],
      }),
      contextData: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null,
      }),
      response: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null,
      }),
      error: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null,
      }),
      metadata: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
      }),
    });

    // Create the state graph
    this.ragGraph = new StateGraph(RagState);

    // Add nodes to the graph
    this.ragGraph.addNode("validate_inputs", this.validateInputsNode.bind(this));
    this.ragGraph.addNode("vector_search", this.vectorSearchNode.bind(this));
    this.ragGraph.addNode("build_context", this.buildContextNode.bind(this));
    this.ragGraph.addNode("generate_response", this.generateResponseNode.bind(this));
    this.ragGraph.addNode("handle_error", this.handleErrorNode.bind(this));

    // Define the workflow edges
    this.ragGraph.addEdge(START, "validate_inputs");
    this.ragGraph.addConditionalEdges(
      "validate_inputs",
      this.routeAfterValidation.bind(this),
      {
        vector_search: "vector_search",
        handle_error: "handle_error"
      }
    );
    this.ragGraph.addConditionalEdges(
      "vector_search", 
      this.routeAfterSearch.bind(this),
      {
        build_context: "build_context",
        generate_response: "generate_response" // Direct to response if no results
      }
    );
    this.ragGraph.addEdge("build_context", "generate_response");
    this.ragGraph.addEdge("generate_response", END);
    this.ragGraph.addEdge("handle_error", END);

    // Compile the graph
    this.compiledRagGraph = this.ragGraph.compile();
    
    console.log(`[${new Date().toISOString()}] ✅ LangGraph RAG workflow initialized successfully`);
  }

  /**
   * LangGraph Node: Validate inputs and setup
   */
  async validateInputsNode(state) {
    console.log(`[${new Date().toISOString()}] 🔍 LangGraph: Validating inputs`);
    
    if (!state.userId || !state.prompt) {
      return {
        ...state,
        error: "Missing required parameters: userId or prompt",
        metadata: { ...state.metadata, validation: "failed" }
      };
    }

    // Set up vector store if needed
    if (this.pinecone && !state.vectorStore) {
      const vectorStore = new PineconeStore(this.embeddings, {
        pineconeIndex: this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index'),
        namespace: state.userId
      });
      
      return {
        ...state,
        vectorStore,
        metadata: { ...state.metadata, validation: "passed", vectorStoreInitialized: true }
      };
    }

    return {
      ...state,
      metadata: { ...state.metadata, validation: "passed" }
    };
  }

  /**
   * LangGraph Node: Perform vector search
   */
  async vectorSearchNode(state) {
    console.log(`[${new Date().toISOString()}] 🔍 LangGraph: Performing vector search`);
    
    try {
      if (!state.vectorStore) {
        console.warn(`[${new Date().toISOString()}] No vector store available, skipping search`);
        return {
          ...state,
          searchResults: [],
          metadata: { ...state.metadata, searchPerformed: false, reason: "no_vector_store" }
        };
      }

      // Perform the actual vector search using existing logic
      const searchResults = await this.performVectorSearch(state.prompt, state.vectorStore);
      
      this.emitRagStatus('retrieval_success', {
        userId: state.userId,
        conversationId: state.conversationId,
        documentsFound: searchResults.length,
        sources: searchResults.map(doc => doc.metadata.source || 'Unknown')
      });

      return {
        ...state,
        searchResults,
        metadata: { 
          ...state.metadata, 
          searchPerformed: true, 
          documentsFound: searchResults.length 
        }
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in vector search:`, error.message);
      return {
        ...state,
        error: `Vector search failed: ${error.message}`,
        metadata: { ...state.metadata, searchError: error.message }
      };
    }
  }

  /**
   * LangGraph Node: Build context from search results
   */
  async buildContextNode(state) {
    console.log(`[${new Date().toISOString()}] 🔧 LangGraph: Building context from search results`);
    
    try {
      // Use existing context building logic
      const ContextBuilder = require('./rag_pipelines/query/contextBuilder');
      const contextData = ContextBuilder.formatContext(state.searchResults);
      
      return {
        ...state,
        contextData,
        metadata: { 
          ...state.metadata, 
          contextBuilt: true,
          contextSize: contextData.context.length 
        }
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error building context:`, error.message);
      return {
        ...state,
        error: `Context building failed: ${error.message}`,
        metadata: { ...state.metadata, contextError: error.message }
      };
    }
  }

  /**
   * LangGraph Node: Generate response using LLM
   */
  async generateResponseNode(state) {
    console.log(`[${new Date().toISOString()}] 🤖 LangGraph: Generating response`);
    
    try {
      // Use existing response generation logic
      const ResponseGenerator = require('./rag_pipelines/query/responseGenerator');
      const responseGenerator = new ResponseGenerator(this.llm, this.requestQueue);
      
      let result;
      if (state.contextData && state.searchResults.length > 0) {
        // RAG response with context
        result = await responseGenerator.generateWithContext(
          state.prompt, 
          state.contextData, 
          state.conversationHistory || []
        );
      } else {
        // Standard response without RAG context
        result = await responseGenerator.generateStandard(
          state.prompt, 
          state.conversationHistory || []
        );
      }

      return {
        ...state,
        response: result.content,
        metadata: { 
          ...state.metadata, 
          responseGenerated: true,
          ragEnabled: !!state.contextData,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error generating response:`, error.message);
      return {
        ...state,
        error: `Response generation failed: ${error.message}`,
        metadata: { ...state.metadata, responseError: error.message }
      };
    }
  }

  /**
   * LangGraph Node: Handle errors
   */
  async handleErrorNode(state) {
    console.log(`[${new Date().toISOString()}] ❌ LangGraph: Handling error - ${state.error}`);
    
    return {
      ...state,
      response: "I encountered an issue while processing your request. Please try again shortly.",
      metadata: { 
        ...state.metadata, 
        errorHandled: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Routing function after validation
   */
  routeAfterValidation(state) {
    if (state.error) {
      return "handle_error";
    }
    return "vector_search";
  }

  /**
   * Routing function after search
   */
  routeAfterSearch(state) {
    if (state.error) {
      return "handle_error";
    }
    if (state.searchResults && state.searchResults.length > 0) {
      return "build_context";
    }
    // No search results, generate standard response
    return "generate_response";
  }

  // Add method to set userId after construction - this is crucial!
  setUserId(userId) {
    if (!userId) {
      console.warn(`[${new Date().toISOString()}] Attempted to set null/undefined userId in AILangchainAdapter`);
      return this;
    }
    console.log(`[${new Date().toISOString()}] [DEBUG] setUserId called with: ${userId}`);

    this.userId = userId;
    console.log(`[${new Date().toISOString()}] [DEBUG] userId set to: ${this.userId}`);

    // Update vector store namespace with the user ID
    try {
      if (this.pinecone) {
        this.vectorStore = new PineconeStore(this.embeddings, {
          pineconeIndex: this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index'),
          namespace: this.userId
        });
        console.log(`[${new Date().toISOString()}] AILangchainAdapter userId updated to: ${this.userId}`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Vector store initialized for userId: ${this.userId}`);
        
        // Initialize QueryPipeline with the new vector store for RAG operations
        this.queryPipeline = new QueryPipeline({
          embeddings: this.embeddings,
          pinecone: this.pinecone,
          llm: this.llm,
          eventBus: this.eventBus,
          requestQueue: this.requestQueue,
          maxRetries: this.requestQueue.maxRetries
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline initialized for userId: ${this.userId}`);
      } else {
        console.warn(`[${new Date().toISOString()}] Pinecone client not available, vectorStore not initialized for user ${userId}`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Vector store NOT initialized (no Pinecone client).`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating vector store for user ${this.userId}:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store creation error stack:`, error.stack);
      // Still set the userId even if vectorStore creation fails
    }

    return this;
  }

  // RAG Data Preparation Phase: Loading, chunking, and embedding (both core docs and repo code)
  async processPushedRepo(userId, repoId, repoData) {
    console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Processing repo for user ${userId}: ${repoId}`);
    console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Received repoData structure:`, JSON.stringify(repoData, null, 2)); 
    
    // Emit starting status
    this.emitRagStatus('processing_started', {
      userId,
      repoId,
      timestamp: new Date().toISOString()
    });

    // Set userId if not already set
    if (this.userId !== userId) {
      this.setUserId(userId);
    }

    try {
      console.log(`[${new Date().toISOString()}] 🎯 RAG REPO: Delegating to DataPreparationPipeline with LangGraph orchestration`);
      
      const result = await this.dataPreparationPipeline.processPushedRepo(userId, repoId, repoData);
      
      // Emit success status
      this.emitRagStatus('processing_completed', {
        userId,
        repoId,
        timestamp: new Date().toISOString(),
        result
      });

      console.log(`[${new Date().toISOString()}] ✅ RAG REPO: Repository processing completed with LangGraph enhancement`);
      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error processing repository ${repoId}:`, error.message);
      
      // Emit error status
      this.emitRagStatus('processing_error', {
        userId,
        repoId,
        error: error.message,
        phase: 'repository_processing',
        processedAt: new Date().toISOString()
      });
      
      return {
        success: false,
        error: `Repository processing failed: ${error.message}`,
        userId: userId,
        repoId: repoId,
        processedAt: new Date().toISOString()
      };
    }
  }

  // 2. Retrieval and generation using LangGraph workflow:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

  async respondToPrompt(userId, conversationId, prompt, conversationHistory = []) {
    this.setUserId(userId);
    if (!this.userId) {
      console.warn(`[${new Date().toISOString()}] Failed to set userId in respondToPrompt. Provided userId: ${userId}`);
      return {
        success: false,
        response: "I'm having trouble identifying your session. Please try again in a moment.",
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      };
    }

    console.log(`[${new Date().toISOString()}] 🚀 Processing AI request with LangGraph workflow for conversation ${conversationId}`);

    // Use the queue system for all AI operations
    return this.requestQueue.queueRequest(async () => {
      try {
        // Execute the LangGraph workflow
        const initialState = {
          userId,
          conversationId,
          prompt,
          conversationHistory,
          vectorStore: this.vectorStore,
          searchResults: [],
          contextData: null,
          response: null,
          error: null,
          metadata: { 
            startTime: new Date().toISOString(),
            workflowType: 'langgraph_rag'
          }
        };

        const finalState = await this.compiledRagGraph.invoke(initialState);
        
        // Format response according to existing interface
        if (finalState.error) {
          return {
            success: false,
            response: finalState.response || "I encountered an issue while processing your request. Please try again shortly.",
            conversationId,
            timestamp: new Date().toISOString(),
            error: finalState.error,
            metadata: finalState.metadata
          };
        }

        return {
          success: true,
          response: finalState.response,
          conversationId,
          timestamp: new Date().toISOString(),
          ragEnabled: finalState.metadata.ragEnabled || false,
          contextSize: finalState.contextData?.context?.length || 0,
          sourcesUsed: finalState.metadata.documentsFound || 0,
          conversationHistoryUsed: conversationHistory.length > 0,
          historyMessages: conversationHistory.length,
          metadata: finalState.metadata
        };
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in LangGraph respondToPrompt:`, error.message);
        return {
          success: false,
          response: "I encountered an issue while processing your request. Please try again shortly.",
          conversationId,
          timestamp: new Date().toISOString(),
          error: error.message
        };
      }
    });
  }

  /**
   * Helper method for vector search (reusing existing logic)
   */
  async performVectorSearch(prompt, vectorStore) {
    const VectorSearchOrchestrator = require('./rag_pipelines/query/vectorSearchOrchestrator');
    const searchOrchestrator = new VectorSearchOrchestrator(vectorStore, this.pinecone, this.embeddings);
    return await searchOrchestrator.performSearch(prompt);
  }

  /**
   * Emit RAG status events for monitoring
   */
  emitRagStatus(status, details = {}) {
    // Always log the status update
    console.log(`[${new Date().toISOString()}] 🔍 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : '');
    
    // Try to emit to the event bus if available
    try {
      // First try the instance event bus
      if (this.eventBus) {
        this.eventBus.emit('ragStatusUpdate', {
          component: 'aiLanggraphAdapter',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
        return;
      }
      
      // Fallback to imported event bus if instance one isn't available
      const eventDispatcherPath = '../../../../eventDispatcher';
      const { eventBus } = require(eventDispatcherPath);
      if (eventBus) {
        eventBus.emit('ragStatusUpdate', {
          component: 'aiLanggraphAdapter',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status update: ${error.message}`);
    }
  }
}

module.exports = AILangchainAdapter;