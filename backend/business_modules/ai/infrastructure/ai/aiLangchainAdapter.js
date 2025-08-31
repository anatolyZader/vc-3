// aiLangchainAdapter.js
"use strict";
/* eslint-disable no-unused-vars */

const IAIPort = require('../../domain/ports/IAIPort');
const Bottleneck = require("bottleneck");
const { GithubRepoLoader } = require("@langchain/community/document_loaders/web/github");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { MarkdownHeaderTextSplitter } = require("@langchain/textsplitters");
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

// Import the new prompt system
const { SystemPrompts, PromptSelector } = require('./prompts/systemPrompts');
const PromptConfig = require('./prompts/promptConfig');

// Import extracted utility functions
const AIUtils = require('./utils/AIUtils');
const RequestQueue = require('./utils/RequestQueue');
const VectorSearchStrategy = require('./strategies/VectorSearchStrategy');
const LLMProviderManager = require('./providers/LLMProviderManager');
const CoreDocsIndexer = require('./indexers/CoreDocsIndexer');

// Import the DataPreparationPipeline for handling repository processing
const DataPreparationPipeline = require('./rag_pipelines/DataPreparationPipeline');

class AILangchainAdapter extends IAIPort {
  constructor(options = {}) {
    super();

    // Make userId null by default to avoid DI error
    this.userId = null;
    console.log(`[${new Date().toISOString()}] [DEBUG] Constructor called with options:`, JSON.stringify(options));

    // Get provider from infraConfig or options
    this.aiProvider = options.aiProvider || 'openai';
    console.log(`[${new Date().toISOString()}] AILangchainAdapter initializing with provider: ${this.aiProvider}`);
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
      maxRequestsPerMinute: options.maxRequestsPerMinute || 60,
      retryDelay: options.retryDelay || 5000,
      maxRetries: options.maxRetries || 10
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
      console.log(`[${new Date().toISOString()}] [DEBUG] DataPreparationPipeline initialized with ubiquitous language support.`);

      // Initialize CoreDocsIndexer for API specs and markdown documentation
      this.coreDocsIndexer = new CoreDocsIndexer(
        this.embeddings,
        this.pinecone,
        this.dataPreparationPipeline
      );
      console.log(`[${new Date().toISOString()}] [DEBUG] CoreDocsIndexer initialized for API and markdown documentation.`);

      console.log(`[${new Date().toISOString()}] AILangchainAdapter initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing AILangchainAdapter:`, error.message);
      console.log(`[${new Date().toISOString()}] [DEBUG] Initialization error stack:`, error.stack);
      // We'll continue with degraded functionality and try to recover later
    }
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

