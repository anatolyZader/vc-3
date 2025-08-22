// aiLangchainAdapter.js
"use strict";
/* eslint-disable no-unused-vars */

/**
 * =========================================================================
 * AI LANGCHAIN ADAPTER - COMPREHENSIVE DOCUMENTATION & INDEX
 * =========================================================================
 * 
 * This file implements a Retrieval-Augmented Generation (RAG) system that:
 * 1. Indexes repository code and documentation into vector databases
 * 2. Provides AI-powered responses using retrieved context
 * 3. Manages rate limiting and queue processing
 * 4. Handles multiple LLM providers (OpenAI, Anthropic, Google)
 * 
 * ARCHITECTURE OVERVIEW:
 * =====================
 * 
 * DATA PREPARATION PHASE (Heavy Operations - Done Once Per Repo):
 * - processPushedRepo(): Main entry point for repository processing
 * - indexCoreDocsToPinecone(): Indexes API specs and markdown docs
 * - Uses GithubRepoLoader to fetch and chunk repository files
 * - Stores embeddings in Pinecone vector database with namespaces
 * 
 * QUERY PHASE (Lightweight - Per User Request):
 * - respondToPrompt(): Main AI response generation with RAG
 * - generateStandardResponse(): Fallback without vector retrieval
 * - Accepts conversation history from service layer (no database access)
 * 
 * MAIN CLASS & METHODS INDEX:
 * ==========================
 * 
 * CLASS: AILangchainAdapter extends IAIPort
 * ├── CONSTRUCTOR & SETUP
 * │   ├── constructor(options) [Line 372] - Initialize adapter with rate limiting, LLM setup
 * │   ├── setUserId(userId) [Line 461] - Set current user context
 * │   └── initializeLLM() [Line 494] - Configure LLM provider (OpenAI/Anthropic/Google)
 * │
 * ├── CORE INDEXING METHODS (Data Preparation)
 * │   ├── processPushedRepo(userId, repoId, repoData) [Line 616] 
 * │   │   └── Main entry point for repository indexing pipeline
 * │   │   └── Loads repo files, creates embeddings, stores in Pinecone
 * │   │   └── Emits progress events via RAG status
 * │   │
 * │   ├── indexCoreDocsToPinecone() [Line 155]
 * │   │   └── Indexes API specifications and markdown documentation
 * │   │   └── Chunks API spec into tags, endpoints, info sections
 * │   │   └── Processes markdown files from specific directories
 * │   │
 * │   ├── loadApiSpec(filePath) [Line 260]
 * │   │   └── Loads and validates httpApiSpec.json file
 * │   │   └── Returns structured document for embedding
 * │   │
 * │   ├── loadMarkdownFiles() [Line 295]
 * │   │   └── Scans for .md files in root and module directories
 * │   │   └── Categorizes docs as root/architecture/module documentation
 * │   │
 * │   ├── chunkApiSpecEndpoints(apiSpecJson, documents) [Line 388]
 * │   │   └── Creates endpoint-specific chunks from OpenAPI spec
 * │   │   └── Each endpoint becomes a detailed, searchable document
 * │   │
 * │   ├── chunkApiSpecSchemas(apiSpecJson, documents) [Line 448]
 * │   │   └── Creates component schema chunks from OpenAPI spec
 * │   │   └── Each schema definition becomes a structured document
 * │   │
 * │   └── splitMarkdownDocuments(markdownDocs) [Line 487]
 * │       └── Uses header-aware splitting for markdown files
 * │       └── Preserves document structure and section context
 * │
 * ├── AI RESPONSE GENERATION (Query Phase)
 * │   ├── respondToPrompt(userId, conversationId, prompt, conversationHistory) [Line 757]
 * │   │   └── PRIMARY METHOD: Generates AI responses using RAG
 * │   │   └── Flow: Rate limit → Vector search → LLM generation
 * │   │   └── Combines: passed conversation history + retrieved docs + user prompt
 * │   │   └── Falls back to generateStandardResponse() if vector search fails
 * │   │   └── NO DATABASE ACCESS - history passed from service layer
 * │   │
 * │   └── generateStandardResponse(prompt, conversationId, conversationHistory) [Line 1148]
 * │       └── FALLBACK METHOD: AI response without vector retrieval
 * │       └── Uses only passed conversation history + API spec summary
 * │       └── Simpler but less context-aware than full RAG
 * │       └── NO DATABASE ACCESS - history passed as parameter
 * │
 * ├── CONVERSATION MANAGEMENT
 * │   └── formatConversationHistory(history) [Line 703]
 * │       └── Converts database records to LangChain message format
 * │       └── Handles user/assistant message types
 * │       └── UTILITY ONLY - processes data passed from service layer
 * │
 * ├── RATE LIMITING & QUEUE MANAGEMENT
 * │   ├── checkRateLimit() [Line 574]
 * │   │   └── Enforces per-user request rate limits using Bottleneck
 * │   │   └── Prevents API abuse and cost overrun
 * │   │
 * │   ├── waitWithBackoff(retryCount) [Line 598]
 * │   │   └── Implements exponential backoff for retries
 * │   │   └── Used when rate limits or API errors occur
 * │   │
 * │   ├── processQueue() [Line 1378]
 * │   │   └── Background queue processor for managing concurrent requests
 * │   │   └── Ensures orderly processing and prevents overwhelming APIs
 * │   │
 * │   └── queueRequest(execute) [Line 1417]
 * │       └── Adds requests to processing queue
 * │       └── Returns promise that resolves when request is processed
 * │
 * ├── UTILITY METHODS
 * │   ├── formatApiSpecSummary(apiSpec) [Line 733]
 * │   │   └── Extracts key info from API specification
 * │   │   └── Used when full vector search isn't available
 * │   │
 * │   ├── getFileType(filePath) [Line 1236]
 * │   │   └── Determines file category for better indexing
 * │   │   └── Returns: code, documentation, configuration, or other
 * │   │
 * │   ├── sanitizeId(input) [Line 1272]
 * │   │   └── Cleans strings for use as vector store namespaces
 * │   │   └── Ensures valid Pinecone namespace format
 * │   │
 * │   ├── emitRagStatus(status, details) [Line 1278]
 * │   │   └── Emits progress events during indexing operations
 * │   │   └── Used for real-time status updates to clients
 * │   │
 * │   └── createSmartSplitter(documents) [Line 1611]
 * │   │   └── Creates language-specific and content-aware text splitters
 * │   │   └── Optimizes chunking based on code language and file type detection
 * │   │
 * │   └── getCodeAwareSeparators(language) [Line 1671]
 * │       └── Returns language-specific separators for better code chunking
 * │       └── Ensures chunks break at logical code boundaries
 * │
 * EXTERNAL DEPENDENCIES:
 * ======================
 * - @langchain/openai: OpenAI LLM and embeddings
 * - @langchain/anthropic: Anthropic Claude models
 * - @langchain/google-genai: Google Gemini models
 * - @langchain/pinecone: Vector store integration
 * - @langchain/community: GitHub loader and other tools
 * - @langchain/textsplitters: Smart text chunking
 * - bottleneck: Rate limiting implementation
 * - @pinecone-database/pinecone: Vector database client
 * 
 * KEY CONFIGURATION:
 * ==================
 * - Vector embeddings: OpenAI text-embedding-3-large
 * - Vector store: Pinecone with separate namespaces per repository
 * - Text chunking: 1500 char chunks with 250 char overlap
 * - Rate limits: 60 requests per minute default
 * - Conversation history: Passed from service (no direct DB access)
 * - Supported file types: .js, .ts, .md, .json, .yml, .yaml, .py, etc.
 * 
 * ERROR HANDLING:
 * ===============
 * - Graceful fallbacks when vector search fails
 * - Rate limit handling with exponential backoff
 * - Comprehensive logging with timestamps
 * - Progress tracking via RAG status emissions
 * - Timeout handling for vector operations (30s default)
 * 
 * PERFORMANCE CONSIDERATIONS:
 * ===========================
 * - Lazy initialization of LLM clients
 * - Efficient vector similarity search with metadata filtering
 * - Smart chunking to balance context vs. relevance
 * - Background queue processing for concurrent requests
 * - Namespace isolation to prevent cross-repository contamination
 * - Language-specific text splitters for optimal code chunking
 * 
 * ARCHITECTURAL IMPROVEMENTS (Post-Persistence Isolation):
 * =======================================================
 * ✅ REMOVED: Direct database access and persistence adapter dependency
 * ✅ IMPROVED: Clean separation between AI operations and data persistence
 * ✅ ENHANCED: Service layer now handles all conversation history management
 * ✅ SIMPLIFIED: Adapter focused purely on AI/RAG functionality
 * ✅ MAINTAINED: Full functionality with better architectural boundaries
 */

