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
const QueryPipeline = require('./rag_pipelines/QueryPipeline');

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
        
        // Initialize QueryPipeline with the new vector store for RAG operations
        this.queryPipeline = new QueryPipeline({
          embeddings: this.embeddings,
          pinecone: this.pinecone,
          llm: this.llm,
          eventBus: this.eventBus,
          requestQueue: this.requestQueue,
          coreDocsIndexer: this.coreDocsIndexer,
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
        // Delegate to QueryPipeline for RAG processing
        const result = await this.queryPipeline.respondToPrompt(
          userId, 
          conversationId, 
          prompt, 
          conversationHistory, 
          this.vectorStore
        );
        
        // If QueryPipeline indicates to use standard response, fall back
        if (result.useStandardResponse) {
          return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
        }
        
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
}

module.exports = AILangchainAdapter;