  /**
   * Index core documentation to Pinecone (API specs and markdown files)
   * @param {string} namespace - Pinecone namespace (defaults to 'core-docs')
   * @param {boolean} clearFirst - Whether to clear existing core docs first
   */
  async indexCoreDocsToPinecone(namespace = 'core-docs', clearFirst = false) {
    return await this.coreDocsIndexer.indexCoreDocsToPinecone(namespace, clearFirst);
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
      // Delegate to DataPreparationPipeline which handles:
      // 1. Ubiquitous language enhancement (Step 1)
      // 2. Semantic preprocessing (Step 2) 
      // 3. AST-based chunking (Step 3)
      // 4. Vector storage in Pinecone
      console.log(`[${new Date().toISOString()}] � RAG REPO: Delegating to DataPreparationPipeline with ubiquitous language support`);
      
      const result = await this.dataPreparationPipeline.processPushedRepo(userId, repoId, repoData);
      
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

  // 2. Retrieval and generation:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  // The actual RAG chain, which takes the user query at run time and retrieves the relevant data from the index, then passes it to the model

  // RAG Query Phase: Retrieval and Generation only (data preparation is done in processPushedRepo/initializeCoreDocumentation)
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

    console.log(`[${new Date().toISOString()}] Processing AI request for conversation ${conversationId}`);

    // Use the queue system for all AI operations
    return this.requestQueue.queueRequest(async () => {
      try {
        // Load API spec and format summary
        const apiSpec = await this.coreDocsIndexer.loadApiSpec('httpApiSpec.json');
        const apiSpecSummary = AIUtils.formatApiSpecSummary(apiSpec);
        
        // Build context: code chunks + API spec summary
        let contextIntro = '';
        if (typeof apiSpecSummary === 'string') contextIntro += apiSpecSummary + '\n\n';

        // If no vectorStore or pinecone client, fall back to standard mode
        if (!this.vectorStore || !this.pinecone) {
          console.warn(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Vector database not available, falling back to standard model response.`);
          
          // Use our standardized emitRagStatus method instead
          this.emitRagStatus('retrieval_disabled', {
            userId: this.userId,
            conversationId: conversationId,
            reason: 'Vector database not available'
          });
          console.log(`[${new Date().toISOString()}] [DEBUG] respondToPrompt called with userId=${userId}, conversationId=${conversationId}, prompt=${prompt}`);
          
          return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
        }

        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Searching vector database for relevant code chunks for user ${this.userId}...`);
        const pineconeIndex = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
        const vectorStoreNamespace = this.userId;
        
        // Store these for later use
        this.pineconeIndex = pineconeIndex;
    console.log(`[${new Date().toISOString()}] [DEBUG] userId confirmed in respondToPrompt: ${this.userId}`);
        this.vectorStoreNamespace = vectorStoreNamespace;
        
    console.log(`[${new Date().toISOString()}] [DEBUG] queueRequest will be called for respondToPrompt.`);
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Vector store namespace: ${vectorStoreNamespace}`);
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Pinecone index name: ${pineconeIndex}`);

        // Attempt retrieval with queue-based approach
        let similarDocuments = [];
        
        // Check if vectorStore is available before attempting search
        if (!this.vectorStore) {
          console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Vector store not available, falling back to standard response`);
          this.emitRagStatus('retrieval_disabled', {
            userId: this.userId,
            conversationId: conversationId,
            reason: 'Vector store not initialized'
          });
          return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
        }
        
        try {
          // Find relevant documents from vector database with timeout
          console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Running intelligent similarity search with semantic filtering`);
          
          // Determine search strategy based on prompt analysis
          const searchStrategy = VectorSearchStrategy.determineSearchStrategy(prompt);
          console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: User=${searchStrategy.userResults} docs, Core=${searchStrategy.coreResults} docs`);
          console.log(`[${new Date().toISOString()}] 🧠 SEARCH FILTERS: User=${JSON.stringify(searchStrategy.userFilters)}, Core=${JSON.stringify(searchStrategy.coreFilters)}`);
          
          // Add timeout to prevent hanging - increased timeout and fallback strategy
          const VECTOR_SEARCH_TIMEOUT = 30000; // 30 seconds (increased from 10)
          
          // Search user-specific namespace with intelligent filtering (resilient to filter errors)
          const userSearchPromise = (async () => {
            try {
              if (searchStrategy.userFilters && Object.keys(searchStrategy.userFilters).length > 0) {
                console.log(`[${new Date().toISOString()}] 🔍 USER SEARCH: Attempting filtered search with:`, JSON.stringify(searchStrategy.userFilters));
                return await this.vectorStore.similaritySearch(
                  prompt, 
                  searchStrategy.userResults,
                  { filter: searchStrategy.userFilters }
                );
              } else {
                return await this.vectorStore.similaritySearch(prompt, searchStrategy.userResults);
              }
            } catch (filterError) {
              console.log(`[${new Date().toISOString()}] ⚠️ User search filter error (${filterError.message}), retrying without filters`);
              return await this.vectorStore.similaritySearch(prompt, searchStrategy.userResults);
            }
          })();

          // Search global 'core-docs' namespace with intelligent filtering
          const coreDocsVectorStore = new PineconeStore(this.embeddings, {
              pineconeIndex: this.pinecone.Index(pineconeIndex),
              namespace: 'core-docs'
          });
          
          // Create resilient search promise that handles filter errors
          const coreDocsSearchPromise = (async () => {
            try {
              if (searchStrategy.coreFilters && Object.keys(searchStrategy.coreFilters).length > 0) {
                console.log(`[${new Date().toISOString()}] 🔍 CORE DOCS: Attempting filtered search with:`, JSON.stringify(searchStrategy.coreFilters));
                return await coreDocsVectorStore.similaritySearch(
                  prompt, 
                  searchStrategy.coreResults,
                  { filter: searchStrategy.coreFilters }
                );
              } else {
                return await coreDocsVectorStore.similaritySearch(prompt, searchStrategy.coreResults);
              }
            } catch (filterError) {
              console.log(`[${new Date().toISOString()}] ⚠️ Core docs filter error (${filterError.message}), retrying without filters`);
              return await coreDocsVectorStore.similaritySearch(prompt, searchStrategy.coreResults);
            }
          })();
          
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Vector search timeout')), VECTOR_SEARCH_TIMEOUT);
          });
          
          try {
            // Retrieve more chunks for richer context
            const [userDocs, coreDocs] = await Promise.race([
                Promise.all([userSearchPromise, coreDocsSearchPromise]),
                timeoutPromise
            ]);
            similarDocuments = [...userDocs, ...coreDocs];

          } catch (timeoutError) {
            console.log(`[${new Date().toISOString()}] ⚠️ Vector search timed out, falling back to standard response`);
            this.emitRagStatus('retrieval_timeout_fallback', {
              userId: this.userId,
              conversationId: conversationId,
              error: timeoutError.message,
              query: prompt.substring(0, 100)
            });
            return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
          }
          
          // Log the firstt few chunks for debugging
          similarDocuments.forEach((doc, i) => {
            console.log(`[DEBUG] Chunk ${i}: ${doc.metadata.source || 'Unknown'} | ${doc.pageContent.substring(0, 200)}`);
          });
          console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Retrieved ${similarDocuments.length} documents from vector store`);
          
          console.log(`[${new Date().toISOString()}] [DEBUG] Emitted retrieval_disabled status.`);
          if (similarDocuments.length > 0) {
            console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: First document metadata:`, 
              JSON.stringify(similarDocuments[0].metadata, null, 2));
            console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: First document content preview: ${similarDocuments[0].pageContent.substring(0, 100)}...`);
            
            // Log all document sources for better debugging
        console.log(`[${new Date().toISOString()}] [DEBUG] Pinecone index: ${pineconeIndex}, VectorStore namespace: ${vectorStoreNamespace}`);
            console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: All retrieved document sources:`);
            similarDocuments.forEach((doc, index) => {
              console.log(`[${new Date().toISOString()}]   ${index + 1}. ${doc.metadata.source || 'Unknown'} (${doc.pageContent.length} chars)`);
            });
        console.log(`[${new Date().toISOString()}] [DEBUG] Set pineconeIndex and vectorStoreNamespace properties.`);
            
            // Use our standardized emitRagStatus method
            this.emitRagStatus('retrieval_success', {
              userId: this.userId,
              conversationId: conversationId,
              documentsFound: similarDocuments.length,
              sources: similarDocuments.map(doc => doc.metadata.source || 'Unknown'),
              sourceTypes: {
                apiSpec: similarDocuments.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
                githubCode: similarDocuments.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
              },
              firstDocContentPreview: similarDocuments[0].pageContent.substring(0, 100) + '...'
            });
            console.log(`[${new Date().toISOString()}] [DEBUG] similaritySearch called with user: ${userId}, prompt: ${prompt}`);
          }
          console.log(`[${new Date().toISOString()}] [DEBUG] similaritySearch returned ${similarDocuments.length} documents.`);
        } catch (error) {
          // For errors, log and continue with standard response
          console.error(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Vector search error:`, error.message);
          
            console.log(`[${new Date().toISOString()}] [DEBUG] Logging all retrieved document sources:`);
          // Use our standardized emitRagStatus method
          this.emitRagStatus('retrieval_error', {
            userId: this.userId,
            conversationId: conversationId,
            error: error.message,
            query: prompt.substring(0, 100) // Include a preview of the query that failed
          });
          console.log(`[${new Date().toISOString()}] [DEBUG] Emitted retrieval_error status.`);
          
          console.log(`[${new Date().toISOString()}] [DEBUG] similaritySearch error stack:`, error.stack);
          return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
        }

        if (similarDocuments.length === 0) {
          console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: No relevant documents found, using standard response`);
          
          // Use our standardized emitRagStatus method
          console.log(`[${new Date().toISOString()}] [DEBUG] Emitted retrieval_error status.`);
          this.emitRagStatus('retrieval_no_results', {
            userId: this.userId,
            conversationId: conversationId,
            query: prompt.substring(0, 100) // Include a preview of the query
          });
          console.log(`[${new Date().toISOString()}] [DEBUG] No relevant documents found in similaritySearch.`);
          
          return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
        }

        // Process the retrieved documents
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Found ${similarDocuments.length} relevant documents`);

        // Note: API spec and markdown docs are now pre-indexed in core-docs namespace
        // and retrieved via similarity search above, no need to load them again here

        // Log comprehensive source loading summary
        console.log(`[${new Date().toISOString()}] 📚 MULTI-SOURCE RAG CONTEXT FROM VECTOR SEARCH:`);
        console.log(`[${new Date().toISOString()}] 🎯 TOTAL CONTEXT: ${similarDocuments.length} chunks retrieved from vector database ready for AI processing`);

        // Format the context from retrieved documents (includes pre-indexed API spec, markdown docs, and repo code)
        console.log(`[${new Date().toISOString()}] [DEBUG] Formatting context from retrieved documents.`);
        
        // Analyze and log source composition
        const sourceAnalysis = {
          apiSpec: 0,
          rootDocumentation: 0,
          moduleDocumentation: 0,
          githubRepo: 0,
          total: similarDocuments.length
        };
        
        similarDocuments.forEach(doc => {
          const type = doc.metadata.type || 'unknown';
          if (type === 'apiSpec' || type === 'apiSpecFull') sourceAnalysis.apiSpec++;
          else if (type === 'root_documentation') sourceAnalysis.rootDocumentation++;
          else if (type === 'module_documentation') sourceAnalysis.moduleDocumentation++;
          else if (doc.metadata.repoId || doc.metadata.githubOwner) sourceAnalysis.githubRepo++;
        });
        
        console.log(`[${new Date().toISOString()}] 🔍 RAG SOURCES ANALYSIS: Chat answer will use comprehensive context from multiple sources:`);
        console.log(`[${new Date().toISOString()}] 🌐 API Specification: ${sourceAnalysis.apiSpec} chunks`);
        console.log(`[${new Date().toISOString()}] 📋 Root Documentation (plugins/core): ${sourceAnalysis.rootDocumentation} chunks`);
        console.log(`[${new Date().toISOString()}] 📁 Module Documentation: ${sourceAnalysis.moduleDocumentation} chunks`);
        console.log(`[${new Date().toISOString()}] 💻 GitHub Repository Code: ${sourceAnalysis.githubRepo} chunks`);
        console.log(`[${new Date().toISOString()}] 📊 TOTAL CONTEXT SOURCES: ${sourceAnalysis.total} chunks from ${Object.values(sourceAnalysis).filter(v => v > 0).length - 1} different source types`);
        
        // Log specific module documentation being used
        const moduleDocsUsed = similarDocuments
          .filter(doc => doc.metadata.type === 'module_documentation')
          .map(doc => doc.metadata.module)
          .filter((module, index, arr) => arr.indexOf(module) === index);
        
        if (moduleDocsUsed.length > 0) {
          console.log(`[${new Date().toISOString()}] 📁 Module docs included: ${moduleDocsUsed.join(', ')}`);
        }
        
        // Log GitHub repositories being used
        const reposUsed = similarDocuments
          .filter(doc => doc.metadata.repoId)
          .map(doc => `${doc.metadata.githubOwner}/${doc.metadata.repoId}`)
          .filter((repo, index, arr) => arr.indexOf(repo) === index);
        
        if (reposUsed.length > 0) {
          console.log(`[${new Date().toISOString()}] 💻 GitHub repos referenced: ${reposUsed.join(', ')}`);
        }
        
        const context = similarDocuments.map((doc, index) => {
          const source = doc.metadata.source || 'Unknown source';
          const type = doc.metadata.type || 'unknown';
          
          // Add section headers for different types of documentation
          let sectionHeader = '';
          if (type === 'apiSpec' || type === 'apiSpecFull') {
            sectionHeader = '=== API SPECIFICATION ===\n';
          } else if (type === 'root_documentation') {
            sectionHeader = '=== ROOT DOCUMENTATION (Plugins & Core Files) ===\n';
          } else if (type === 'module_documentation') {
            sectionHeader = `=== ${doc.metadata.module?.toUpperCase() || 'MODULE'} DOCUMENTATION ===\n`;
          } else if (doc.metadata.repoId) {
            sectionHeader = `=== CODE REPOSITORY (${source}) ===\n`;
          }
          
          // Limit content length but provide more for documentation files
          const maxLength = type.includes('documentation') ? 1000 : 500;
          const content = doc.pageContent.length > maxLength 
            ? doc.pageContent.substring(0, maxLength) + '...' 
            : doc.pageContent;
            
          return `${sectionHeader}File: ${source}\n${content}`;
        }).join('\n\n');
        
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Created context with ${context.length} characters from ${similarDocuments.length} documents`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Context formatted. Length: ${context.length}`);
        