const IAIPort = require('../../domain/ports/IAIPort');
const Bottleneck = require("bottleneck");
const { GithubRepoLoader } = require("@langchain/community/document_loaders/web/github");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { MarkdownHeaderTextSplitter } = require("@langchain/textsplitters");
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');

class AILangchainAdapter extends IAIPort {
  // Separate method to index only core docs (can be called independently)
  // Remove this unused method

  // Automate indexing of httpApiSpec.json and markdown documentation into Pinecone
  async indexCoreDocsToPinecone() {
    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Starting core docs indexing into 'core-docs' namespace.`);
    // Load API spec
    const apiSpecChunk = await this.loadApiSpec('httpApiSpec.json');
    // Load markdown documentation files
    const markdownDocs = await this.loadMarkdownFiles();

    const documents = [];
    if (apiSpecChunk) {
      console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] API Spec loaded successfully.`);
      // Parse JSON for targeted chunking
      let apiSpecJson;
      try {
        apiSpecJson = JSON.parse(apiSpecChunk.pageContent);
      } catch (e) {
        apiSpecJson = null;
      }
      
      if (apiSpecJson) {
        // Create endpoint-specific chunks for better retrieval
        await this.chunkApiSpecEndpoints(apiSpecJson, documents);
        
        // Create schema chunks from components
        await this.chunkApiSpecSchemas(apiSpecJson, documents);
        
        // Tags chunk (keep existing)
        if (Array.isArray(apiSpecJson.tags)) {
          const tagsText = apiSpecJson.tags.map(tag => `- ${tag.name}: ${tag.description}`).join('\n');
          documents.push({
            pageContent: `API Tags:\n${tagsText}`,
            metadata: { source: 'httpApiSpec.json', type: 'apiSpecTags' }
          });
        }
        
        // Info chunk (keep existing)
        if (apiSpecJson.info) {
          documents.push({
            pageContent: `API Info:\nTitle: ${apiSpecJson.info.title}\nDescription: ${apiSpecJson.info.description}\nVersion: ${apiSpecJson.info.version}`,
            metadata: { source: 'httpApiSpec.json', type: 'apiSpecInfo' }
          });
        }
      }
    }

    // Add markdown documentation files
    if (markdownDocs.length > 0) {
      console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] ${markdownDocs.length} Markdown docs loaded.`);
      documents.push(...markdownDocs);
    }

    if (documents.length === 0) {
      console.log(`[${new Date().toISOString()}] 🟡 [RAG-INDEX] No core documents found to index. Aborting.`);
      return;
    }

    // Use improved splitter for chunking markdown docs
    const docsToSplit = documents.filter(doc => 
      doc.metadata.type === 'root_documentation' || 
      doc.metadata.type === 'module_documentation' ||
      doc.metadata.type === 'architecture_documentation'
    );
    let splittedDocs = [];
    if (docsToSplit.length > 0) {
      // Use markdown-aware splitter for semantic chunking
      splittedDocs = await this.splitMarkdownDocuments(docsToSplit);
    }
    
    // Add all API spec chunks (already optimally chunked)
    splittedDocs = splittedDocs.concat(documents.filter(doc => doc.metadata.source === 'httpApiSpec.json'));
    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Total documents after splitting: ${splittedDocs.length}`);

    // Generate unique IDs for Pinecone
    const repoId = 'core-docs';
    const documentIds = splittedDocs.map((doc, index) =>
      `system_${repoId}_${this.sanitizeId(doc.metadata.type || doc.metadata.source || 'unknown')}_chunk_${index}`
    );

    // Store in Pinecone in a GLOBAL namespacee
    if (this.pinecone) {
        try {
            const coreDocsIndex = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
            const coreDocsVectorStore = new PineconeStore(this.embeddings, {
                pineconeIndex: coreDocsIndex,
                namespace: 'core-docs' // Using a fixed, global namespace
            });
            await coreDocsVectorStore.addDocuments(splittedDocs, { ids: documentIds });
            console.log(`[${new Date().toISOString()}] ✅ [RAG-INDEX] Successfully indexed ${splittedDocs.length} core doc chunks to Pinecone in 'core-docs' namespace.`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ [RAG-INDEX] Error indexing core docs to Pinecone:`, error);
        }
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠️ [RAG-INDEX] Pinecone client not initialized, cannot index core docs.`);
    }
  }
  // Helper to load JSON spec file from backend root
  async loadApiSpec(filePath) {
    const fs = require('fs');
    const path = require('path');
    const backendRoot = path.resolve(__dirname, '../../../..');
    const absPath = path.resolve(backendRoot, filePath);
    try {
      const content = await fs.promises.readFile(absPath, 'utf8');
      // Optionally parse and pretty-print JSON
      let prettyContent = content;
      try {
        const json = JSON.parse(content);
        prettyContent = JSON.stringify(json, null, 2);
      } catch (e) {}
      return {
        pageContent: prettyContent,
        metadata: { source: 'httpApiSpec.json', type: 'apiSpec' }
      };
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] Could not load API spec file at ${absPath}: ${err.message}`);
      return null;
    }
  }

  // Helper to load markdown files from root directory and business modules
  async loadMarkdownFiles() {
    const fs = require('fs');
    const path = require('path');
    const markdownDocs = [];
    
    try {
      const backendRoot = path.resolve(__dirname, '../../../..');
      
      // Load ROOT_DOCUMENTATION.md from backend root if it exists
      const rootDocPath = path.join(backendRoot, 'ROOT_DOCUMENTATION.md');
      try {
        const rootDocContent = await fs.promises.readFile(rootDocPath, 'utf8');
        markdownDocs.push({
          pageContent: rootDocContent,
          metadata: { 
            source: 'ROOT_DOCUMENTATION.md', 
            type: 'root_documentation',
            priority: 'high'
          }
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Loaded root documentation file`);
      } catch (err) {
        console.log(`[${new Date().toISOString()}] [DEBUG] No root documentation file found at ${rootDocPath}`);
      }

      // Load ARCHITECTURE.md from backend root if it exists
      const archDocPath = path.join(backendRoot, 'ARCHITECTURE.md');
      try {
        const archDocContent = await fs.promises.readFile(archDocPath, 'utf8');
        markdownDocs.push({
          pageContent: archDocContent,
          metadata: { 
            source: 'ARCHITECTURE.md', 
            type: 'architecture_documentation',
            priority: 'high'
          }
        });
        console.log(`[${new Date().toISOString()}] [DEBUG] Loaded architecture documentation file`);
      } catch (err) {
        console.log(`[${new Date().toISOString()}] [DEBUG] No architecture documentation file found at ${archDocPath}`);
      }

      // Load markdown files from business modules
      const businessModulesPath = path.join(backendRoot, 'business_modules');
      
      try {
        const modules = await fs.promises.readdir(businessModulesPath, { withFileTypes: true });
        
        for (const module of modules) {
          if (module.isDirectory()) {
            const modulePath = path.join(businessModulesPath, module.name);
            const moduleMarkdownPath = path.join(modulePath, `${module.name}.md`);
            
            try {
              const moduleContent = await fs.promises.readFile(moduleMarkdownPath, 'utf8');
              markdownDocs.push({
                pageContent: moduleContent,
                metadata: { 
                  source: `business_modules/${module.name}/${module.name}.md`, 
                  type: 'module_documentation',
                  module: module.name,
                  priority: 'medium'
                }
              });
              console.log(`[${new Date().toISOString()}] [DEBUG] Loaded ${module.name} module documentation`);
            } catch (err) {
              console.log(`[${new Date().toISOString()}] [DEBUG] No documentation file found for module ${module.name} at ${moduleMarkdownPath}`);
            }
          }
        }
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] Could not read business modules directory: ${err.message}`);
      }

      // Sort by priority (high priority first)
      markdownDocs.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return priorityOrder[a.metadata.priority] - priorityOrder[b.metadata.priority];
      });

      console.log(`[${new Date().toISOString()}] [DEBUG] Loaded ${markdownDocs.length} total markdown documentation files`);
      return markdownDocs;
      
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Error loading markdown files: ${err.message}`);
      return [];
    }
  }

  // Enhanced API spec chunking - creates endpoint-specific chunks
  async chunkApiSpecEndpoints(apiSpecJson, documents) {
    if (!apiSpecJson.paths || typeof apiSpecJson.paths !== 'object') {
      console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] No paths found in API spec`);
      return;
    }

    let endpointCount = 0;
    Object.entries(apiSpecJson.paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, operation]) => {
        if (typeof operation !== 'object') return; // Skip non-operation entries

        const endpoint = {
          method: method.toUpperCase(),
          path: path,
          summary: operation.summary || '',
          description: operation.description || '',
          tags: operation.tags || [],
          operationId: operation.operationId || ''
        };

        // Build comprehensive endpoint documentation
        let content = `${endpoint.method} ${endpoint.path}\n`;
        if (endpoint.summary) content += `Summary: ${endpoint.summary}\n`;
        if (endpoint.description) content += `Description: ${endpoint.description}\n`;
        if (endpoint.operationId) content += `Operation ID: ${endpoint.operationId}\n`;
        if (endpoint.tags.length > 0) content += `Tags: ${endpoint.tags.join(', ')}\n`;

        // Add parameters information
        if (operation.parameters && Array.isArray(operation.parameters)) {
          content += `\nParameters:\n`;
          operation.parameters.forEach(param => {
            content += `- ${param.name} (${param.in}): ${param.description || 'No description'} ${param.required ? '[Required]' : '[Optional]'}\n`;
          });
        }

        // Add request body information
        if (operation.requestBody) {
          content += `\nRequest Body:\n`;
          if (operation.requestBody.description) {
            content += `Description: ${operation.requestBody.description}\n`;
          }
          if (operation.requestBody.content) {
            Object.keys(operation.requestBody.content).forEach(mediaType => {
              content += `Media Type: ${mediaType}\n`;
            });
          }
        }

        // Add response information
        if (operation.responses && typeof operation.responses === 'object') {
          content += `\nResponses:\n`;
          Object.entries(operation.responses).forEach(([statusCode, response]) => {
            if (response.description) {
              content += `- ${statusCode}: ${response.description}\n`;
            }
          });
        }

        documents.push({
          pageContent: content,
          metadata: {
            source: 'httpApiSpec.json',
            type: 'api_endpoint',
            method: method.toLowerCase(),
            path: path,
            tags: endpoint.tags,
            operationId: endpoint.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`
          }
        });

        endpointCount++;
      });
    });

    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Created ${endpointCount} endpoint-specific chunks`);
  }

  // Enhanced API spec schema chunking - creates component schema chunks
  async chunkApiSpecSchemas(apiSpecJson, documents) {
    if (!apiSpecJson.components || !apiSpecJson.components.schemas) {
      console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] No schemas found in API spec components`);
      return;
    }

    let schemaCount = 0;
    Object.entries(apiSpecJson.components.schemas).forEach(([schemaName, schema]) => {
      let content = `Schema: ${schemaName}\n`;
      if (schema.type) content += `Type: ${schema.type}\n`;
      if (schema.description) content += `Description: ${schema.description}\n`;

      // Add properties information
      if (schema.properties && typeof schema.properties === 'object') {
        content += `\nProperties:\n`;
        Object.entries(schema.properties).forEach(([propName, propSchema]) => {
          const required = schema.required && schema.required.includes(propName) ? '[Required]' : '[Optional]';
          const type = propSchema.type || 'unknown';
          const description = propSchema.description || 'No description';
          content += `- ${propName} (${type}): ${description} ${required}\n`;
        });
      }

      // Add enum values if present
      if (schema.enum && Array.isArray(schema.enum)) {
        content += `\nPossible Values: ${schema.enum.join(', ')}\n`;
      }

      documents.push({
        pageContent: content,
        metadata: {
          source: 'httpApiSpec.json',
          type: 'api_schema',
          schemaName: schemaName,
          schemaType: schema.type || 'object'
        }
      });

      schemaCount++;
    });

    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Created ${schemaCount} schema-specific chunks`);
  }

  // Enhanced markdown splitting using header-aware splitter
  async splitMarkdownDocuments(markdownDocs) {
    const splittedDocs = [];

    for (const doc of markdownDocs) {
      try {
        // Try header-based splitting first
        const headerSplitter = new MarkdownHeaderTextSplitter({
          headersToSplitOn: [
            { level: 1, name: 'h1' },
            { level: 2, name: 'h2' },
            { level: 3, name: 'h3' }
          ]
        });

        const headerChunks = await headerSplitter.splitDocuments([doc]);
        
        if (headerChunks.length > 1) {
          // Header splitting was successful
          headerChunks.forEach((chunk, index) => {
            const enhancedMetadata = {
              ...doc.metadata,
              chunkIndex: index,
              splitterType: 'header-based'
            };

            // Extract section information from metadata
            if (chunk.metadata) {
              Object.keys(chunk.metadata).forEach(key => {
                if (key.startsWith('h') && chunk.metadata[key]) {
                  enhancedMetadata.section = chunk.metadata[key];
                  enhancedMetadata.sectionLevel = key;
                }
              });
            }

            splittedDocs.push({
              ...chunk,
              metadata: enhancedMetadata
            });
          });

          console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Split ${doc.metadata.source} into ${headerChunks.length} header-based chunks`);
        } else {
          // Fallback to character-based splitting
          const charSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1500,
            chunkOverlap: 250
          });

          const charChunks = await charSplitter.splitDocuments([doc]);
          charChunks.forEach((chunk, index) => {
            splittedDocs.push({
              ...chunk,
              metadata: {
                ...doc.metadata,
                chunkIndex: index,
                splitterType: 'character-based'
              }
            });
          });

          console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Split ${doc.metadata.source} into ${charChunks.length} character-based chunks (header splitting failed)`);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error splitting markdown doc ${doc.metadata.source}:`, error.message);
        // Add the original document if splitting fails
        splittedDocs.push({
          ...doc,
          metadata: {
            ...doc.metadata,
            splitterType: 'none',
            error: 'splitting_failed'
          }
        });
      }
    }

    return splittedDocs;
  }
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

    // Rate limiting parameters for LLM (keep for LLM calls)
    this.requestsInLastMinute = 0;
    this.lastRequestTime = Date.now();
    this.maxRequestsPerMinute = 60;
    this.retryDelay = 5000;
    this.maxRetries = 10;
    console.log(`[${new Date().toISOString()}] [DEBUG] Rate limiting params: maxRequestsPerMinute=${this.maxRequestsPerMinute}, retryDelay=${this.retryDelay}, maxRetries=${this.maxRetries}`);

    // Bottleneck rate limiter for Pinecone upserts
    this.pineconeLimiter = new Bottleneck({
      reservoir: 100, // 100 records per second
      reservoirRefreshAmount: 100,
      reservoirRefreshInterval: 1000,
      maxConcurrent: 1
    });
    console.log(`[${new Date().toISOString()}] [DEBUG] Bottleneck limiter initialized.`);

    // Request queue system
    this.requestQueue = [];
    this.isProcessingQueue = false;
    console.log(`[${new Date().toISOString()}] [DEBUG] Request queue initialized.`);

    // Start queue processor
    this.startQueueProcessor();
    console.log(`[${new Date().toISOString()}] [DEBUG] Queue processor started.`);

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
      this.initializeLLM();
      console.log(`[${new Date().toISOString()}] [DEBUG] LLM initialized.`);

      // Don't initialize vectorStore until we have a userId
      this.vectorStore = null;
      console.log(`[${new Date().toISOString()}] [DEBUG] Vector store set to null (will be initialized after userId).`);

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

  // Initialize LLM based on provider
  initializeLLM() {
    try {
      switch (this.aiProvider.toLowerCase()) {
        case 'openai': {
          console.log(`[${new Date().toISOString()}] Initializing OpenAI provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatOpenAI } = require('@langchain/openai');
          this.llm = new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
          break;
        }

        case 'anthropic': {
          console.log(`[${new Date().toISOString()}] Initializing Anthropic provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatAnthropic } = require('@langchain/anthropic');
          this.llm = new ChatAnthropic({
            modelName: 'claude-3-haiku-20240307',
            temperature: 0,
            apiKey: process.env.ANTHROPIC_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 1, // Reduced to 1 to avoid rate limiting
            streaming: false, // Disable streaming to reduce connection overhead
            timeout: 120000 // 2 minute timeout
          });
          break;
        }

        case 'google': {
          console.log(`[${new Date().toISOString()}] Initializing Google provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
          this.llm = new ChatGoogleGenerativeAI({
            modelName: 'gemini-pro',
            apiKey: process.env.GOOGLE_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
          break;
        }

        case 'ollama': {
          console.log(`[${new Date().toISOString()}] Initializing Ollama provider`);
          // Import here to avoid requiring if not using this provider
          const { ChatOllama } = require('@langchain/community/chat_models/ollama');
          this.llm = new ChatOllama({
            model: process.env.OLLAMA_MODEL || 'llama2',
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            maxRetries: this.maxRetries
          });
          break;
        }

        default: {
          console.warn(`[${new Date().toISOString()}] Unknown provider: ${this.aiProvider}, falling back to OpenAI`);
          const { ChatOpenAI: DefaultChatOpenAI } = require('@langchain/openai');
          this.llm = new DefaultChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: this.maxRetries,
            maxConcurrency: 2
          });
        }
      }

      console.log(`[${new Date().toISOString()}] Successfully initialized LLM for provider: ${this.aiProvider}`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing LLM for provider ${this.aiProvider}:`, error.message);
      throw new Error(`Failed to initialize LLM provider ${this.aiProvider}: ${error.message}`);
    }
  }

  // Rate limit handling method
  async checkRateLimit() {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute in milliseconds

    // Reset counter if more than a minute has passed
    if (now - this.lastRequestTime > timeWindow) {
      this.requestsInLastMinute = 0;
      this.lastRequestTime = now;
      return true;
    }

    // If we're still under the limit, increment and allow
    if (this.requestsInLastMinute < this.maxRequestsPerMinute) {
      this.requestsInLastMinute++;
      this.lastRequestTime = now;
      return true;
    }

    // Otherwise, we need to wait
    console.log(`[${new Date().toISOString()}] Rate limit reached, delaying request`);
    return false;
  }

  // Function to wait with improved exponential backoff with jitter
  async waitWithBackoff(retryCount) {
    // Base delay plus linear component to ensure minimum wait time increases with retries
    const baseDelay = this.retryDelay + (retryCount * 5000);

    // Add jitter (±10%) to prevent thundering herd problem
    const jitterFactor = 0.9 + (Math.random() * 0.2);

    // Calculate final delay with max cap
    const delay = Math.min(
      baseDelay * jitterFactor,
      60000 // Max 60 seconds (increased from 30s)
    );

    console.log(`[${new Date().toISOString()}] Waiting ${Math.round(delay)}ms before retry ${retryCount + 1}`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // RAG Data Preparation Phase: Loading, chunking, and embedding (both core docs and repo code)
  async processPushedRepo(userId, repoId, repoData) {
    // userId here is the application's internal userId (e.g., UUID from JWT)
    // repoData should now contain githubOwner (e.g., "anatolyZader")
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

    // Index the core documentation (API spec, markdown files)
    await this.indexCoreDocsToPinecone();

    try {
      // Validate repoData structure
      if (!repoData || !repoData.url || !repoData.branch) {
        throw new Error(`Invalid repository data: ${JSON.stringify(repoData)}`);
      }

      const { url, branch } = repoData;

      // Extract GitHub owner and repo name from URL
      const urlParts = url.split('/');
      const githubOwner = urlParts[urlParts.length - 2];
      const repoName = urlParts[urlParts.length - 1].replace('.git', '');

      console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Extracted GitHub owner: ${githubOwner}, repo name: ${repoName}`);

      // Check if the repository is already processed
      const existingRepo = await this.findExistingRepo(userId, repoId, githubOwner, repoName);
      if (existingRepo) {
        console.log(`[${new Date().toISOString()}] Repository already processed, skipping: ${repoId}`);
        this.emitRagStatus('processing_skipped', {
          userId,
          repoId,
          reason: 'Repository already processed',
          timestamp: new Date().toISOString()
        });
        return {
          success: true,
          message: 'Repository already processed',
          repoId,
          userId
        };
      }

      // Clone the repository to a temporary location
      const tempDir = await this.cloneRepository(url, branch);

      // Load and process documents from the cloned repository
      const result = await this.loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName);

      // Cleanup: remove the cloned repository files
      await this.cleanupTempDir(tempDir);

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

  // Helper method to format conversation history into messages
  formatConversationHistory(history) {
    if (!history || history.length === 0) {
      return [];
    }

    const messages = [];
    
    // Add conversation history as alternating user/assistant messages
    history.forEach((entry) => {
      // Add user message
      messages.push({
        role: "user",
        content: entry.prompt
      });
      
      // Add assistant response
      messages.push({
        role: "assistant", 
        content: entry.response
      });
    });

    console.log(`[${new Date().toISOString()}] 🔍 CONVERSATION HISTORY: Formatted ${messages.length} messages (${messages.length / 2} exchanges) for context`);
    return messages;
  }

  // 2. Retrieval and generation:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  // The actual RAG chain, which takes the user query at run time and retrieves the relevant data from the index, then passes it to the model

  // Helper to extract endpoints and tags from OpenAPI spec
  formatApiSpecSummary(apiSpec) {
    if (!apiSpec) return '';
    let summary = 'API Endpoints and Tags from OpenAPI spec:';
    // List tags
    if (Array.isArray(apiSpec.tags)) {
      summary += '\n\nTags:';
      apiSpec.tags.forEach(tag => {
        summary += `\n- ${tag.name}: ${tag.description}`;
      });
    }
    // List endpoints
    if (apiSpec.paths && typeof apiSpec.paths === 'object') {
      summary += '\n\nEndpoints:';
      Object.entries(apiSpec.paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, details]) => {
          const tagList = details.tags && details.tags.length ? ` [tags: ${details.tags.join(', ')}]` : '';
          summary += `\n- ${method.toUpperCase()} ${path}${tagList}`;
        });
      });
    }
    return summary;
  }

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
    return this.queueRequest(async () => {
      try {
        // Load API spec and format summary
        const apiSpec = await this.loadApiSpec('httpApiSpec.json');
        const apiSpecSummary = this.formatApiSpecSummary(apiSpec);
        
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
          console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Running similarity search (no filter, single-user mode)`);
          
          // Add timeout to prevent hanging - increased timeout and fallback strategy
          const VECTOR_SEARCH_TIMEOUT = 30000; // 30 seconds (increased from 10)
          
          // Search user-specific namespace
          const userSearchPromise = this.vectorStore.similaritySearch(prompt, 10);

          // Search global 'core-docs' namespace
          const coreDocsVectorStore = new PineconeStore(this.embeddings, {
              pineconeIndex: this.pinecone.Index(pineconeIndex),
              namespace: 'core-docs'
          });
          const coreDocsSearchPromise = coreDocsVectorStore.similaritySearch(prompt, 5);
          
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
        const historyMessages = this.formatConversationHistory(conversationHistory);
        
        // Build comprehensive messages array with system prompt, history, and current context
        const messages = [
          {
            role: "system",
            content: `You are a helpful AI assistant specialized in software development. 

You have access to comprehensive information about the user's application:
- Code repository with source files and implementation details
- API specification with endpoints and schemas
- Root documentation covering plugins and core configuration files
- Module-specific documentation for each business component

When answering questions:
1. Use the provided context when relevant and cite specific sources
2. Integrate information from multiple sources when helpful
3. Maintain conversation continuity by referencing previous exchanges when relevant
4. If the question can't be answered from the context, use your general knowledge but make it clear
5. Prioritize recent documentation and module-specific information for detailed questions
6. Always provide accurate, helpful, and concise responses

The context is organized by sections (API SPECIFICATION, ROOT DOCUMENTATION, MODULE DOCUMENTATION, CODE REPOSITORY) to help you understand the source of information.

${conversationHistory.length > 0 ? `This conversation has ${conversationHistory.length} previous exchanges. Use them for context continuity.` : 'This is the start of a new conversation.'}`
          },
          ...historyMessages, // Include conversation history
          {
            role: "user",
            content: `I have a question about my application: "${prompt}"\n\nHere is the relevant information from my application documentation and codebase:\n\n${context}`
          }
        ];
        
        console.log(`[${new Date().toISOString()}] 🔍 CONVERSATION CONTEXT: Built ${messages.length} messages for LLM (1 system + ${historyMessages.length} history + 1 current)`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Messages prepared for LLM invoke with conversation history.`);
        
        // Try to generate a response
        let retries = 0;
        let success = false;
        let response;
        while (!success && retries < this.maxRetries) {
          if (await this.checkRateLimit()) {
            console.log(`[${new Date().toISOString()}] [DEBUG] Starting LLM invoke loop. MaxRetries: ${this.maxRetries}`);
            try {
              const result = await this.llm.invoke(messages);
              response = result.content;
              success = true;
              console.log(`[${new Date().toISOString()}] [DEBUG] LLM invoke successful.`);
            } catch (error) {
              if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit'))) {
                retries++;
                console.warn(`[${new Date().toISOString()}] Rate limit hit during generation, retry ${retries}/${this.maxRetries}`);
                await this.waitWithBackoff(retries);
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
          throw new Error(`Failed to generate response after ${this.maxRetries} retries due to rate limits`);
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
      const historyMessages = this.formatConversationHistory(conversationHistory);
      
      // Build messages with conversation history
      const messages = [
        {
          role: "system",
          content: `You are a helpful AI assistant specialized in software development. Provide accurate, helpful, and concise responses.
          
${conversationHistory.length > 0 ? `This conversation has ${conversationHistory.length} previous exchanges. Use them for context continuity when relevant.` : 'This is the start of a new conversation.'}`
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

      while (!success && retries < this.maxRetries) {
        if (await this.checkRateLimit()) {
          try {
            const result = await this.llm.invoke(messages);
            response = result.content;
            success = true;
          } catch (error) {
            if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit'))) {
              retries++;
              console.warn(`[${new Date().toISOString()}] Rate limit hit during standard generation, retry ${retries}/${this.maxRetries}`);
              await this.waitWithBackoff(retries);
            } else {
              throw error;
            }
          }
        } else {
          await this.waitWithBackoff(retries);
        }
      }

      if (!success) {
        throw new Error(`Failed to generate standard response after ${this.maxRetries} retries due to rate limits`);
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

  // Helper method to determine file type from file path
  getFileType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    const codeExtensions = {
      js: 'JavaScript',
      jsx: 'React',
      ts: 'TypeScript',
      tsx: 'React TypeScript',
      py: 'Python',
      java: 'Java',
      rb: 'Ruby',
      php: 'PHP',
      c: 'C',
      cpp: 'C++',
      cs: 'C#',
      go: 'Go',
      rs: 'Rust',
      swift: 'Swift',
      kt: 'Kotlin',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      json: 'JSON',
      md: 'Markdown',
      sql: 'SQL',
      sh: 'Shell',
      bat: 'Batch',
      ps1: 'PowerShell',
      yaml: 'YAML',
      yml: 'YAML',
      xml: 'XML'
    };

    return codeExtensions[extension] || 'Unknown';
  }

  // Helper method to sanitize document IDs
  sanitizeId(input) {
    // Remove special characters and truncate if necessary
    return input.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
  }

  // Helper method to emit RAG status updates for monitoring
  emitRagStatus(status, details = {}) {
    // Always log the status update
    console.log(`[${new Date().toISOString()}] 🔍 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : '');
    
    // Try to emit to the event bus if available
    try {
      // First try the instance event bus
      if (this.eventBus) {
        this.eventBus.emit('ragStatusUpdate', {
          component: 'aiLangchainAdapter',
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
          component: 'aiLangchainAdapter',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
      }
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Failed to emit RAG status update: ${error.message}`);
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

  // Queue system for rate limiting
  startQueueProcessor() {
    // Process queue every 5 seconds
    setInterval(() => this.processQueue(), 5000);
    console.log(`[${new Date().toISOString()}] AI request queue processor started`);
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    console.log(`[${new Date().toISOString()}] Processing AI request queue, ${this.requestQueue.length} items pending`);

    try {
      // Get the next request from the queue
      const request = this.requestQueue.shift();

      // Check if we're within rate limits
      if (await this.checkRateLimit()) {
        console.log(`[${new Date().toISOString()}] Processing queued request: ${request.id}`);

        try {
          // Execute the request
          const result = await request.execute();

          // Resolve the promise with the result
          request.resolve(result);
        } catch (error) {
          // If the request fails, reject the promise
          request.reject(error);
        }
      } else {
        // If we're rate limited, put the request back at the front of the queue
        console.log(`[${new Date().toISOString()}] Rate limited, requeueing request: ${request.id}`);
        this.requestQueue.unshift(request);

        // Wait before processing more
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } finally {
      this.isProcessingQueue = false;

      // If there are more items in the queue, process them
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  // Add a request to the queue
  queueRequest(execute) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(2, 10);

      this.requestQueue.push({
        id: requestId,
        execute,
        resolve,
        reject,
        timestamp: new Date().toISOString()
      });

      console.log(`[${new Date().toISOString()}] Added request ${requestId} to queue, queue length: ${this.requestQueue.length}`);

      // Trigger queue processing if not already running
      if (!this.isProcessingQueue) {
        setTimeout(() => this.processQueue(), 100);
      }
    });
  }
}

module.exports = AILangchainAdapter;