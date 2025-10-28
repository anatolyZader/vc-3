// Import services for RAG pipeline
const VectorSearchOrchestrator = require('./vectorSearchOrchestrator');
const ContextBuilder = require('./contextBuilder');
const ResponseGenerator = require('./responseGenerator');

// LangSmith tracing (optional)
let traceable;
try {
  ({ traceable } = require('langsmith/traceable'));
} catch (err) {
  if (process.env.LANGSMITH_TRACING === 'true') {
    console.warn(`[${new Date().toISOString()}] [TRACE] LangSmith traceable not found or failed to load: ${err.message}`);
  }
}

const TraceArchiver = require('../../langsmith/trace-archiver');

class QueryPipeline {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.llm = options.llm;
    this.requestQueue = options.requestQueue;
    this.userId = options.userId;
    this.eventBus = options.eventBus;
    
    // Text search services for hybrid search capabilities
    this.textSearchService = options.textSearchService || null;
    this.hybridSearchService = options.hybridSearchService || null;
    
    // Use shared vectorSearchOrchestrator if provided, otherwise create our own
    if (options.vectorSearchOrchestrator) {
      this.vectorSearchOrchestrator = options.vectorSearchOrchestrator;
      console.log(`[${new Date().toISOString()}] QueryPipeline using shared VectorSearchOrchestrator`);
    } else {
      // Fallback: create our own (for backwards compatibility or standalone usage)
      this.vectorSearchOrchestrator = new VectorSearchOrchestrator({
        embeddings: this.embeddings,
        rateLimiter: this.requestQueue?.pineconeLimiter,
        pineconePlugin: options.pineconePlugin,
        apiKey: process.env.PINECONE_API_KEY,
        indexName: process.env.PINECONE_INDEX_NAME,
        region: process.env.PINECONE_REGION,
        defaultTopK: 30,        // Increased from 10 to 30
        defaultThreshold: 0.25, // Lowered from 0.3 to 0.25 for even more matches
        maxResults: 100         // Increased from 50 to 100
      });
      console.log(`[${new Date().toISOString()}] QueryPipeline created its own VectorSearchOrchestrator`);
    }
    this.responseGenerator = new ResponseGenerator(this.llm, this.requestQueue);
    
    // Initialize trace archiver for automatic analysis archiving
    this.traceArchiver = new TraceArchiver();
    
    console.log(`[${new Date().toISOString()}] QueryPipeline initialized for comprehensive RAG processing`);

