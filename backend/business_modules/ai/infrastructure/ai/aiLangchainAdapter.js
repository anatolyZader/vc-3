// aiLangchainAdapter.js
"use strict";
/* eslint-disable no-unused-vars */

const IAIPort = require('../../domain/ports/IAIPort');
const Bottleneck = require("bottleneck");
const { GithubRepoLoader } = require("@langchain/community/document_loaders/web/github");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');


class AILangchainAdapter extends IAIPort {
  // Automate indexing of httpApiSpec.json and app_wiki.txt into Pinecone
  async indexCoreDocsToPinecone() {
    // Load API spec
    const apiSpecChunk = await this.loadApiSpec('httpApiSpec.json');
    // Load wiki file
    const wikiChunk = await this.loadWiki('app_wiki.txt');

    const documents = [];
    if (apiSpecChunk) {
      // Parse JSON for targeted chunking
      let apiSpecJson;
      try {
        apiSpecJson = JSON.parse(apiSpecChunk.pageContent);
      } catch (e) {
        apiSpecJson = null;
      }
      if (apiSpecJson) {
        // Tags chunk
        if (Array.isArray(apiSpecJson.tags)) {
          const tagsText = apiSpecJson.tags.map(tag => `- ${tag.name}: ${tag.description}`).join('\n');
          documents.push({
            pageContent: `API Tags:\n${tagsText}`,
            metadata: { source: 'httpApiSpec.json', type: 'apiSpecTags' }
          });
        }
        // Endpoints chunk
        if (apiSpecJson.paths && typeof apiSpecJson.paths === 'object') {
          const endpointsText = Object.entries(apiSpecJson.paths).map(([path, methods]) => {
            return Object.entries(methods).map(([method, details]) => {
              const tagList = details.tags && details.tags.length ? ` [tags: ${details.tags.join(', ')}]` : '';
              return `- ${method.toUpperCase()} ${path}${tagList}`;
            }).join('\n');
          }).join('\n');
          documents.push({
            pageContent: `API Endpoints:\n${endpointsText}`,
            metadata: { source: 'httpApiSpec.json', type: 'apiSpecEndpoints' }
          });
        }
        // Info chunk
        if (apiSpecJson.info) {
          documents.push({
            pageContent: `API Info:\nTitle: ${apiSpecJson.info.title}\nDescription: ${apiSpecJson.info.description}\nVersion: ${apiSpecJson.info.version}`,
            metadata: { source: 'httpApiSpec.json', type: 'apiSpecInfo' }
          });
        }
      }
      // Add full spec as fallback
      documents.push({
        pageContent: apiSpecChunk.pageContent,
        metadata: { source: 'httpApiSpec.json', type: 'apiSpecFull' }
      });
    }
    if (wikiChunk) {
      documents.push({
        pageContent: wikiChunk.pageContent,
        metadata: { source: 'app_wiki.txt', type: 'wiki' }
      });
    }

    // Use smart splitter for chunking (for wiki only)
    const wikiDocs = documents.filter(doc => doc.metadata.type === 'wiki');
    let splittedDocs = [];
    if (wikiDocs.length > 0) {
      const splitter = this.createSmartSplitter(wikiDocs);
      splittedDocs = await splitter.splitDocuments(wikiDocs);
    }
    // Add all API spec chunks (no further splitting)
    splittedDocs = splittedDocs.concat(documents.filter(doc => doc.metadata.source === 'httpApiSpec.json'));

    // Generate unique IDs for Pinecone
    const userId = this.userId || 'system';
    const repoId = 'core-docs';
    const documentIds = splittedDocs.map((doc, index) =>
      `${userId}_${repoId}_${this.sanitizeId(doc.metadata.type || doc.metadata.source || 'unknown')}_chunk_${index}`
    );

    // Store in Pinecone
    if (this.vectorStore) {
      await this.vectorStore.addDocuments(splittedDocs, { ids: documentIds });
      console.log(`[${new Date().toISOString()}] ✅ Indexed core docs (API spec & wiki) to Pinecone: ${splittedDocs.length} chunks`);
    } else {
      console.warn(`[${new Date().toISOString()}] ⚠️ Pinecone vectorStore not initialized, cannot index core docs.`);
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

  // Helper to load wiki file from backend root
  async loadWiki(filePath) {
    const fs = require('fs');
    const path = require('path');
    // Always resolve from backend root
    const backendRoot = path.resolve(__dirname, '../../../..');
    const absPath = path.resolve(backendRoot, filePath);
    try {
      const content = await fs.promises.readFile(absPath, 'utf8');
      return {
        pageContent: content,
        metadata: { source: 'app_wiki.txt', type: 'wiki' }
      };
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] Could not load app wiki file at ${absPath}: ${err.message}`);
      return null;
    }
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

    try {
      // Check if we have the necessary clients initialized
      if (!this.pinecone || !this.embeddings) {
        throw new Error('Vector database or embeddings model not initialized. Please check your API keys.');
      }

      // 1. INDEXING :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

      // Load: Document Loaders.
      console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Loading repository from GitHub...`);
      
      // Extract repository information with enhanced robustness and fallbacks
      // First, try to extract from various possible structures in repoData
      let githubOwner, repoName, repoUrl, repoBranch;

      this.emitRagStatus('extracting_repo_info', {
        userId,
        repoId,
        repoData: repoData ? Object.keys(repoData) : 'null'
      });

      // Handle various payload structures that might come from different sources
      if (repoData) {
        if (repoData.repository) {
          // Handle webhook or API response format
          githubOwner = repoData.repository.owner?.login || 
                       repoData.repository.owner?.name || 
                       repoData.repository.owner;
          repoName = repoData.repository.name;
          repoUrl = repoData.repository.html_url || 
                   repoData.repository.url || 
                   `https://github.com/${githubOwner}/${repoName}`;
          repoBranch = repoData.repository.default_branch || "main";
          this.emitRagStatus('extracted_repo_webhook_format', { githubOwner, repoName, repoUrl, repoBranch });
        } else if (repoData.repo) {
          // Handle simplified custom format
          githubOwner = repoData.repo.owner || repoData.githubOwner;
          repoName = repoData.repo.name;
          repoUrl = repoData.repo.url || `https://github.com/${githubOwner}/${repoName}`;
          repoBranch = repoData.repo.branch || repoData.branch || "main";
          this.emitRagStatus('extracted_repo_custom_format', { githubOwner, repoName, repoUrl, repoBranch });
        } else {
          // Handle flat structure
          githubOwner = repoData.githubOwner || repoData.owner;
          repoName = repoData.repoName || repoData.name;
          repoUrl = repoData.repoUrl || repoData.url;
          repoBranch = repoData.branch || repoData.defaultBranch || "main";
          this.emitRagStatus('extracted_repo_flat_format', { githubOwner, repoName, repoUrl, repoBranch });
        }
      }

      // If we still don't have the owner/name, try to extract from repoId
      if (!githubOwner || !repoName) {
        if (repoId && repoId.includes('/')) {
          const parts = repoId.split('/');
          githubOwner = githubOwner || parts[0];
          repoName = repoName || parts[1];
        } else {
          // Last resort fallbacks
          githubOwner = githubOwner || userId || 'unknown';
          repoName = repoName || repoId || 'unknown-repo';
        }
      }

      // Ensure we have a valid URL
      if (!repoUrl || !repoUrl.includes('github.com')) {
        repoUrl = `https://github.com/${githubOwner}/${repoName}`;
      }

      // Validate the extracted data
      if (!githubOwner || !repoName || !repoUrl) {
        console.error(`[${new Date().toISOString()}] 📥 RAG REPO: Failed to extract required repo information from payload`);
        throw new Error('Invalid repository data: Could not determine owner or repository name');
      }

      console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Extracted repository data:`);
      console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Owner: ${githubOwner}`);
      console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Name: ${repoName}`);
      console.log(`[${new Date().toISOString()}] 📥 RAG REPO: URL: ${repoUrl}`);
      console.log(`[${new Date().toISOString()}] 📥 RAG REPO: Branch: ${repoBranch}`);

      this.emitRagStatus('loading_repo', {
        userId,
        repoUrl,
        branch: repoBranch,
        githubOwner,
        repoName
      });

      const repoLoader = new GithubRepoLoader(
        repoUrl,
        {
          branch: repoBranch,
          recursive: true,
          unknown: "warn",
          maxConcurrency: 3,
          maxRetries: 2,
          ignorePaths: [
            "node_modules/**",
            ".git/**",
            "dist/**",
            "build/**",
            "*.min.js",
            "package-lock.json"
          ],
          accessToken: process.env.GITHUB_TOKEN
        }
      );

      const loadedRepo = [];
      let loadCount = 0;

      console.log(`[${new Date().toISOString()}] Starting document loading...`);
      this.emitRagStatus('loading_documents', {
        userId,
        repoId,
        repoUrl
      });

      for await (const doc of repoLoader.loadAsStream()) {
        loadedRepo.push(doc);
        loadCount++;

        // Progress logging
        if (loadCount % 10 === 0) {
          console.log(`[${new Date().toISOString()}] Loaded ${loadCount} documents...`);
          
          // Emit progress update every 10 documents
          if (loadCount % 50 === 0) {
            this.emitRagStatus('loading_progress', {
              userId,
              repoId,
              documentsLoaded: loadCount
            });
          }
        }
      }

      console.log(`[${new Date().toISOString()}] ✅ Loaded ${loadedRepo.length} documents from repository`);
      this.emitRagStatus('documents_loaded', {
        userId,
        repoId,
        documentsLoaded: loadedRepo.length,
        firstDocumentType: loadedRepo.length > 0 ? this.getFileType(loadedRepo[0].metadata.source || '') : 'unknown'
      });

      if (loadedRepo.length === 0) {
        throw new Error(`No documents loaded from repository ${repoUrl}. Check repository access and branch name.`);
      }

      // Split: Text splitters
      console.log(`[${new Date().toISOString()}] Splitting documents into chunks...`);
      this.emitRagStatus('splitting_documents', {
        userId,
        repoId,
        documentCount: loadedRepo.length
      });

      // Smart splitter selection based on repository content
      const repoSplitter = this.createSmartSplitter(loadedRepo);

      // Split documents into chunks
      const splittedRepo = await repoSplitter.splitDocuments(loadedRepo);

      console.log(`[${new Date().toISOString()}] ✅ Split into ${splittedRepo.length} chunks`);
      this.emitRagStatus('documents_split', {
        userId,
        repoId,
        chunksCreated: splittedRepo.length,
        averageChunkSize: splittedRepo.length > 0 
          ? Math.round(splittedRepo.reduce((sum, doc) => sum + doc.pageContent.length, 0) / splittedRepo.length) 
          : 0
      });

      // Store: VectorStore and Embeddings model.
      console.log(`[${new Date().toISOString()}] Storing embeddings in vector database...`);
      this.emitRagStatus('storing_embeddings', {
        userId,
        repoId,
        chunkCount: splittedRepo.length,
        pineconeIndex: process.env.PINECONE_INDEX_NAME || 'eventstorm-index',
        namespace: this.userId
      });

      // Add comprehensive metadata to chunks for better tracking
      const documentsWithMetadata = splittedRepo.map((doc, index) => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          userId: userId, // Ensure userId (application's internal ID) is correctly associated
          repoId: repoId,
          repoUrl: repoUrl,
          branch: repoBranch,
          githubOwner: githubOwner, // Store GitHub owner in metadata
          chunkIndex: index,
          totalChunks: splittedRepo.length,
          processedAt: new Date().toISOString(), // Use current timestamp
          processedBy: 'AI-Service', // More generic identifier
          fileType: this.getFileType(doc.metadata.source || ''),
          chunkSize: doc.pageContent.length
        }
      }));

      // Generate unique IDs for the documents to avoid duplicates
      const documentIds = documentsWithMetadata.map((doc, index) =>
        `${userId}_${repoId}_${this.sanitizeId(doc.metadata.source || 'unknown')}_chunk_${index}`
      );

      // Store in vector database with batch processing for better performance
      const batchSize = 100; // Further increased batch size for higher throughput (watch for 429 errors)
      let storedCount = 0;

      for (let i = 0; i < documentsWithMetadata.length; i += batchSize) {
        let retries = 0;
        let success = false;
        let last429 = false;

        while (!success && retries < this.maxRetries) {
          if (await this.checkRateLimit()) {
            try {
              const batch = documentsWithMetadata.slice(i, i + batchSize);
              const batchIds = documentIds.slice(i, i + batchSize);

              await this.vectorStore.addDocuments(batch, { ids: batchIds });
              storedCount += batch.length;

              console.log(`[${new Date().toISOString()}] Stored batch ${Math.ceil((i + 1) / batchSize)} - ${storedCount}/${documentsWithMetadata.length} chunks`);
              success = true;
              last429 = false;
            } catch (error) {
              if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit'))) {
                retries++;
                last429 = true;
                console.warn(`[${new Date().toISOString()}] Pinecone rate limit (429) hit, retry ${retries}/${this.maxRetries}`);
                this.emitRagStatus('pinecone_rate_limit', {
                  userId,
                  repoId,
                  error: error.message,
                  batch: Math.ceil((i + 1) / batchSize),
                  storedCount,
                  batchSize,
                  maxRequestsPerMinute: this.maxRequestsPerMinute,
                  suggestion: 'If you see repeated 429 errors, consider reducing batch size or requesting a quota increase from Pinecone.'
                });
                await this.waitWithBackoff(retries);
              } else {
                throw error; // Re-throw if it's not a rate limit issue
              }
            }
          } else {
            // Wait for rate limit window to reset
            await this.waitWithBackoff(retries);
          }
        }

        if (!success) {
          console.error(`[${new Date().toISOString()}] Failed to store batch after ${this.maxRetries} retries`);
          if (last429) {
            this.emitRagStatus('pinecone_rate_limit_failed', {
              userId,
              repoId,
              batch: Math.ceil((i + 1) / batchSize),
              storedCount,
              batchSize,
              maxRequestsPerMinute: this.maxRequestsPerMinute,
              error: 'Persistent 429 errors from Pinecone. Consider reducing batch size or requesting a quota increase.'
            });
          }
        }
      }

      console.log(`[${new Date().toISOString()}] ✅ Successfully stored ${storedCount}/${documentsWithMetadata.length} document chunks in vector database`);

      // Emit event for RAG status update
      if (this.eventBus) {
        this.eventBus.emit('ragStatusUpdate', {
          userId: userId,
          repoId: repoId,
          status: 'completed',
          documentsLoaded: loadedRepo.length,
          chunksCreated: splittedRepo.length,
          chunksStored: storedCount,
          processedAt: new Date().toISOString()
        });
      }

      return {
        success: true,
        userId: userId,
        repoId: repoId,
        repoUrl: repoUrl,
        branch: repoBranch,
        githubOwner: githubOwner,
        documentsLoaded: loadedRepo.length,
        chunksCreated: splittedRepo.length,
        chunksStored: storedCount,
        processedAt: new Date().toISOString(), // Use current timestamp
        processedBy: 'AI-Service'
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to process repository ${repoId}:`, error.message);
      
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