        // Format passed conversation history for context continuity
        const historyMessages = AIUtils.formatConversationHistory(conversationHistory);
        
        // Analyze context sources for intelligent prompt selection
        const contextSources = {
          apiSpec: sourceAnalysis.apiSpec > 0,
          rootDocumentation: sourceAnalysis.rootDocumentation > 0,
          moduleDocumentation: sourceAnalysis.moduleDocumentation > 0,
          code: sourceAnalysis.githubRepo > 0
        };

        // Select appropriate system prompt based on context and question
        const systemPrompt = PromptSelector.selectPrompt({
          hasRagContext: similarDocuments.length > 0,
          conversationCount: conversationHistory.length,
          question: prompt,
          contextSources: contextSources,
          mode: 'auto' // Can be overridden for testing: 'rag', 'standard', 'code', 'api', 'general'
        });

        // Determine if this is a general knowledge question using PromptConfig
        const questionLower = prompt.toLowerCase();
        
        // Check for application-specific terms
        const hasApplicationKeywords = PromptConfig.keywords.application.some(keyword => questionLower.includes(keyword));
        
        // Check for general question patterns
        const hasGeneralPattern = PromptConfig.keywords.general.some(keyword => questionLower.includes(keyword));
        
        // Special check for app-specific mentions
        const mentionsApp = questionLower.includes('eventstorm') || 
                          questionLower.includes('this app') || 
                          questionLower.includes('the app') ||
                          questionLower.includes('your app') ||
                          questionLower.includes('my app');
        