    this.enableTracing = process.env.LANGSMITH_TRACING === 'true' && !!traceable;
    if (this.enableTracing) {
      try {
        // Wrap core methods (bind first to preserve context)
        this.performVectorSearch = traceable(
          this.performVectorSearch.bind(this),
          {
            name: 'QueryPipeline.performVectorSearch',
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { component: 'QueryPipeline', phase: 'retrieval' },
            tags: ['rag', 'retrieval']
          }
        );
        this.respondToPrompt = traceable(
          this.respondToPrompt.bind(this),
          {
            name: 'QueryPipeline.respondToPrompt',
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { component: 'QueryPipeline' },
            tags: ['rag', 'pipeline']
          }
        );
        console.log(`[${new Date().toISOString()}] [TRACE] QueryPipeline tracing enabled.`);
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] [TRACE] Failed to enable QueryPipeline tracing: ${err.message}`);
      }
    }
  }

  async getVectorStore() {
    if (!this.vectorSearchOrchestrator || !this.userId) {
      throw new Error('Vector search orchestrator not initialized or missing userId');
    }
    
    const vectorStore = await this.vectorSearchOrchestrator.createVectorStore(this.userId);
    // TEMPORARY FIX: Use hardcoded namespace that matches aiLangchainAdapter
    vectorStore.namespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
    console.log(`[${new Date().toISOString()}] [DEBUG] TEMP FIX: getVectorStore using hardcoded namespace:`);
    return vectorStore;
  }

  /**
   * Main method that handles the complete RAG pipeline for responding to prompts
   */
  async respondToPrompt(userId, conversationId, prompt, conversationHistory = [], vectorStore = null, repoDescriptor = null) {
    const traceData = {
      startTime: new Date().toISOString(),
      userId,
      conversationId,
      prompt,
      traceId: null,
      runId: null,
      steps: []
    };
    
    try {
      console.log(`[${new Date().toISOString()}] QueryPipeline processing prompt for user ${userId}`);
      traceData.steps.push({ step: 'initialization', timestamp: new Date().toISOString(), status: 'success' });
      
      // Lazy initialization of vectorStore if not provided and not already initialized
      if (!vectorStore && !this.vectorStore) {
        try {
          console.log(`[${new Date().toISOString()}] [DEBUG] Lazy-initializing vectorStore for QueryPipeline`);
          this.vectorStore = await this.getVectorStore();
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] [DEBUG] Failed to lazy-initialize vectorStore: ${error.message}`);
          this.vectorStore = null;
        }
      }
      const activeVectorStore = vectorStore || this.vectorStore;
      
      if (!this.isVectorStoreAvailable(activeVectorStore)) {
        traceData.steps.push({ step: 'vector_store_check', timestamp: new Date().toISOString(), status: 'failed', message: 'Vector database not available' });
        console.log(`[${new Date().toISOString()}] 🔄 Vector database not available, generating standard response`);
        return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
      }
      traceData.steps.push({ step: 'vector_store_check', timestamp: new Date().toISOString(), status: 'success' });

      const searchResults = await this.performVectorSearch(prompt, activeVectorStore, traceData, userId, null, repoDescriptor);
      
      if (searchResults.length === 0) {
        traceData.steps.push({ step: 'vector_search', timestamp: new Date().toISOString(), status: 'no_results' });
        console.log(`[${new Date().toISOString()}] 🔄 No relevant documents found, generating standard response`);
        return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
      }
      traceData.steps.push({ step: 'vector_search', timestamp: new Date().toISOString(), status: 'success', documentsFound: searchResults.length });

      // Perform complementary text search if available
      let finalSearchResults = searchResults;
      let textResults = [];
      if (this.textSearchService) {
        try {
          textResults = await this.performTextSearch(prompt, traceData, userId, null);
          traceData.steps.push({ 
            step: 'text_search', 
            timestamp: new Date().toISOString(), 
            status: 'success', 
            documentsFound: textResults.length 
          });
          
          // Combine vector and text search results
          finalSearchResults = this.combineSearchResults(searchResults, textResults);
          traceData.steps.push({ 
            step: 'hybrid_search_combination', 
            timestamp: new Date().toISOString(), 
            status: 'success', 
            totalDocuments: finalSearchResults.length,
            vectorDocuments: searchResults.length,
            textDocuments: textResults.length
          });
          
          // Write all chunks to markdown file for debugging (non-blocking)
          setImmediate(async () => {
            try {
              const logPath = await this.writeChunksToMarkdown(searchResults, textResults, prompt);
              console.log(`[${new Date().toISOString()}] ✅ Chunk details saved to: ${logPath}`);
            } catch (logError) {
              console.warn(`[${new Date().toISOString()}] ⚠️ Failed to write chunk log:`, logError.message);
            }
          });
        } catch (textError) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Text search failed, continuing with vector results only:`, textError.message);
          traceData.steps.push({ 
            step: 'text_search', 
            timestamp: new Date().toISOString(), 
            status: 'failed', 
            error: textError.message 
          });
          
          // Still log vector results even if text search fails (non-blocking)
          setImmediate(async () => {
            try {
              const logPath = await this.writeChunksToMarkdown(searchResults, [], prompt);
              console.log(`[${new Date().toISOString()}] ✅ Vector chunks saved to: ${logPath}`);
            } catch (logError) {
              console.warn(`[${new Date().toISOString()}] ⚠️ Failed to write chunk log:`, logError.message);
            }
          });
        }
      } else {
        console.log(`[${new Date().toISOString()}] 📋 Text search not available, using vector search results only`);
        traceData.steps.push({ 
          step: 'text_search', 
          timestamp: new Date().toISOString(), 
          status: 'skipped', 
          reason: 'service_not_available' 
        });
        
        // Log vector-only results to markdown (non-blocking)
        setImmediate(async () => {
          try {
            const logPath = await this.writeChunksToMarkdown(searchResults, [], prompt);
            console.log(`[${new Date().toISOString()}] ✅ Vector-only chunks saved to: ${logPath}`);
          } catch (logError) {
            console.warn(`[${new Date().toISOString()}] ⚠️ Failed to write chunk log:`, logError.message);
          }
        });
      }

      const contextData = ContextBuilder.formatContext(finalSearchResults);
      traceData.steps.push({ step: 'context_building', timestamp: new Date().toISOString(), status: 'success', contextSize: contextData.context.length });
      
      const response = await this.responseGenerator.generateWithContext(prompt, contextData, conversationHistory);
      traceData.steps.push({ step: 'response_generation', timestamp: new Date().toISOString(), status: 'success', responseLength: response?.content?.length || 0 });
      
      // Capture the AI response for trace analysis with LangSmith data
      if (process.env.RAG_ENABLE_CHUNK_LOGGING === 'true') {
        try {
          traceData.endTime = new Date().toISOString();
          traceData.totalDuration = new Date(traceData.endTime) - new Date(traceData.startTime);
          
          // Attempt to capture LangSmith trace metadata
          try {
            const { getCurrentRunTree } = require('langsmith');
            const currentRun = getCurrentRunTree();
            if (currentRun) {
              traceData.traceId = currentRun.trace_id;
              traceData.runId = currentRun.id;
              console.log(`[${new Date().toISOString()}] 🔗 LANGSMITH: Captured trace ID: ${traceData.traceId}`);
            }
          } catch (langsmithError) {
            console.log(`[${new Date().toISOString()}] 📝 LANGSMITH: Trace capture not available: ${langsmithError.message}`);
          }
          
          // Update trace analysis with comprehensive LangSmith trace data
          setImmediate(async () => {
            try {
              const analysisContent = this.generateComprehensiveTraceAnalysis(prompt, searchResults, traceData, response);
              await this.traceArchiver.updateTraceAnalysis(analysisContent);
              console.log(`[${new Date().toISOString()}] 📊 TRACE-ARCHIVER: Updated trace analysis with LangSmith trace data`);
              console.log(`[${new Date().toISOString()}] 🔍 Trace details: ${traceData.chunks?.length || 0} chunks, ${traceData.totalDuration}ms total`);
            } catch (error) {
              console.warn(`[${new Date().toISOString()}] ⚠️ TRACE-ARCHIVER: Failed to update analysis with trace data: ${error.message}`);
            }
          });
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️ TRACE-ARCHIVER: Failed to capture trace data: ${error.message}`);
        }
      }
      
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
    // If we have an injected vectorStore, validate it properly
    if (vectorStore) {
      // Check if vectorStore has the required properties and methods
      if (!vectorStore.embeddings || !vectorStore.pineconeIndex) {
        console.warn(`[${new Date().toISOString()}] [DEBUG] Injected vectorStore missing required properties`);
        return false;
      }
      
      // If vectorStore has a namespace, that's a good sign it's properly configured
      if (vectorStore.namespace) {
        return true;
      }
      
      // For vectorStores without explicit namespace, we need the orchestrator to validate
      if (this.vectorSearchOrchestrator?.isConnected?.() === true) {
        return true;
      }
      
      console.warn(`[${new Date().toISOString()}] [DEBUG] Injected vectorStore appears to be stale or incomplete`);
      return false;
    }
    
    // No injected vectorStore - check if we have an initialized vectorStore from successful setup
    if (this.vectorStore) {
      return this.isVectorStoreAvailable(this.vectorStore);
    }
    
    // No vectorStore at all - only trust orchestrator if we have userId (required for vectorStore creation)
    if (this.userId && this.vectorSearchOrchestrator?.isConnected?.() === true) {
      return true;
    }
    
    // No valid vectorStore and either no userId or orchestrator not connected
    console.log(`[${new Date().toISOString()}] [DEBUG] Vector store not available: userId=${!!this.userId}, orchestrator=${!!this.vectorSearchOrchestrator}, connected=${this.vectorSearchOrchestrator?.isConnected?.() === true}`);
    return false;
  }

  /**
   * Create repository descriptor from repository URL or parts
   * @param {string|object} repoData - Either a GitHub URL or object with owner/name/branch
   * @returns {object|null} Repository descriptor with owner, name, branch
   */
  static createRepoDescriptor(repoData) {
    if (!repoData) return null;
    
    if (typeof repoData === 'string') {
      try {
        // Parse various GitHub URL formats including enterprise and branch URLs
        const url = new URL(repoData);
        
        // Support github.com and GitHub Enterprise (any host ending with github.com or containing github)
        const isGitHub = url.hostname === 'github.com' || 
                        url.hostname.endsWith('.github.com') || 
                        url.hostname.includes('github');
        
        if (isGitHub) {
          // Parse path: /owner/repo[/tree/branch][.git]
          const pathMatch = url.pathname.match(/^\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?(?:\.git)?(?:\/.*)?$/);
          
          if (pathMatch) {
            const [, owner, repo, branchInUrl] = pathMatch;
            return {
              owner: owner,
              name: repo.replace(/\.git$/, ''),
              branch: branchInUrl || 'main' // Use branch from URL or default to main
            };
          }
        }
        
        // Fallback to regex for malformed URLs
        const regexMatch = repoData.match(/(?:github\.com|[\w.-]+github[\w.-]*)[\/:]([^\/]+)\/([^\/\s]+?)(?:\/tree\/([^\/\s]+))?(?:\.git)?(?:[\/\s]|$)/i);
        if (regexMatch) {
          const [, owner, repo, branchInUrl] = regexMatch;
          return {
            owner: owner,
            name: repo.replace(/\.git$/, ''),
            branch: branchInUrl || 'main'
          };
        }
      } catch (urlError) {
        // If URL parsing fails, try regex fallback
        const regexMatch = repoData.match(/(?:github\.com|[\w.-]+github[\w.-]*)[\/:]([^\/]+)\/([^\/\s]+?)(?:\/tree\/([^\/\s]+))?(?:\.git)?(?:[\/\s]|$)/i);
        if (regexMatch) {
          const [, owner, repo, branchInUrl] = regexMatch;
          return {
            owner: owner,
            name: repo.replace(/\.git$/, ''),
            branch: branchInUrl || 'main'
          };
        }
      }
    } else if (typeof repoData === 'object') {
      // Use provided object
      return {
        owner: repoData.owner || repoData.githubOwner,
        name: repoData.name || repoData.repoName,
        branch: repoData.branch || 'main'
      };
    }
    
    return null;
  }

  /**
   * Perform vector search with repository-specific namespace
   * @param {string} prompt - The search prompt
   * @param {object} vectorStore - Vector store instance
   * @param {object} traceData - Tracing data object
   * @param {string} userId - User identifier
   * @param {string} repoId - Repository identifier
   * @param {object} repoDescriptor - Repository descriptor {owner, name, branch}
   * @returns {Array} Search results
   */
  async performVectorSearch(prompt, vectorStore, traceData = null, userId = null, repoId = null, repoDescriptor = null) {
    const VectorSearchStrategy = require('./vectorSearchStrategy');
    
    // Store the provided vectorStore for future use
    if (vectorStore && !this.vectorStore) {
      this.vectorStore = vectorStore;
    }
    
    if (traceData) {
      traceData.vectorStore = 'primary';
      traceData.searchStrategy = repoId ? 'repository_specific_search' : 'intelligent_strategy_with_filters';
    }
    
    // Determine search strategy and apply filters
    const searchStrategy = VectorSearchStrategy.determineSearchStrategy(prompt);
    console.log(`[${new Date().toISOString()}] 🎯 SEARCH STRATEGY: ${searchStrategy.codeResults} code + ${searchStrategy.docsResults} docs results`);
    
    // Use repository-specific search if repoId is provided, otherwise use intelligent search with filters
    let searchResults;
    if (repoId && userId) {
      console.log(`[${new Date().toISOString()}] 🎯 Repository-specific search: ${userId}/${repoId}`);
      searchResults = await this.vectorSearchOrchestrator.searchInRepository(prompt, userId, repoId, {
        topK: searchStrategy.codeResults + searchStrategy.docsResults,
        threshold: 0.3,
        filter: this.combineFilters(searchStrategy.codeFilters, searchStrategy.docsFilters)
      });
    } else {
      // Apply intelligent search strategy with proper filters
      const repositoryNamespace = 'd41402df-182a-41ec-8f05-153118bf2718_anatolyzader_vc-3';
      console.log(`[${new Date().toISOString()}] 🔍 Intelligent search with filters in namespace: ${repositoryNamespace}`);
      
      // Apply filters to prevent API spec dominance
      const combinedFilter = this.combineFilters(searchStrategy.codeFilters, searchStrategy.docsFilters);
      
      // For file-specific queries, use enhanced semantic search with lower threshold and higher topK
      const threshold = searchStrategy.priority === 'file-specific' ? 0.25 : 0.3;
      const topK = searchStrategy.codeResults + searchStrategy.docsResults;
      
      if (searchStrategy.explicitFiles && searchStrategy.explicitFiles.length > 0) {
        console.log(`[${new Date().toISOString()}] 📁 FILE-SPECIFIC SEARCH: Looking for ${searchStrategy.explicitFiles.join(', ')}`);
        console.log(`[${new Date().toISOString()}] 🔍 Using hybrid approach: semantic search + full-text search for filenames`);
      }
      
      searchResults = await this.vectorSearchOrchestrator.searchSimilar(prompt, {
        namespace: repositoryNamespace,
        topK,
        threshold,
        includeMetadata: true,
        filter: combinedFilter
      });
      
      // If this is a file-specific query, also perform full-text search for filename matching
      if (searchStrategy.explicitFiles && searchStrategy.explicitFiles.length > 0 && this.textSearchService) {
        console.log(`[${new Date().toISOString()}] 📄 Adding full-text search for explicit file matching`);
        
        // Search for each mentioned file using full-text search
        const textSearchResults = [];
        for (const filename of searchStrategy.explicitFiles) {
          try {
            console.log(`[${new Date().toISOString()}] 🔍 Full-text search for: ${filename}`);
            const fileResults = await this.textSearchService.searchDocuments(filename, {
              userId,
              limit: 10  // Get up to 10 chunks per file
            });
            
            if (fileResults.length > 0) {
              console.log(`[${new Date().toISOString()}] ✅ Found ${fileResults.length} chunks via full-text search for ${filename}`);
              textSearchResults.push(...fileResults);
            } else {
              console.log(`[${new Date().toISOString()}] ⚠️ No results from full-text search for ${filename}`);
            }
          } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Full-text search error for ${filename}:`, error.message);
          }
        }
        
        // Convert text search results to compatible format and merge with vector search
        if (textSearchResults.length > 0) {
          const formattedTextResults = textSearchResults.map(result => ({
            id: `text_${result.id}`,
            score: result.rank * 0.5,  // Scale rank to match vector scores (0-1 range)
            metadata: {
              text: result.content,
              content: result.content,
              source: result.filePath,
              type: 'github-code',
              isTextSearchResult: true,
              snippet: result.snippet
            }
          }));
          
          console.log(`[${new Date().toISOString()}] 🔀 Merging ${searchResults.matches?.length || 0} vector results + ${formattedTextResults.length} text results`);
          
          // Merge results, prioritizing text search results for file-specific queries
          searchResults.matches = [...formattedTextResults, ...(searchResults.matches || [])];
        }
      }
    }
    
    // Convert to legacy format with deduplication and per-source caps
    const rawResults = (searchResults.matches || []).map((match, index) => {
      const pageContent = match.metadata?.text || 
                         match.metadata?.content || 
                         match.metadata?.pageContent || 
                         '';
      
      return {
        pageContent,
        metadata: {
          ...match.metadata,
          score: match.score,
          id: match.id
        }
      };
    });
    
    // CRITICAL FIX: Apply content-type filtering BEFORE deduplication to prevent catalog dominance
    const filteredResults = this.filterContentTypes(rawResults, prompt);
    console.log(`[${new Date().toISOString()}] 🧹 CONTENT_FILTER: ${rawResults.length} → ${filteredResults.length} (catalogs filtered in pipeline)`);
    
    // Apply deduplication and per-source caps on filtered results
    const results = this.deduplicateAndCapResults(filteredResults, searchStrategy);
    
    if (traceData) {
      traceData.chunks = this.captureChunkData(results);
    }
    
    // Log full chunk content if enabled
    if (process.env.RAG_ENABLE_CHUNK_LOGGING === 'true' && results.length > 0) {
      console.log(`[${new Date().toISOString()}] 📋 CHUNK CONTENT LOGGING: Retrieved ${results.length} chunks for query: "${prompt.substring(0, 100)}..."`);
      
      // Archive previous analysis and create new one (only once per query)
      if (!this._archiveCreated) {
        try {
          await this.traceArchiver.archiveAndPrepare(prompt, new Date().toISOString());
          console.log(`[${new Date().toISOString()}] 📁 TRACE-ARCHIVER: Archived previous analysis and created new trace file`);
          this._archiveCreated = true;
        } catch (error) {
          console.warn(`[${new Date().toISOString()}] ⚠️ TRACE-ARCHIVER: Failed to archive: ${error.message}`);
        }
      }
      
      this.logChunkDetails(results);
    }
    
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

  /**
   * Combine code and docs filters into a single Pinecone filter
   * @param {object} codeFilters - Filters for code chunks
   * @param {object} docsFilters - Filters for documentation chunks
   * @returns {object} Combined Pinecone filter
   */
  combineFilters(codeFilters, docsFilters) {
    const filters = [];
    
    // Add code filters
    if (codeFilters && Object.keys(codeFilters).length > 0) {
      const codeFilter = { ...codeFilters };
      filters.push(codeFilter);
    }
    
    // Add docs filters
    if (docsFilters && Object.keys(docsFilters).length > 0) {
      const docsFilter = { ...docsFilters };
      filters.push(docsFilter);
    }
    
    // If we have multiple filter groups, combine with OR
    if (filters.length > 1) {
      return { $or: filters };
    } else if (filters.length === 1) {
      return filters[0];
    }
    
    // No filters - return undefined to allow all results
    return undefined;
  }

  /**
   * Deduplicate results and apply per-source caps to prevent one source type from dominating
   * @param {Array} results - Raw search results
   * @param {object} searchStrategy - Search strategy with caps
   * @returns {Array} Deduplicated and capped results
   */
  deduplicateAndCapResults(results, searchStrategy) {
    console.log(`[${new Date().toISOString()}] 🔄 Deduplicating ${results.length} raw results`);
    
    // Step 1: Deduplicate by content hash
    const seen = new Set();
    const deduplicated = [];
    
    for (const result of results) {
      // Create a content hash for deduplication
      const contentHash = this.createContentHash(result.pageContent);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        deduplicated.push(result);
      }
    }
    
    console.log(`[${new Date().toISOString()}] 🔄 After deduplication: ${deduplicated.length} unique results`);
    
    // Step 2: Apply per-source caps to prevent dominance
    // Note: Caps can be adjusted based on search strategy priority
    const baseSourceTypeCaps = {
      'apiSpec': 5,                      // Max 5 API spec chunks
      'apiSpecFull': 2,                  // Max 2 full API spec
      'module_documentation': 8,         // Max 8 module docs
      'architecture_documentation': 5,   // Max 5 architecture docs
      
      // Specific GitHub file types (new)
      'github-code': 20,                 // Increased from 15 to 20 for better multi-file coverage
      'github-docs': 8,                  // Documentation files
      'github-test': 5,                  // Test files (less priority)
      'github-config': 3,                // Configuration files (minimal)
      'github-catalog': 0,               // Exclude catalogs by default
      
      // Legacy support
      'github-file': 10,                 // Fallback for uncategorized GitHub files
      'github-file-code': 12,            // Legacy code type
      'github-file-json': 3              // Legacy JSON type
    };
    
    // Apply dynamic adjustments based on search strategy
    const sourceTypeCaps = { ...baseSourceTypeCaps };
    
    // Boost code cap for file-specific queries (explicit file mentions)
    if (searchStrategy && searchStrategy.priority === 'file-specific') {
      sourceTypeCaps['github-code'] = 25;  // Higher limit for explicit file requests
      console.log(`[${new Date().toISOString()}] 🎯 FILE-SPECIFIC QUERY: Boosted github-code cap to 25`);
    }
    
    const sourceTypeCounts = {};
    const cappedResults = [];
    
    for (const result of deduplicated) {
      const sourceType = result.metadata?.type || 'unknown';
      const currentCount = sourceTypeCounts[sourceType] || 0;
      const maxAllowed = sourceTypeCaps[sourceType] || 5; // Default cap of 5
      
      if (currentCount < maxAllowed) {
        cappedResults.push(result);
        sourceTypeCounts[sourceType] = currentCount + 1;
      }
    }
    
    console.log(`[${new Date().toISOString()}] 🔄 After per-source capping: ${cappedResults.length} results`);
    console.log(`[${new Date().toISOString()}] 📊 Source distribution:`, sourceTypeCounts);
    
    return cappedResults;
  }

  /**
   * Create a content hash for deduplication
   * @param {string} content - Content to hash
   * @returns {string} Content hash
   */
  createContentHash(content) {
    // Simple hash based on content length and first/last chars for quick deduplication
    if (!content || content.length === 0) return 'empty';
    
    const cleanContent = content.trim();
    const length = cleanContent.length;
    const start = cleanContent.substring(0, 50);
    const end = cleanContent.substring(Math.max(0, length - 50));
    
    return `${length}-${start}-${end}`.replace(/\s+/g, ' ');
  }

  /**
   * Perform complementary text search using PostgreSQL full-text search
   * @param {string} prompt - The search query/prompt
   * @param {object} traceData - Trace data object for logging
   * @param {string} userId - User ID for filtering
   * @param {string} repoId - Repository ID for filtering
   * @returns {Array} Text search results in compatible format
   */
  async performTextSearch(prompt, traceData = null, userId = null, repoId = null) {
    if (!this.textSearchService) {
      console.log(`[${new Date().toISOString()}] ⚠️ Text search not available - service not initialized`);
      return [];
    }

    try {
      console.log(`[${new Date().toISOString()}] 🔍 Performing complementary text search: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);
      
      const searchOptions = {
        limit: 5, // Limit text search results to complement vector search
        offset: 0
      };

      // Add user and repo filters if provided
      if (userId) {
        searchOptions.userId = userId;
      }
      if (repoId) {
        searchOptions.repoId = repoId;
      }

      const startTime = Date.now();
      const textResults = await this.textSearchService.searchDocuments(prompt, searchOptions);
      const searchDuration = Date.now() - startTime;

      console.log(`[${new Date().toISOString()}] 📄 Text search completed in ${searchDuration}ms, found ${textResults.length} results`);

      // Convert text search results to format compatible with vector search results
      const formattedResults = textResults.map(result => ({
        pageContent: result.content || '',
        metadata: {
          id: result.id,
          userId: result.userId,
          repoId: result.repoId,
          source: result.source || 'postgres_text_search',
          searchType: 'text',
          rank: result.rank,
          snippet: result.snippet,
          // Mark as text search result for context building
          isTextSearchResult: true
        }
      }));

      // Log text search details if chunk logging is enabled
      if (process.env.RAG_ENABLE_CHUNK_LOGGING === 'true' && formattedResults.length > 0) {
        console.log(`[${new Date().toISOString()}] 📋 TEXT SEARCH CHUNKS: Retrieved ${formattedResults.length} text-based chunks`);
        formattedResults.forEach((result, index) => {
          console.log(`[${new Date().toISOString()}] 📄 Text Chunk ${index + 1}:`);
          console.log(`   🏷️  All Tags/Metadata:`, JSON.stringify(result.metadata, null, 2));
          console.log(`   📝 Content Preview: "${result.pageContent.substring(0, 150)}..."`);
        });
      }

      return formattedResults;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Text search failed:`, error.message);
      if (traceData) {
        traceData.steps.push({ 
          step: 'text_search', 
          timestamp: new Date().toISOString(), 
          status: 'error', 
          error: error.message 
        });
      }
      return [];
    }
  }

  /**
   * Combine vector search and text search results for hybrid search
   * @param {Array} vectorResults - Results from vector search
   * @param {Array} textResults - Results from text search
   * @returns {Array} Combined and deduplicated results
   */
  combineSearchResults(vectorResults, textResults) {
    if (textResults.length === 0) {
      return vectorResults;
    }

    console.log(`[${new Date().toISOString()}] 🔄 Combining ${vectorResults.length} vector results with ${textResults.length} text results`);

    // Combine results and deduplicate across both sources
    const allResults = [...vectorResults, ...textResults];
    
    // Deduplicate the combined results
    const seen = new Set();
    const deduplicatedResults = [];
    
    for (const result of allResults) {
      const contentHash = this.createContentHash(result.pageContent);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        deduplicatedResults.push(result);
      }
    }

    console.log(`[${new Date().toISOString()}] ✅ Combined and deduplicated: ${deduplicatedResults.length} unique documents (was ${allResults.length})`);
    
    return deduplicatedResults;
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
      contextSize: contextData.context?.length ?? 0,
      sourcesUsed: contextData.sourceAnalysis?.total ?? 0,
      sourcesBreakdown: contextData.sourcesBreakdown ?? {},
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
    if (this.eventBus?.emit) {
      this.eventBus.emit('rag.status', { 
        component: 'queryPipeline',
        phase: status,
        metrics: data || {},
        ts: new Date().toISOString()
      });
      console.log(`[${new Date().toISOString()}] Emitted RAG status: ${status}`);
    }
  }

  /**
   * Generate comprehensive trace analysis content from query and results
   */
  generateTraceAnalysis(prompt, searchResults, timestamp, aiResponse = null) {
    const totalChars = searchResults.reduce((sum, doc) => sum + doc.pageContent.length, 0);
    const sources = searchResults.map(doc => doc.metadata.source || 'Unknown');
    const uniqueSources = [...new Set(sources)];
    
    // Categorize source types
    const sourceTypes = {
      githubCode: searchResults.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length,
      moduleDocs: searchResults.filter(doc => doc.metadata.type === 'module_documentation').length,
      architectureDocs: searchResults.filter(doc => doc.metadata.type === 'architecture_documentation').length,
      apiSpec: searchResults.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
      other: searchResults.filter(doc => 
        !doc.metadata.repoId && 
        !doc.metadata.githubOwner && 
        !['module_documentation', 'architecture_documentation', 'apiSpec', 'apiSpecFull'].includes(doc.metadata.type)
      ).length
    };

    const content = `# RAG Trace Analysis - ${new Date(timestamp).toLocaleString()}

## Query Details
- **Query**: "${prompt}"
- **Timestamp**: ${timestamp}
- **User ID**: ${this.userId || 'Unknown'}
- **Analysis Generated**: ${new Date().toISOString()}

## RAG Pipeline Execution Flow

### 1. Initialization Phase ✅
- LangSmith tracing: ${process.env.LANGSMITH_TRACING === 'true' ? 'Enabled' : 'Disabled'}
- Vector store available: ${this.vectorStore ? 'Yes' : 'No'}
- QueryPipeline initialized successfully

### 2. Vector Search Results 🎯

**Total Retrieved**: ${searchResults.length} documents from vector store
**Total Context**: ${totalChars.toLocaleString()} characters

#### Document Sources Breakdown:
${searchResults.map((doc, index) => 
  `${index + 1}. **${doc.metadata.source || 'Unknown'}** (${doc.pageContent.length} chars) - ${doc.metadata.type || 'Unknown type'}`
).join('\n')}

#### Source Type Distribution:
- **GitHub Repository Code**: ${sourceTypes.githubCode} chunks (${Math.round(sourceTypes.githubCode/searchResults.length*100)}%)
- **Module Documentation**: ${sourceTypes.moduleDocs} chunks (${Math.round(sourceTypes.moduleDocs/searchResults.length*100)}%)  
- **Architecture Documentation**: ${sourceTypes.architectureDocs} chunks (${Math.round(sourceTypes.architectureDocs/searchResults.length*100)}%)
- **API Specification**: ${sourceTypes.apiSpec} chunks (${Math.round(sourceTypes.apiSpec/searchResults.length*100)}%)
- **Other Sources**: ${sourceTypes.other} chunks (${Math.round(sourceTypes.other/searchResults.length*100)}%)

## Retrieved Chunk Details 🔍

${searchResults.map((doc, index) => `
### Chunk ${index + 1}/${searchResults.length}
- **Source**: ${doc.metadata.source || 'Unknown'}
- **Type**: ${doc.metadata.type || 'Unknown'}
- **Size**: ${doc.pageContent.length} characters
- **Repository**: ${doc.metadata.repoUrl || doc.metadata.repository || 'N/A'}
- **Branch**: ${doc.metadata.branch || 'N/A'}

**Content Preview**:
\`\`\`
${doc.pageContent.substring(0, 200)}${doc.pageContent.length > 200 ? '...' : ''}
\`\`\`

**Full Content**:
\`\`\`
${doc.pageContent}
\`\`\`

---
`).join('')}

${aiResponse ? `## AI Response Analysis 🤖

### Generated Response:
**Status**: ${aiResponse ? '✅ Generated Successfully' : '❌ Not Available'}
**Response Length**: ${aiResponse?.content ? aiResponse.content.length : 0} characters
**Generated At**: ${new Date().toISOString()}

### Response Content:
\`\`\`markdown
${aiResponse?.content || 'Response not captured'}
\`\`\`

### Response Quality Assessment:
- **Relevance to Query**: ${this.assessResponseRelevance(prompt, aiResponse)}
- **Use of Context**: ${this.assessContextUsage(searchResults, aiResponse)}
- **Response Completeness**: ${this.assessResponseCompleteness(aiResponse)}

### Key Response Elements:
${this.extractResponseElements(aiResponse)}

---
` : ''}

## Performance Metrics 📈

### Search Efficiency:
- **Documents Retrieved**: ${searchResults.length}
- **Unique Sources**: ${uniqueSources.length}
- **Average Chunk Size**: ${Math.round(totalChars / searchResults.length)} characters
- **Query Processing**: Successful

### Context Quality:
- **Relevance Score**: ${searchResults.length > 0 ? 'HIGH' : 'LOW'} (${searchResults.length} relevant chunks found)
- **Diversity Score**: ${uniqueSources.length > 3 ? 'EXCELLENT' : uniqueSources.length > 1 ? 'GOOD' : 'LOW'} (${uniqueSources.length} unique sources)
- **Completeness Score**: ${totalChars > 3000 ? 'HIGH' : totalChars > 1000 ? 'MEDIUM' : 'LOW'} (${totalChars.toLocaleString()} total characters)

## Source Analysis 📊

### Most Frequent Sources:
${Object.entries(sources.reduce((acc, source) => {
  acc[source] = (acc[source] || 0) + 1;
  return acc;
}, {}))
.sort(([,a], [,b]) => b - a)
.slice(0, 5)
.map(([source, count]) => `- **${source}**: ${count} chunks`)
.join('\n')}

### Repository Coverage:
${[...new Set(searchResults
  .filter(doc => doc.metadata.repoUrl || doc.metadata.repository)
  .map(doc => doc.metadata.repoUrl || doc.metadata.repository))]
  .map(repo => `- ${repo}`)
  .join('\n') || '- No repository sources detected'}

## Query Classification 🏷️

- **Query Type**: ${this.classifyQueryType(prompt)}
- **Domain Focus**: ${this.extractDomainFocus(searchResults)}
- **Technical Complexity**: ${prompt.length > 50 ? 'High' : prompt.length > 20 ? 'Medium' : 'Low'}

## Recommendations 🚀

${this.generateRecommendations(searchResults, prompt)}

## Conclusion ✨

This trace demonstrates ${this.evaluateOverallPerformance(searchResults, totalChars)} RAG performance with:
- **Retrieval Quality**: ${searchResults.length > 5 ? 'Excellent' : searchResults.length > 2 ? 'Good' : 'Needs Improvement'}
- **Context Diversity**: ${uniqueSources.length > 3 ? 'High' : 'Medium'}
- **Content Richness**: ${totalChars > 5000 ? 'Very High' : totalChars > 2000 ? 'High' : 'Medium'}

The query was ${searchResults.length > 0 ? 'successfully processed' : 'not well matched'} with ${searchResults.length > 0 ? 'relevant' : 'limited'} context retrieved from the knowledge base.

---
**Analysis Generated**: ${new Date().toISOString()}  
**LangSmith Project**: ${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'}  
**Environment**: ${process.env.NODE_ENV || 'development'}
**Auto-Generated**: true
`;

    return content;
  }

  /**
   * Helper methods for trace analysis
   */
  classifyQueryType(prompt) {
    if (prompt.toLowerCase().includes('how') || prompt.toLowerCase().includes('what')) {
      return 'Informational/Explanatory';
    } else if (prompt.toLowerCase().includes('error') || prompt.toLowerCase().includes('issue')) {
      return 'Troubleshooting/Debug';
    } else if (prompt.toLowerCase().includes('implement') || prompt.toLowerCase().includes('create')) {
      return 'Implementation/Development';
    } else {
      return 'General/Conversational';
    }
  }

  extractDomainFocus(searchResults) {
    const sources = searchResults.map(doc => doc.metadata.source || '').join(' ').toLowerCase();
    
    if (sources.includes('business_modules')) return 'Business Logic';
    if (sources.includes('aop_modules')) return 'Cross-cutting Concerns';
    if (sources.includes('infrastructure')) return 'Infrastructure';
    if (sources.includes('api')) return 'API/Interface';
    if (sources.includes('architecture')) return 'System Architecture';
    
    return 'General Application';
  }

  generateRecommendations(searchResults, prompt) {
    const recommendations = [];
    
    if (searchResults.length === 0) {
      recommendations.push('- Consider expanding the query with more specific terms');
      recommendations.push('- Check if the relevant documentation is indexed');
    } else {
      if (searchResults.length < 3) {
        recommendations.push('- Query could benefit from more context documents');
      }
      
      const sourceTypes = new Set(searchResults.map(doc => doc.metadata.type));
      if (sourceTypes.size === 1) {
        recommendations.push('- Consider indexing more diverse document types');
      }
      
      if (searchResults.every(doc => !doc.metadata.repoId)) {
        recommendations.push('- Add more code repository context');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- RAG performance is optimal for this query type');
      recommendations.push('- Continue monitoring for consistency');
    }
    
    return recommendations.join('\n');
  }

  evaluateOverallPerformance(searchResults, totalChars) {
    if (searchResults.length >= 5 && totalChars > 3000) return 'excellent';
    if (searchResults.length >= 3 && totalChars > 1500) return 'good';
    if (searchResults.length >= 1 && totalChars > 500) return 'adequate';
    return 'needs improvement';
  }

  /**
   * Helper methods for AI response analysis
   */
  assessResponseRelevance(prompt, aiResponse) {
    if (!aiResponse?.content) return 'N/A - No response captured';
    
    const response = aiResponse.content.toLowerCase();
    const query = prompt.toLowerCase();
    
    // Check if response addresses key terms from query
    const queryWords = query.split(/\s+/).filter(word => word.length > 3);
    const relevantWords = queryWords.filter(word => response.includes(word));
    
    const relevanceRatio = relevantWords.length / Math.max(queryWords.length, 1);
    
    if (relevanceRatio > 0.7) return 'HIGH - Directly addresses query terms';
    if (relevanceRatio > 0.4) return 'MEDIUM - Partially addresses query';
    return 'LOW - Limited relevance to query terms';
  }

  assessContextUsage(searchResults, aiResponse) {
    if (!aiResponse?.content) return 'N/A - No response captured';
    
    const response = aiResponse.content.toLowerCase();
    
    // Check if response references source files or concepts from chunks
    const sourceFiles = searchResults.map(doc => 
      (doc.metadata.source || '').split('/').pop()?.replace(/\.(js|md|json)$/, '')
    ).filter(Boolean);
    
    const referencedSources = sourceFiles.filter(source => 
      source && response.includes(source.toLowerCase())
    );
    
    const usageRatio = referencedSources.length / Math.max(sourceFiles.length, 1);
    
    if (usageRatio > 0.5) return 'EXCELLENT - Explicitly references source files';
    if (usageRatio > 0.2) return 'GOOD - Some reference to retrieved context';
    if (response.includes('based on') || response.includes('according to')) return 'MEDIUM - Implicit context usage';
    return 'LOW - Limited use of retrieved context';
  }

  assessResponseCompleteness(aiResponse) {
    if (!aiResponse?.content) return 'N/A - No response captured';
    
    const content = aiResponse.content;
    const length = content.length;
    
    // Check for structured response elements
    const hasStructure = content.includes('1.') || content.includes('•') || content.includes('-');
    const hasExplanation = length > 200;
    const hasConclusion = content.toLowerCase().includes('summary') || 
                         content.toLowerCase().includes('conclusion') ||
                         content.toLowerCase().includes('in summary');
    
    if (hasStructure && hasExplanation && hasConclusion) return 'EXCELLENT - Well-structured and comprehensive';
    if (hasStructure && hasExplanation) return 'GOOD - Structured with adequate detail';
    if (hasExplanation) return 'MEDIUM - Adequate detail but could be better structured';
    if (length > 50) return 'BASIC - Brief but relevant';
    return 'POOR - Very short or incomplete';
  }

  extractResponseElements(aiResponse) {
    if (!aiResponse?.content) return '- No response elements to analyze';
    
    const content = aiResponse.content;
    const elements = [];
    
    // Check for code blocks
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    if (codeBlocks > 0) elements.push(`- **Code Examples**: ${codeBlocks} code blocks included`);
    
    // Check for numbered lists
    const numberedLists = (content.match(/\d+\./g) || []).length;
    if (numberedLists > 0) elements.push(`- **Structured Lists**: ${numberedLists} numbered points`);
    
    // Check for bullet points
    const bulletPoints = (content.match(/^[\s]*[-•*]/gm) || []).length;
    if (bulletPoints > 0) elements.push(`- **Bullet Points**: ${bulletPoints} bullet items`);
    
    // Check for file references
    const fileRefs = (content.match(/\w+\.(js|md|json|ts|py)/g) || []).length;
    if (fileRefs > 0) elements.push(`- **File References**: ${fileRefs} specific files mentioned`);
    
    // Check for technical terms
    const techTerms = (content.match(/\b(function|class|module|component|API|method|property)\b/gi) || []).length;
    if (techTerms > 0) elements.push(`- **Technical Terms**: ${techTerms} technical concepts used`);
    
    return elements.length > 0 ? elements.join('\n') : '- No specific structural elements detected';
  }

  /**
   * Helper methods for trace data capture
   */
  captureChunkData(results) {
    return results.map((doc, index) => ({
      index: index + 1,
      source: doc.metadata.source || 'Unknown',
      type: doc.metadata.type || 'Unknown',
      score: doc.metadata.score || 'N/A',
      size: doc.pageContent.length,
      content: doc.pageContent,
      metadata: doc.metadata
    }));
  }

  logChunkDetails(results) {
    results.forEach((doc, index) => {
      console.log(`[${new Date().toISOString()}] 📄 CHUNK ${index + 1}/${results.length}:`);
      console.log(`[${new Date().toISOString()}] 🏷️  Source: ${doc.metadata.source || 'Unknown'}`);
      console.log(`[${new Date().toISOString()}] 🏷️  Type: ${doc.metadata.type || 'Unknown'}`);
      console.log(`[${new Date().toISOString()}] 🏷️  Score: ${doc.metadata.score || 'N/A'}`);
      
      // Log ALL metadata tags for debugging
      console.log(`[${new Date().toISOString()}] 🔖 All Metadata Tags:`);
      console.log(JSON.stringify(doc.metadata, null, 2));
      
      console.log(`[${new Date().toISOString()}] 📝 Content: ${doc.pageContent}`);
      console.log(`[${new Date().toISOString()}] ──────────────────────────────────────────────────────────────────────────────────`);
    });
  }

  /**
   * Write all chunks with their metadata to a markdown file for debugging
   * @param {Array} vectorResults - Results from vector search
   * @param {Array} textResults - Results from text search
   * @param {string} query - The original query
   */
  async writeChunksToMarkdown(vectorResults, textResults, query) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `chunk_log_${timestamp}.md`;
    const logDir = path.join(process.cwd(), 'logs', 'chunks');
    
    // Ensure directory exists
    await fs.mkdir(logDir, { recursive: true });
    
    const filePath = path.join(logDir, filename);
    
    let content = `# RAG Chunk Retrieval Log\n\n`;
    content += `**Query:** ${query}\n\n`;
    content += `**Timestamp:** ${new Date().toISOString()}\n\n`;
    content += `**Vector Results:** ${vectorResults.length} chunks\n\n`;
    content += `**Text Search Results:** ${textResults.length} chunks\n\n`;
    content += `---\n\n`;
    
    // Log vector search results
    if (vectorResults.length > 0) {
      content += `## 🔍 Vector Search Results (${vectorResults.length} chunks)\n\n`;
      
      vectorResults.forEach((doc, index) => {
        content += `### Chunk ${index + 1}/${vectorResults.length}\n\n`;
        content += `#### 🏷️ Metadata Tags\n\n`;
        content += `\`\`\`json\n${JSON.stringify(doc.metadata, null, 2)}\n\`\`\`\n\n`;
        content += `#### 📝 Content\n\n`;
        content += `\`\`\`\n${doc.pageContent}\n\`\`\`\n\n`;
        content += `---\n\n`;
      });
    }
    
    // Log text search results
    if (textResults.length > 0) {
      content += `## 📄 Text Search Results (${textResults.length} chunks)\n\n`;
      
      textResults.forEach((doc, index) => {
        content += `### Chunk ${index + 1}/${textResults.length}\n\n`;
        content += `#### 🏷️ Metadata Tags\n\n`;
        content += `\`\`\`json\n${JSON.stringify(doc.metadata, null, 2)}\n\`\`\`\n\n`;
        content += `#### 📝 Content\n\n`;
        content += `\`\`\`\n${doc.pageContent}\n\`\`\`\n\n`;
        content += `---\n\n`;
      });
    }
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`[${new Date().toISOString()}] 📝 Chunk log written to: ${filePath}`);
    
    return filePath;
  }

  /**
   * Generate comprehensive trace analysis including LangSmith trace data
   */
  generateComprehensiveTraceAnalysis(prompt, searchResults, traceData, aiResponse = null) {
    const totalChars = searchResults.reduce((sum, doc) => sum + doc.pageContent.length, 0);
    const sources = searchResults.map(doc => doc.metadata.source || 'Unknown');
    const uniqueSources = [...new Set(sources)];
    
    // Categorize source types
    const sourceTypes = {
      githubCode: searchResults.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length,
      moduleDocs: searchResults.filter(doc => doc.metadata.type === 'module_documentation').length,
      architectureDocs: searchResults.filter(doc => doc.metadata.type === 'architecture_documentation').length,
      apiSpec: searchResults.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
      other: searchResults.filter(doc => 
        !doc.metadata.repoId && 
        !doc.metadata.githubOwner && 
        !['module_documentation', 'architecture_documentation', 'apiSpec', 'apiSpecFull'].includes(doc.metadata.type)
      ).length
    };

    const content = `# LangSmith RAG Trace Analysis - ${new Date(traceData.startTime).toLocaleString()}

## 🔍 Query Details
- **Query**: "${prompt}"
- **User ID**: ${traceData.userId || 'Unknown'}
- **Conversation ID**: ${traceData.conversationId || 'Unknown'}
- **Started**: ${traceData.startTime}
- **Completed**: ${traceData.endTime || 'In Progress'}
- **Total Duration**: ${traceData.totalDuration ? `${traceData.totalDuration}ms` : 'Calculating...'}

## 🔗 LangSmith Trace Information
- **Project**: ${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'}
- **Tracing Enabled**: ${process.env.LANGSMITH_TRACING === 'true' ? 'Yes' : 'No'}
- **Trace ID**: ${traceData.traceId || 'Not captured'}
- **Run ID**: ${traceData.runId || 'Not captured'}
- **Environment**: ${process.env.NODE_ENV || 'development'}

### Pipeline Execution Steps:
${traceData.steps.map((step, index) => 
  `${index + 1}. **${step.step}** (${step.timestamp}) - ${step.status}${step.message ? `: ${step.message}` : ''}${step.documentsFound ? ` - Found ${step.documentsFound} documents` : ''}${step.contextSize ? ` - Context: ${step.contextSize} chars` : ''}${step.responseLength ? ` - Response: ${step.responseLength} chars` : ''}`
).join('\n')}

## 📊 Vector Search Analysis

### Search Configuration:
- **Vector Store**: ${traceData.vectorStore || 'Unknown'}
- **Search Strategy**: ${traceData.searchStrategy || 'Unknown'}
- **Documents Retrieved**: ${searchResults.length}
- **Total Context**: ${totalChars.toLocaleString()} characters

### Source Type Distribution:
- **GitHub Repository Code**: ${sourceTypes.githubCode} chunks (${Math.round(sourceTypes.githubCode/searchResults.length*100)}%)
- **Module Documentation**: ${sourceTypes.moduleDocs} chunks (${Math.round(sourceTypes.moduleDocs/searchResults.length*100)}%)  
- **Architecture Documentation**: ${sourceTypes.architectureDocs} chunks (${Math.round(sourceTypes.architectureDocs/searchResults.length*100)}%)
- **API Specification**: ${sourceTypes.apiSpec} chunks (${Math.round(sourceTypes.apiSpec/searchResults.length*100)}%)
- **Other Sources**: ${sourceTypes.other} chunks (${Math.round(sourceTypes.other/searchResults.length*100)}%)

## 📋 Complete Chunk Analysis

${traceData.chunks ? traceData.chunks.map(chunk => `
### Chunk ${chunk.index}/${traceData.chunks.length}
- **Source**: ${chunk.source}
- **Type**: ${chunk.type}
- **Size**: ${chunk.size} characters
- **Score**: ${chunk.score}
- **Repository**: ${chunk.metadata.repoUrl || chunk.metadata.repository || 'N/A'}
- **Branch**: ${chunk.metadata.branch || 'N/A'}
- **File Type**: ${chunk.metadata.fileType || 'N/A'}
- **Processed At**: ${chunk.metadata.processedAt || 'N/A'}

**Full Content**:
\`\`\`
${chunk.content}
\`\`\`

**Metadata**:
\`\`\`json
${JSON.stringify(chunk.metadata, null, 2)}
\`\`\`

---
`).join('') : 'Chunk data not captured'}

${aiResponse ? `## 🤖 AI Response Analysis

### Generated Response:
**Status**: ✅ Generated Successfully
**Response Length**: ${aiResponse.content ? aiResponse.content.length : 0} characters
**Generated At**: ${new Date().toISOString()}

### Response Content:
\`\`\`markdown
${aiResponse.content || 'Response not captured'}
\`\`\`

### Response Quality Assessment:
- **Relevance to Query**: ${this.assessResponseRelevance(prompt, aiResponse)}
- **Use of Context**: ${this.assessContextUsage(searchResults, aiResponse)}
- **Response Completeness**: ${this.assessResponseCompleteness(aiResponse)}

### Key Response Elements:
${this.extractResponseElements(aiResponse)}

---
` : ''}

## 📈 Performance Metrics

### Search Efficiency:
- **Query Processing Time**: ${traceData.totalDuration ? `${traceData.totalDuration}ms` : 'In Progress'}
- **Documents Retrieved**: ${searchResults.length}
- **Unique Sources**: ${uniqueSources.length}
- **Average Chunk Size**: ${Math.round(totalChars / searchResults.length)} characters

### Context Quality:
- **Relevance Score**: ${searchResults.length > 0 ? 'HIGH' : 'LOW'} (${searchResults.length} relevant chunks found)
- **Diversity Score**: ${uniqueSources.length > 3 ? 'EXCELLENT' : uniqueSources.length > 1 ? 'GOOD' : 'LOW'} (${uniqueSources.length} unique sources)
- **Completeness Score**: ${totalChars > 3000 ? 'HIGH' : totalChars > 1000 ? 'MEDIUM' : 'LOW'} (${totalChars.toLocaleString()} total characters)

### LangSmith Integration:
- **Tracing Status**: ${process.env.LANGSMITH_TRACING === 'true' ? '✅ Active' : '❌ Disabled'}
- **Project Configuration**: ${process.env.LANGCHAIN_PROJECT ? '✅ Configured' : '❌ Missing'}
- **API Key Status**: ${process.env.LANGSMITH_API_KEY ? '✅ Present' : '❌ Missing'}

## 🔍 Source Analysis

### Most Frequent Sources:
${Object.entries(sources.reduce((acc, source) => {
  acc[source] = (acc[source] || 0) + 1;
  return acc;
}, {}))
.sort(([,a], [,b]) => b - a)
.slice(0, 5)
.map(([source, count]) => `- **${source}**: ${count} chunks`)
.join('\n')}

### Repository Coverage:
${[...new Set(searchResults
  .filter(doc => doc.metadata.repoUrl || doc.metadata.repository)
  .map(doc => doc.metadata.repoUrl || doc.metadata.repository))]
  .map(repo => `- ${repo}`)
  .join('\n') || '- No repository sources detected'}

## 🎯 Query Classification & Analysis

- **Query Type**: ${this.classifyQueryType(prompt)}
- **Domain Focus**: ${this.extractDomainFocus(searchResults)}
- **Technical Complexity**: ${prompt.length > 50 ? 'High' : prompt.length > 20 ? 'Medium' : 'Low'}
- **Expected Response Type**: ${this.predictResponseType(prompt)}

## 🚀 Recommendations

${this.generateComprehensiveRecommendations(searchResults, prompt, traceData, aiResponse)}

## ✨ Conclusion

This comprehensive LangSmith trace demonstrates ${this.evaluateOverallPerformance(searchResults, totalChars)} RAG performance with:
- **Retrieval Quality**: ${searchResults.length > 5 ? 'Excellent' : searchResults.length > 2 ? 'Good' : 'Needs Improvement'}
- **Context Diversity**: ${uniqueSources.length > 3 ? 'High' : 'Medium'}
- **Content Richness**: ${totalChars > 5000 ? 'Very High' : totalChars > 2000 ? 'High' : 'Medium'}
- **Response Quality**: ${aiResponse ? (aiResponse.content?.length > 500 ? 'Comprehensive' : 'Adequate') : 'Not Captured'}

The query was ${searchResults.length > 0 ? 'successfully processed' : 'not well matched'} with comprehensive LangSmith tracing capturing the complete RAG pipeline execution.

---
**Generated**: ${new Date().toISOString()}  
**LangSmith Project**: ${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'}  
**Trace Type**: Comprehensive RAG Analysis
**Auto-Generated**: true
`;

    return content;
  }

  predictResponseType(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('how') || p.includes('explain')) return 'Explanatory';
    if (p.includes('what') || p.includes('define')) return 'Informational';
    if (p.includes('compare') || p.includes('difference')) return 'Comparative';
    if (p.includes('example') || p.includes('show')) return 'Demonstrative';
    return 'General';
  }

  generateComprehensiveRecommendations(searchResults, prompt, traceData, aiResponse) {
    const recommendations = [];
    
    // LangSmith specific recommendations
    if (process.env.LANGSMITH_TRACING !== 'true') {
      recommendations.push('- **Enable LangSmith Tracing**: Set LANGSMITH_TRACING=true for better observability');
    }
    
    if (!process.env.LANGSMITH_API_KEY) {
      recommendations.push('- **Configure LangSmith API**: Add LANGSMITH_API_KEY for full trace capture');
    }
    
    // Performance recommendations
    if (traceData.totalDuration > 5000) {
      recommendations.push('- **Optimize Query Performance**: Query took over 5 seconds, consider caching or index optimization');
    }
    
    // Content recommendations
    if (searchResults.length === 0) {
      recommendations.push('- **Expand Vector Index**: No documents found, consider indexing more content');
    } else if (searchResults.length < 3) {
      recommendations.push('- **Improve Retrieval**: Low document count, consider adjusting similarity thresholds');
    }
    
    // Response quality recommendations
    if (aiResponse && aiResponse.content?.length < 100) {
      recommendations.push('- **Enhance Response Generation**: Response seems brief, consider adjusting prompt templates');
    }
    
    // Source diversity recommendations
    const uniqueSources = [...new Set(searchResults.map(doc => doc.metadata.source))];
    if (uniqueSources.length === 1) {
      recommendations.push('- **Increase Source Diversity**: All chunks from same source, consider broader indexing');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- **Excellent Performance**: RAG pipeline is performing optimally');
      recommendations.push('- **Continue Monitoring**: Maintain current configuration and observe trends');
    }
    
    return recommendations.join('\n');
  }

  /**
   * Filter content types to prevent catalog dominance
   * CRITICAL: Prevents JSON catalogs from dominating search results
   */
  filterContentTypes(results, query = '') {
    const queryType = this.detectQueryType(query);
    const excludeCatalogs = true; // Always exclude catalogs
    const preferCode = queryType !== 'documentation';
    
    let filtered = results;
    
    if (excludeCatalogs) {
      // Filter out catalog files by type first, then fallback to content analysis
      const beforeCount = filtered.length;
      filtered = filtered.filter(result => {
        const type = result.metadata?.type;
        const content = result.pageContent || '';
        const source = result.metadata?.source || '';
        
        // Exclude catalog files by type
        if (type === 'github-catalog') {
          console.log(`[${new Date().toISOString()}] 🧹 FILTERED OUT: Catalog file by type ${source}`);
          return false;
        }
        
        // Legacy filtering for files that haven't been re-indexed yet
        if (source.includes('architecture.json') || 
            source.includes('ul_dictionary.json') ||
            source.includes('catalog.json') ||
            source.includes('schema.json')) {
          console.log(`[${new Date().toISOString()}] 🧹 FILTERED OUT: Legacy catalog detection ${source}`);
          return false;
        }
        
        // Exclude large JSON objects that are clearly catalogs
        if (content.trim().startsWith('{') && content.includes('"$schema"') && content.length > 2000) {
          return false;
        }
        
        // Exclude content that's mostly JSON structure (catalogs)
        const jsonStructureRatio = (content.match(/[{}\[\]:,]/g) || []).length / content.length;
        if (jsonStructureRatio > 0.1 && content.includes('"description"') && content.includes('"attributes"')) {
          return false;
        }
        
        return true;
      });
      
      const catalogsRemoved = beforeCount - filtered.length;
      if (catalogsRemoved > 0) {
        console.log(`[${new Date().toISOString()}] 🚫 PIPELINE_CATALOG_FILTER: Removed ${catalogsRemoved} catalogs (${catalogsRemoved} by type, rest by content)`);
      }
    }
    
    if (preferCode && queryType !== 'documentation') {
      // Boost actual code files over pure documentation
      filtered = filtered.sort((a, b) => {
        const aIsCode = this.isActualCode(a.pageContent, a.metadata);
        const bIsCode = this.isActualCode(b.pageContent, b.metadata);
        
        if (aIsCode && !bIsCode) return -1; // a (code) comes first
        if (!aIsCode && bIsCode) return 1;  // b (code) comes first
        
        // Both same type, keep original order
        return 0;
      });
    }
    
    return filtered;
  }

  /**
   * Detect query type for intelligent filtering
   */
  detectQueryType(query = '') {
    const lower = query.toLowerCase();
    
    // Architecture/design questions
    if (lower.includes('architecture') || lower.includes('design') || lower.includes('pattern') || 
        lower.includes('communicate') || lower.includes('interact') || lower.includes('modular')) {
      return 'architecture';
    }
    
    // Code implementation questions
    if (lower.includes('implementation') || lower.includes('code') || lower.includes('function') ||
        lower.includes('method') || lower.includes('class') || lower.includes('how does') || 
        lower.includes('show me')) {
      return 'code';
    }
    
    // Documentation questions
    if (lower.includes('documentation') || lower.includes('docs') || lower.includes('readme') ||
        lower.includes('explain') || lower.includes('what is')) {
      return 'documentation';
    }
    
    return 'general';
  }

  /**
   * Detect actual code vs documentation/catalogs
   */
  isActualCode(content, metadata = {}) {
    // Check file extension
    const source = metadata.source || '';
    if (source.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|go|rs|php)$/)) {
      return true;
    }
    
    // Check for code patterns
    const codeIndicators = [
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /require\(/,
      /module\.exports/,
      /export\s+(default\s+)?/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /if\s*\(/,
      /for\s*\(/,
      /while\s*\(/,
      /async\s+function/,
      /=>\s*{/,
      /constructor\s*\(/,  // Added constructor detection
      /\.\s*\w+\s*\(/      // Added method call detection
    ];
    
    const codeMatches = codeIndicators.filter(pattern => pattern.test(content)).length;
    
    // If multiple code patterns found, likely actual code (lowered threshold for class detection)
    return codeMatches >= 1;
  }
}

module.exports = QueryPipeline;