  async respondToPrompt(userId, conversationId, prompt) {
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
        // Load wiki file
        const wikiText = await this.loadWiki('app_wiki.txt');
            // Build context: code chunks + wiki + API spec summary
            let contextIntro = '';
            if (typeof wikiText === 'string') contextIntro += wikiText + '\n\n';
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
          
          return await this.generateStandardResponse(prompt, conversationId);
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
        try {
          // Find relevant documents from vector database
          console.log(`[${new Date().toISOString()}] [DEBUG] VectorStore or Pinecone not available in respondToPrompt.`);
          console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Running similarity search (no filter, single-user mode)`);
          // Retrieve more chunks for richer context
          similarDocuments = await this.vectorStore.similaritySearch(prompt, 15);
          // Log the first few chunks for debugging
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
          return await this.generateStandardResponse(prompt, conversationId);
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
          
          return await this.generateStandardResponse(prompt, conversationId);
        }

        // Process the retrieved documents
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Found ${similarDocuments.length} relevant documents`);

        // Load plain-language wiki file and add to context
        const wikiPath = process.env.APP_WIKI_PATH || './app_wiki.txt';
        const wikiChunk = await this.loadWiki(wikiPath);
        if (wikiChunk) {
          similarDocuments.unshift(wikiChunk); // Add at the start for priority
          console.log(`[${new Date().toISOString()}] [DEBUG] Added app wiki file to context: ${wikiPath}`);
        } else {
          console.log(`[${new Date().toISOString()}] [DEBUG] No app wiki file found at: ${wikiPath}`);
        }

        // Load API spec file and add to context
        const apiSpecPath = process.env.APP_API_SPEC_PATH || './httpApiSpec.json';
        const apiSpecChunk = await this.loadApiSpec(apiSpecPath);
        if (apiSpecChunk) {
          similarDocuments.unshift(apiSpecChunk); // Add at the start for priority
          console.log(`[${new Date().toISOString()}] [DEBUG] Added API spec file to context: ${apiSpecPath}`);
        } else {
          console.log(`[${new Date().toISOString()}] [DEBUG] No API spec file found at: ${apiSpecPath}`);
        }

        // Format the context from retrieved documents (now includes wiki)
        console.log(`[${new Date().toISOString()}] [DEBUG] Formatting context from retrieved documents.`);
            const context = similarDocuments.map(doc => {
          const source = doc.metadata.source || 'Unknown source';
          return `File: ${source}\n${doc.pageContent.substring(0, 500)}...`;
        }).join('\n\n');
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Created context with ${context.length} characters from ${similarDocuments.length} documents`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Context formatted. Length: ${context.length}`);
        const messages = [
          {
            role: "system",
            content: `You are a helpful AI assistant specialized in software development. \nYou have access to the user's code repository and a plain-language wiki style explanation of the app. \nAnswer questions based on the context provided when possible.\nIf the question can't be answered from the context, use your general knowledge but make it clear.\nAlways provide accurate, helpful, and concise responses.`
          },
          {
            role: "user",
            content: `I have a question about my code repository: "${prompt}"\n\nHere are the most relevant parts of my codebase and explanation:\n${context}`
          }
        ];
        console.log(`[${new Date().toISOString()}] [DEBUG] Messages prepared for LLM invoke.`);
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
          console.log(`[${new Date().toISOString()}] [DEBUG] LLM invoke failed after max retries.`);

