// aiLangchainAdapter.js
"use strict";
/* eslint-disable no-unused-vars */

const IAIPort = require('../../domain/ports/IAIPort');
const { OpenAIEmbeddings } = require('@langchain/openai');

// Import extracted utility functions
const RequestQueue = require('./requestQueue');
const LLMProviderManager = require('./providers/lLMProviderManager');

// Import the ContextPipeline for handling repository processing
const ContextPipeline = require('./rag_pipelines/context/contextPipeline');
const QueryPipeline = require('./rag_pipelines/query/queryPipeline');

// LangSmith tracing (optional)
let wrapOpenAI, traceable;
try {
  ({ wrapOpenAI } = require('langsmith/wrappers'));
  ({ traceable } = require('langsmith/traceable'));
} catch (err) {
  if (process.env.LANGSMITH_TRACING === 'true') {
    console.warn(`[${new Date().toISOString()}] [TRACE] LangSmith packages not found or failed to load: ${err.message}`);
  }
}

class AILangchainAdapter extends IAIPort {
  constructor(options = {}) {
    super();

    // Make userId null by default to avoid DI error
    this.userId = null;

    // Skip heavy initialization during tests
    if (process.env.NODE_ENV === 'test' && process.env.DISABLE_AI_SERVICES_IN_TESTS === 'true') {
      console.log('[TEST] Skipping AI services initialization for faster testing');
      this.mockMode = true;
      this.aiProvider = options.aiProvider || 'openai';
      this.eventBus = null;
      this.requestQueue = { add: jest.fn(), startQueueProcessor: jest.fn(), stopQueueProcessor: jest.fn() };
      this.pineconeService = null;
      this.pgVectorService = null;
      this.contextPipeline = null;
      return;
    }

    // Get provider from infraConfig or options
    this.aiProvider = options.aiProvider || 'openai';
    console.log(`[${new Date().toISOString()}] AILangchainAdapter initializing with provider: ${this.aiProvider}`);

    // Get access to the event bus for status updates
    try {
      const { eventBus } = require('../../../../eventDispatcher');
      this.eventBus = eventBus;
      console.log(`[${new Date().toISOString()}] 📡 Successfully connected to shared event bus`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Could not access shared event bus: ${error.message}`);
      this.eventBus = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Event bus unavailable.`);
    }

    // Initialize request queue for rate limiting and queuing
    this.requestQueue = new RequestQueue({
      maxRequestsPerMinute: 60,  // Increased from 20 to 60 for better throughput
      retryDelay: 2000,          // Reduced from 5000ms to 2000ms for faster retries
      maxRetries: 5              // Increased retries for better reliability
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

      // Initialize chat model based on provider
      this.llmProviderManager = new LLMProviderManager(this.aiProvider, {
        maxRetries: this.requestQueue.maxRetries
      });
      this.llm = this.llmProviderManager.getLLM();
      console.log(`[${new Date().toISOString()}] [DEBUG] LLM initialized.`);

      // LangSmith tracing toggle
      this.enableTracing = process.env.LANGSMITH_TRACING === 'true';
      if (this.enableTracing) {
        console.log(`[${new Date().toISOString()}] [TRACE] LangSmith tracing enabled (adapter level)`);
        console.log(`[${new Date().toISOString()}] [TRACE] LangSmith env summary: project=${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'} apiKeySet=${!!process.env.LANGSMITH_API_KEY} workspaceIdSet=${!!process.env.LANGSMITH_WORKSPACE_ID} organizationName=${process.env.LANGSMITH_ORGANIZATION_NAME || 'n/a'}`);
      }

      // Attempt to wrap underlying OpenAI client if available & tracing enabled
      if (this.enableTracing && this.aiProvider === 'openai' && wrapOpenAI) {
        try {
          // Common patterns for underlying client reference
          if (this.llm?.client) {
            this.llm.client = wrapOpenAI(this.llm.client);
            console.log(`[${new Date().toISOString()}] [TRACE] Wrapped this.llm.client with LangSmith`);
          } else if (this.llm?._client) {
            this.llm._client = wrapOpenAI(this.llm._client);
            console.log(`[${new Date().toISOString()}] [TRACE] Wrapped this.llm._client with LangSmith`);
          } else {
            console.log(`[${new Date().toISOString()}] [TRACE] No direct raw OpenAI client found to wrap (LangChain may auto-instrument).`);
          }
        } catch (wrapErr) {
          console.warn(`[${new Date().toISOString()}] [TRACE] Failed to wrap OpenAI client: ${wrapErr.message}`);
        }
      }

      // Don't initialize vectorStore until we have a userId
      this.vectorStore = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store set to null (will be initialized after userId).`);

      // Initialize ContextPipeline for repository processing
      this.contextPipeline = new ContextPipeline({
        embeddings: this.embeddings,
        eventBus: this.eventBus,
        pineconeLimiter: this.pineconeLimiter,
        maxChunkSize: 1500,  // Optimized for better semantic chunking and embedding quality
        chunkOverlap: 200    // Add overlap for better context preservation
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] ContextPipeline initialized with vector database services.`);

  // System documentation is processed via the normal docs pipeline when triggered

      // Initialize vector database resources (PostgreSQL pgvector or Pinecone fallback)
      this.pgVectorService = null;
      this.pineconePlugin = null;
      this.vectorSearchOrchestrator = null;
      
      // Prefer PostgreSQL pgvector, fallback to Pinecone
      const usePostgreSQL = process.env.USE_POSTGRESQL_VECTORS !== 'false'; // Default to true
      let shouldFallbackToPinecone = false;
      
      if (usePostgreSQL) {
        try {
          const PGVectorService = require('./rag_pipelines/context/embedding/pgVectorService');
          this.pgVectorService = PGVectorService.fromEnvironment();
          
          const VectorSearchOrchestrator = require('./rag_pipelines/query/vectorSearchOrchestrator');
          this.vectorSearchOrchestrator = new VectorSearchOrchestrator({
            embeddings: this.embeddings,
            pgVectorService: this.pgVectorService,
            defaultTopK: 10,
            defaultThreshold: 0.3,
            maxResults: 50
          });
          
          console.log(`[${new Date().toISOString()}] [DEBUG] PostgreSQL pgvector resources initialized in AILangchainAdapter`);
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] Failed to initialize PostgreSQL pgvector, falling back to Pinecone:`, error.message);
          // Set fallback flag when PostgreSQL initialization fails
          shouldFallbackToPinecone = true;
        }
      }
      
      // Fallback to Pinecone if PostgreSQL is not available or disabled
      if ((!usePostgreSQL || shouldFallbackToPinecone) && process.env.PINECONE_API_KEY) {
        const PineconePlugin = require('./rag_pipelines/context/embedding/pineconePlugin');
        const VectorSearchOrchestrator = require('./rag_pipelines/query/vectorSearchOrchestrator');
        
        this.pineconePlugin = new PineconePlugin();
        this.vectorSearchOrchestrator = new VectorSearchOrchestrator({
          embeddings: this.embeddings,
          rateLimiter: this.requestQueue?.pineconeLimiter,
          pineconePlugin: this.pineconePlugin,
          apiKey: process.env.PINECONE_API_KEY,
          indexName: process.env.PINECONE_INDEX_NAME,
          region: process.env.PINECONE_REGION,
          defaultTopK: 10,
          defaultThreshold: 0.3,
          maxResults: 50
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Pinecone fallback resources initialized in AILangchainAdapter`);
      } else if (!process.env.PINECONE_API_KEY) {
        console.warn(`[${new Date().toISOString()}] No vector database configured - neither PostgreSQL pgvector nor Pinecone available`);
      }

      // Initialize text search services
      this.textSearchService = null;
      this.hybridSearchService = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Text search services will be initialized after PostgresAdapter is available`);

      // Initialize QueryPipeline with shared Pinecone resources (no duplication)
      this.queryPipeline = new QueryPipeline({  
        embeddings: this.embeddings,
        llm: this.llm,
        eventBus: this.eventBus,
        requestQueue: this.requestQueue,
        maxRetries: this.requestQueue.maxRetries,
        // Pass shared Pinecone resources to avoid duplication
        pineconePlugin: this.pineconePlugin,
        vectorSearchOrchestrator: this.vectorSearchOrchestrator
      });
      console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline initialized in constructor`);