        // Logic: It's a general question ONLY if it has general patterns AND no application context
        const isGeneralQuestion = hasGeneralPattern && !hasApplicationKeywords && !mentionsApp;

        if (PromptConfig.logging.logPromptSelection) {
          console.log(`[${new Date().toISOString()}] 🎯 PROMPT SELECTION: Auto-selected intelligent system prompt based on context analysis`);
          console.log(`[${new Date().toISOString()}] 🎯 QUESTION TYPE: ${isGeneralQuestion ? 'General Knowledge' : 'Application/Technical'}`);
          console.log(`[${new Date().toISOString()}] 🔍 Analysis: hasGeneral=${hasGeneralPattern}, hasApp=${hasApplicationKeywords}, mentionsApp=${mentionsApp}`);
        }
        
        // Build messages with appropriate content based on question type
        let userMessage;
        if (isGeneralQuestion) {
          // For general questions, don't include application context
          userMessage = {
            role: "user",
            content: prompt
          };
          console.log(`[${new Date().toISOString()}] 🔍 GENERAL QUESTION: Using clean prompt without application context`);
        } else {
          // For application/technical questions, include relevant context
          userMessage = {
            role: "user",
            content: `I have a question: "${prompt}"\n\nHere is the relevant information:\n\n${context}`
          };
          console.log(`[${new Date().toISOString()}] 🔍 APPLICATION QUESTION: Including RAG context for technical assistance`);
        }
        