        // Log the full context size to help diagnose if embedding usage is working
            const contextSize = (typeof finalContext !== 'undefined' ? finalContext.length : (typeof context !== 'undefined' ? context.length : contextIntro.length));
        console.log(`[${new Date().toISOString()}] [DEBUG] Response generated. Context size: ${context.length}`);
        console.log(`[${new Date().toISOString()}] [DEBUG] Returning response object from respondToPrompt.`);
        
        return {
          success: true,
          response,
          conversationId,
          timestamp: new Date().toISOString(),
          ragEnabled: true,
          contextSize
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
  async generateStandardResponse(prompt, conversationId) {
    try {
      // Simple prompt without context
      const messages = [
        {
          role: "system",
          content: "You are a helpful AI assistant specialized in software development. Provide accurate, helpful, and concise responses."
        },
        {
          role: "user",
          content: prompt
        }
      ];

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

      console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Generated standard response without code context for conversation ${conversationId}`);
      
      return {
        success: true,
        response,
        conversationId,
        timestamp: new Date().toISOString(),
        sourcesUsed: 0,
        ragEnabled: false
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

    // Analyze documents to determine predominant language
    const languageCount = {};

    documents.forEach(doc => {
      const extension = (doc.metadata.source || '').split('.').pop().toLowerCase();
      if (!extension) return;

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

    // Find the most common language
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

    console.log(`[${new Date().toISOString()}] Using ${predominantLanguage} code splitter for document processing`);

    // Create a language-specific splitter using the new API
    return RecursiveCharacterTextSplitter.fromLanguage(language, {
      chunkSize,
      chunkOverlap
    });
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