      console.log(`[${new Date().toISOString()}] AILangchainAdapter initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing AILangchainAdapter:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Initialization error stack:`, error.stack);
      // We'll continue with degraded functionality and try to recover later
    }
  }

  /**
   * Extract GitHub user and repository name from various sources
   * This ensures consistent namespace generation across the system
   */
  extractGitHubInfo() {
    // Try to extract from environment variables first (most reliable)
    const envUser = process.env.GITHUB_USERNAME || process.env.GITHUB_USER;
    const envRepo = process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY_NAME;
    
    if (envUser && envRepo) {
      return {
        gitUser: envUser,
        gitRepo: envRepo
      };
    }

    // Try to extract from git config (local repository)
    try {
      const { execSync } = require('child_process');
      
      // Get remote origin URL
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      
      // Parse GitHub URL (supports both HTTPS and SSH formats)
      const githubMatch = remoteUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      if (githubMatch) {
        return {
          gitUser: githubMatch[1], // Preservesss original case
          gitRepo: githubMatch[2]
        };
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] Could not extract GitHub info from git config: ${error.message}`);
    }

    // Fallback to known correct values for this repository
    return {
      gitUser: 'anatolyZader', // Actual GitHub username (with capital Z)
      gitRepo: 'vc-3'
    };
  }

  // Add method to set userId after construction - this is crucial!
  async setUserId(userId) {
    if (!userId) {
      console.warn(`[${new Date().toISOString()}] Attempted to set null/undefined userId in AILangchainAdapter`);
      return this;
    }
    
    // Handle mock mode during tests
    if (this.mockMode) {
      console.log('[TEST] Mock setUserId called with:', userId);
      this.userId = userId;
      return this;
    }
    
    console.log(`[${new Date().toISOString()}] [DEBUG] setUserId called with: ${userId}`);

    this.userId = userId;
    console.log(`[${new Date().toISOString()}] [DEBUG] userId set to: ${this.userId}`);


    try {
      // Create vector store using shared Pinecone resources
      if (this.vectorSearchOrchestrator) {
        // TEMPORARY FIX: Hardcode the complete namespace that exists in Pinecone
        const repositoryNamespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
        console.log(`[${new Date().toISOString()}] [DEBUG] TEMP FIX: Using hardcoded namespace: ${repositoryNamespace}`);
        this.vectorStore = await this.vectorSearchOrchestrator.createVectorStore(this.userId);
        // Override with correct namespace
        this.vectorStore.namespace = repositoryNamespace;
        console.log(`[${new Date().toISOString()}] [DEBUG] Vector store created using shared orchestrator for userId: ${this.userId} with namespace: ${repositoryNamespace}`);
      } else {
        console.warn(`[${new Date().toISOString()}] No shared VectorSearchOrchestrator available - vector store not initialized`);
        this.vectorStore = null;
      }

      // Update QueryPipeline with userId and vectorStore
      if (this.queryPipeline) {
        this.queryPipeline.userId = this.userId;
        this.queryPipeline.vectorStore = this.vectorStore;
        console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline updated with userId: ${this.userId} and vectorStore`);
      } else {
        console.warn(`[${new Date().toISOString()}] [DEBUG] QueryPipeline not found during setUserId - this should not happen`);
      }
      
      console.log(`[${new Date().toISOString()}] AILangchainAdapter userId updated to: ${this.userId}`);
      console.log(`[${new Date().toISOString()}] [DEBUG] QueryPipeline ready for userId: ${this.userId}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating vector store for user ${this.userId}:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store creation error stack:`, error.stack);
      // Still set the userId even if vectorStore creation fails
    }

    return this;
  }

  /**
   * Initialize text search services with PostgreSQL adapter
   * Call this method after PostgreSQL adapter is available in DI container
   */
  async initializeTextSearch(postgresAdapter) {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 Initializing text search services...`);
      
      const TextSearchService = require('../search/textSearchService');
      const HybridSearchService = require('../search/hybridSearchService');
      
      this.textSearchService = new TextSearchService({ 
        postgresAdapter,
        logger: console 
      });

      this.hybridSearchService = new HybridSearchService({
        vectorSearchOrchestrator: this.vectorSearchOrchestrator,
        textSearchService: this.textSearchService,
        logger: console
      });

      console.log(`[${new Date().toISOString()}] ✅ Text search services initialized successfully`);
      
      // Update QueryPipeline with text search services for hybrid search
      if (this.queryPipeline) {
        this.queryPipeline.textSearchService = this.textSearchService;
        this.queryPipeline.hybridSearchService = this.hybridSearchService;
        console.log(`[${new Date().toISOString()}] 🔄 QueryPipeline updated with text search services`);
      }
      
      // Update ContextPipeline with text search service for PostgreSQL storage
      if (this.contextPipeline) {
        this.contextPipeline.textSearchService = this.textSearchService;
        console.log(`[${new Date().toISOString()}] 🔄 ContextPipeline updated with text search service for PostgreSQL storage`);
      }
      
      // Test the services
      const isTextSearchAvailable = await this.textSearchService.isAvailable();
      console.log(`[${new Date().toISOString()}] 📊 Text search availability: ${isTextSearchAvailable}`);
      
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to initialize text search services:`, error.message);
      return false;
    }
  }

  // RAG Data Preparation Phase: Loading, chunking, and embedding (both core docs and repo code)
  async processPushedRepo(userId, repoId, repoData) {
    const { safeLog, createRepoDataSummary } = require('./rag_pipelines/context/utils/safeLogger');
    
    console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Processing repo for user ${userId}: ${repoId}`);
    safeLog(`[${new Date().toISOString()}] 📥 RAG REPO: Received repoData structure:`, repoData); 
    
    // Emit starting status
    this.emitRagStatus('processing_started', {
      userId,
      repoId,
      timestamp: new Date().toISOString()
    });

    // Set userId if not already set
    if (this.userId !== userId) {
      await this.setUserId(userId);
    }

    try {
      console.log(`[${new Date().toISOString()}] � RAG REPO: Delegating to ContextPipeline with ubiquitous language support`);
      
      const result = await this.contextPipeline.processPushedRepo(userId, repoId, repoData);
      
      // Emit success status
      this.emitRagStatus('processing_completed', {
        userId,
        repoId,
        timestamp: new Date().toISOString(),
        result
      });

      console.log(`[${new Date().toISOString()}] ✅ RAG REPO: Repository processing completed with ubiquitous language enhancement`);
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

  // 2. Retrieval anddd generation:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

  async respondToPrompt(userId, conversationId, prompt, conversationHistory = []) {
    // Handle mock mode during tests
    if (this.mockMode) {
      console.log('[TEST] Mock respondToPrompt called');
      return {
        success: true,
        response: "Mock AI response for testing",
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      };
    }
    
    const exec = async () => {
      await this.setUserId(userId);
      if (!this.userId) {
        console.warn(`[${new Date().toISOString()}] Failed to set userId in respondToPrompt. Provided userId: ${userId}`);
        return {
          success: false,
          response: "I'm having trouble identifying your session. Please try again in a moment.",
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        };
      }

      console.log(`[${new Date().toISOString()}] Processing AI request for conversation ${conversationId}`);

      // Use the queue system for all AI operations
      return this.requestQueue.queueRequest(async () => {
        try {
          // Delegate to QueryPipeline for RAG processing
          const result = await this.queryPipeline.respondToPrompt(
            userId,
            conversationId,
            prompt,
            conversationHistory,
            this.vectorStore,
            null // TODO: Pass proper repository descriptor when available
          );
          return result;
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error in respondToPrompt:`, error.message);
          return {
            success: false,
            response: "I encountered an issue while processing your request. Please try again shortly.",
            conversationId,
            timestamp: new Date().toISOString(),
            error: error.message
          };
        }
      });
    };

    if (this.enableTracing && traceable) {
      try {
        const traced = traceable(exec, {
          name: 'AIAdapter.respondToPrompt',
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { userId, conversationId },
            tags: ['rag', 'adapter', 'query']
        });
        return traced();
      } catch (traceErr) {
        console.warn(`[${new Date().toISOString()}] [TRACE] Failed to trace respondToPrompt: ${traceErr.message}`);
      }
    }
    return exec();
  }

  /**
   * Perform text search using PostgreSQL
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Text search results
   */
  async searchText(query, options = {}) {
    if (!this.textSearchService) {
      throw new Error('Text search service not initialized. Call initializeTextSearch() first.');
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔍 Performing text search: "${query}"`);
      
      const results = await this.textSearchService.searchDocuments(query, {
        userId: this.userId,
        ...options
      });
      
      console.log(`[${new Date().toISOString()}] 📄 Text search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Text search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Perform hybrid search combining vector and text search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Array} Combined search results
   */
  async searchHybrid(query, options = {}) {
    if (!this.hybridSearchService) {
      throw new Error('Hybrid search service not initialized. Call initializeTextSearch() first.');
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔄 Performing hybrid search: "${query}"`);
      
      // Add user's namespace for vector search
      const searchOptions = {
        userId: this.userId,
        namespace: this.vectorStore?.namespace,
        ...options
      };

      const results = await this.hybridSearchService.search(query, searchOptions);
      
      console.log(`[${new Date().toISOString()}] 🎯 Hybrid search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Hybrid search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get search capabilities and statistics
   * @returns {object} Information about available search capabilities
   */
  async getSearchCapabilities() {
    const capabilities = {
      vectorSearch: {
        available: !!this.vectorSearchOrchestrator,
        connected: this.vectorSearchOrchestrator?.isConnected() || false
      },
      textSearch: {
        available: !!this.textSearchService,
        connected: false
      },
      hybridSearch: {
        available: !!this.hybridSearchService
      }
    };

    // Check text search connectivity
    if (this.textSearchService) {
      try {
        capabilities.textSearch.connected = await this.textSearchService.isAvailable();
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] Could not check text search availability:`, error.message);
      }
    }

    // Get detailed capabilities from hybrid service if available
    if (this.hybridSearchService) {
      try {
        const detailedCapabilities = await this.hybridSearchService.getSearchCapabilities(this.userId);
        capabilities.detailed = detailedCapabilities;
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] Could not get detailed search capabilities:`, error.message);
      }
    }

    return capabilities;
  }

  /**
   * Test search functionality
   * @param {string} testQuery - Query to test with
   * @returns {object} Test results from all search systems
   */
  async testSearchSystems(testQuery = 'function') {
    const results = {
      vectorSearch: { available: false, success: false, results: [], error: null },
      textSearch: { available: false, success: false, results: [], error: null },
      hybridSearch: { available: false, success: false, results: [], error: null }
    };

    // Test vector search
    if (this.vectorSearchOrchestrator) {
      results.vectorSearch.available = true;
      try {
        const vectorResults = await this.vectorSearchOrchestrator.searchSimilar(testQuery, {
          namespace: this.vectorStore?.namespace,
          topK: 3,
          threshold: 0.3
        });
        results.vectorSearch.success = true;
        results.vectorSearch.results = vectorResults;
      } catch (error) {
        results.vectorSearch.error = error.message;
      }
    }

    // Test text search
    if (this.textSearchService) {
      results.textSearch.available = true;
      try {
        const textResults = await this.textSearchService.searchDocumentsSimple(testQuery, { 
          userId: this.userId, 
          limit: 3 
        });
        results.textSearch.success = true;
        results.textSearch.results = textResults;
      } catch (error) {
        results.textSearch.error = error.message;
      }
    }

    // Test hybrid search
    if (this.hybridSearchService) {
      results.hybridSearch.available = true;
      try {
        const hybridResults = await this.hybridSearchService.testSearchSystems(testQuery);
        results.hybridSearch.success = true;
        results.hybridSearch.results = hybridResults;
      } catch (error) {
        results.hybridSearch.error = error.message;
      }
    }

    return results;
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
      const payload = {
        component: 'aiLangchainAdapter',
        phase: status,
        metrics: details,
        ts: new Date().toISOString()
      };

      // First try the instance event bus
      if (this.eventBus) {
        this.eventBus.emit('rag.status', payload);
        return;
      }
      
      // Fallback to imported event bus if instance one isn't available
      const eventDispatcherPath = '../../../../eventDispatcher';
      const { eventBus } = require(eventDispatcherPath);
      if (eventBus) {
        eventBus.emit('rag.status', payload);
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status update: ${error.message}`);
    }
  }

  /**
   * Manually trigger system documentation processing
   * Useful for refreshing documentation or debugging
   */
  // (No manual system documentation startup here; the DocsProcessor can be invoked where appropriate.)
}

module.exports = AILangchainAdapter;