        // Build comprehensive messages array with intelligent system prompt, history, and appropriate content
        const messages = [
          {
            role: "system",
            content: systemPrompt
          },
          ...historyMessages, // Include conversation history
          userMessage
        ];
        
        console.log(`[${new Date().toISOString()}] 🔍 CONVERSATION CONTEXT: Built ${messages.length} messages for LLM (1 system + ${historyMessages.length} history + 1 current)`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Messages prepared for LLM invoke with conversation history.`);
        
        // Try to generate a response
        let retries = 0;
        let success = false;
        let response;
        while (!success && retries < this.requestQueue.maxRetries) {
          if (await this.requestQueue.checkRateLimit()) {
            console.log(`[${new Date().toISOString()}] [DEBUG] Starting LLM invoke loop. MaxRetries: ${this.requestQueue.maxRetries}`);
            try {
              const result = await this.llm.invoke(messages);
              response = result.content;
              success = true;
              console.log(`[${new Date().toISOString()}] [DEBUG] LLM invoke successful.`);
            } catch (error) {
              if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit'))) {
                retries++;
                console.warn(`[${new Date().toISOString()}] Rate limit hit during generation, retry ${retries}/${this.requestQueue.maxRetries}`);
                await this.requestQueue.waitWithBackoff(retries);
                console.log(`[${new Date().toISOString()}] [DEBUG] LLM rate limit encountered. Waiting before retry.`);
              } else {
                // Log the error and throw it for proper handling
                console.error(`[${new Date().toISOString()}] Failed to respond to prompt:`, error);
                console.log(`[${new Date().toISOString()}] [DEBUG] LLM invoke error stack:`, error.stack);
                throw error;
              }
            }
          } else {
            // Wait if we're rate limited
            await this.waitWithBackoff(retries);
            console.log(`[${new Date().toISOString()}] [DEBUG] Waiting for rate limit window in LLM invoke.`);
          }
        }
        if (!success) {
          // If we couldn't generate a response after all retries
          throw new Error(`Failed to generate response after ${this.requestQueue.maxRetries} retries due to rate limits`);
        }
        console.log(`[${new Date().toISOString()}] Successfully generated response for conversation ${conversationId}`);
        
        // Log comprehensive source usage summary
        console.log(`[${new Date().toISOString()}] ✅ CHAT RESPONSE GENERATED using MULTI-SOURCE RAG:`);
        console.log(`[${new Date().toISOString()}] 📊 Sources Used Summary:`);
        console.log(`[${new Date().toISOString()}]    • API spec chunks: ${sourceAnalysis.apiSpec}`);
        console.log(`[${new Date().toISOString()}]    • Root docs chunks: ${sourceAnalysis.rootDocumentation}`);
        console.log(`[${new Date().toISOString()}]    • Module docs chunks: ${sourceAnalysis.moduleDocumentation}`);
        console.log(`[${new Date().toISOString()}]    • GitHub code chunks: ${sourceAnalysis.githubRepo}`);
        console.log(`[${new Date().toISOString()}]    • TOTAL: ${sourceAnalysis.total} chunks`);
        
        if (moduleDocsUsed.length > 0) {
          console.log(`[${new Date().toISOString()}] 📁 Modules referenced: ${moduleDocsUsed.join(', ')}`);
        }
        if (reposUsed.length > 0) {
          console.log(`[${new Date().toISOString()}] 💻 Repositories referenced: ${reposUsed.join(', ')}`);
        }
        
        const sourcesBreakdown = {
          hasApiSpec: sourceAnalysis.apiSpec > 0,
          hasRootDocs: sourceAnalysis.rootDocumentation > 0,
          hasModuleDocs: sourceAnalysis.moduleDocumentation > 0,
          hasGithubCode: sourceAnalysis.githubRepo > 0
        };
        
        console.log(`[${new Date().toISOString()}] 🎯 COMPREHENSIVE CONTEXT: Answer incorporates ${Object.values(sourcesBreakdown).filter(Boolean).length}/4 available source types`);

        // Log the full context size to help diagnose if embedding usage is working
        const contextSize = (typeof finalContext !== 'undefined' ? finalContext.length : (typeof context !== 'undefined' ? context.length : contextIntro.length));
        console.log(`[${new Date().toISOString()}] [DEBUG] Response generated. Context size: ${context.length}`);
        console.log(`[${new Date().toISOString()}] 🔍 CONVERSATION HISTORY: Used ${conversationHistory.length} previous exchanges for continuity`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Returning response object from respondToPrompt.`);
        
        return {
          success: true,
          response,
          conversationId,
          timestamp: new Date().toISOString(),
          ragEnabled: true,
          contextSize,
          sourcesUsed: sourceAnalysis,
          sourcesBreakdown,
          conversationHistoryUsed: conversationHistory.length > 0,
          historyMessages: conversationHistory.length
        };
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
  }

  // Helper method for generating responses without context
  async generateStandardResponse(prompt, conversationId, conversationHistory = []) {
    try {
      // Format passed conversation history for continuity even in standard responses
      const historyMessages = AIUtils.formatConversationHistory(conversationHistory);
      
      // Use intelligent prompt selection even for standard responses
      const systemPrompt = PromptSelector.selectPrompt({
        hasRagContext: false,
        conversationCount: conversationHistory.length,
        question: prompt,
        contextSources: {},
        mode: 'auto'
      });

      if (PromptConfig.logging.logPromptSelection) {
        console.log(`[${new Date().toISOString()}] 🎯 STANDARD RESPONSE: Selected intelligent prompt for non-RAG response`);
      }
      
      // Build messages with intelligent conversation history
      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        ...historyMessages, // Include conversation history
        {
          role: "user",
          content: prompt
        }
      ];

      console.log(`[${new Date().toISOString()}] 🔍 STANDARD RESPONSE: Built ${messages.length} messages with conversation history (1 system + ${historyMessages.length} history + 1 current)`);

      // Rate limit checks
      let retries = 0;
      let success = false;
      let response;

      while (!success && retries < this.requestQueue.maxRetries) {
        if (await this.requestQueue.checkRateLimit()) {
          try {
            const result = await this.llm.invoke(messages);
            response = result.content;
            success = true;
          } catch (error) {
            if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit'))) {
              retries++;
              console.warn(`[${new Date().toISOString()}] Rate limit hit during standard generation, retry ${retries}/${this.requestQueue.maxRetries}`);
              await this.requestQueue.waitWithBackoff(retries);
            } else {
              throw error;
            }
          }
        } else {
          await this.requestQueue.waitWithBackoff(retries);
        }
      }

      if (!success) {
        throw new Error(`Failed to generate standard response after ${this.requestQueue.maxRetries} retries due to rate limits`);
      }

      console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Generated standard response with conversation history for conversation ${conversationId}`);
      
      return {
        success: true,
        response,
        conversationId,
        timestamp: new Date().toISOString(),
        sourcesUsed: 0,
        ragEnabled: false,
        conversationHistoryUsed: conversationHistory.length > 0,
        historyMessages: conversationHistory.length
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in generateStandardResponse:`, error.message);

      if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit'))) {
        return {
          success: false,
          response: "I'm currently experiencing high demand. Please try again in a few moments.",
          conversationId,
          timestamp: new Date().toISOString(),
          error: error.message
        };
      }

      return {
        success: false,
        response: "I encountered an issue while generating a response. Please try again shortly.",
        conversationId,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Helper method to create an appropriate text splitter based on document content
  createSmartSplitter(documents) {
    // Default splitter settings
    const chunkSize = 1500; // Larger chunks for fewer requests
    const chunkOverlap = 250; // More overlap for better context

    // Analyze documents to determine predominant language and file types
    const languageCount = {};
    const fileTypeCount = {};

    documents.forEach(doc => {
      const source = doc.metadata.source || '';
      const extension = source.split('.').pop().toLowerCase();
      if (!extension) return;

      // Track file types
      if (['md', 'markdown'].includes(extension)) {
        fileTypeCount.markdown = (fileTypeCount.markdown || 0) + 1;
      } else if (['json'].includes(extension)) {
        fileTypeCount.json = (fileTypeCount.json || 0) + 1;
      } else if (['yml', 'yaml'].includes(extension)) {
        fileTypeCount.yaml = (fileTypeCount.yaml || 0) + 1;
      }

      // Track programming languages
      if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) languageCount.javascript = (languageCount.javascript || 0) + 1;
      else if (['py'].includes(extension)) languageCount.python = (languageCount.python || 0) + 1;
      else if (['java'].includes(extension)) languageCount.java = (languageCount.java || 0) + 1;
      else if (['rb'].includes(extension)) languageCount.ruby = (languageCount.ruby || 0) + 1;
      else if (['go'].includes(extension)) languageCount.golang = (languageCount.golang || 0) + 1;
      else if (['php'].includes(extension)) languageCount.php = (languageCount.php || 0) + 1;
      else if (['c', 'cpp', 'h', 'hpp'].includes(extension)) languageCount.cpp = (languageCount.cpp || 0) + 1;
      else if (['cs'].includes(extension)) languageCount.csharp = (languageCount.csharp || 0) + 1;
      else if (['rs'].includes(extension)) languageCount.rust = (languageCount.rust || 0) + 1;
    });

    // Check for predominant file types
    const totalDocs = documents.length;
    const markdownRatio = (fileTypeCount.markdown || 0) / totalDocs;

    // If majority are markdown files, use header-based splitting
    if (markdownRatio > 0.5) {
      console.log(`[${new Date().toISOString()}] Using markdown header-based splitter (${Math.round(markdownRatio * 100)}% markdown files)`);
      return new MarkdownHeaderTextSplitter({
        headersToSplitOn: [
          { level: 1, name: 'h1' },
          { level: 2, name: 'h2' },
          { level: 3, name: 'h3' }
        ]
      });
    }

    // Find the most common programming language
    let predominantLanguage = 'javascript'; // Default
    let maxCount = 0;

    Object.entries(languageCount).forEach(([lang, count]) => {
      if (count > maxCount) {
        predominantLanguage = lang;
        maxCount = count;
      }
    });

    // Map to LangChain language string
    const langMap = {
      javascript: "js",
      python: "python",
      java: "java",
      ruby: "ruby",
      golang: "go",
      php: "php",
      cpp: "cpp",
      csharp: "csharp",
      rust: "rust"
    };

    const language = langMap[predominantLanguage] || "js";

    console.log(`[${new Date().toISOString()}] Using ${predominantLanguage} code splitter for document processing (${maxCount}/${totalDocs} files)`);

    // Create a language-specific splitter that respects code structure
    return RecursiveCharacterTextSplitter.fromLanguage(language, {
      chunkSize,
      chunkOverlap,
      // Add separators that respect code structure
      separators: this.getCodeAwareSeparators(language)
    });
  }

  // Get code-aware separators for better chunking
  getCodeAwareSeparators(language) {
    const baseSeparators = [
      "\n\n", // Paragraph breaks
      "\n", // Line breaks
      " ", // Word breaks
      "" // Character breaks (fallback)
    ];

    switch (language) {
      case "js":
      case "ts":
        return [
          "\nexport class ", // Class declarations
          "\nclass ", // Class declarations
          "\nexport function ", // Function exports
          "\nfunction ", // Function declarations
          "\nexport const ", // Constant exports
          "\nconst ", // Constants
          "\nexport ", // Any exports
          "\n// ", // Comments
          "\n\n", // Paragraph breaks
          "\n", // Line breaks
          " ", // Word breaks
          ""
        ];
      case "python":
        return [
          "\nclass ", // Class declarations
          "\ndef ", // Function definitions
          "\n# ", // Comments
          "\n\n", // Paragraph breaks
          "\n", // Line breaks
          " ", // Word breaks
          ""
        ];
      case "java":
        return [
          "\npublic class ", // Public classes
          "\nclass ", // Classes
          "\npublic ", // Public methods/fields
          "\nprivate ", // Private methods/fields
          "\n// ", // Comments
          "\n\n", // Paragraph breaks
          "\n", // Line breaks
          " ", // Word breaks
          ""
        ];
      default:
        return baseSeparators;
    }
  }

  /**
   * Determine intelligent search strategy based on prompt analysis
   */
  /**
   * Check if prompt contains specific keywords
   */
}

module.exports = AILangchainAdapter;