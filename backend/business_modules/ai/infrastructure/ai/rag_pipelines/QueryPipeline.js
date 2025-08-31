const { PineconeStore } = require('@langchain/pinecone');
const VectorSearchStrategy = require('../strategies/VectorSearchStrategy');
const AIUtils = require('../utils/AIUtils');
const PromptSelector = require('../prompts/index').PromptSelector;
const PromptConfig = require('../prompts/promptConfig');

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
    
    console.log(`[${new Date().toISOString()}] QueryPipeline initialized for comprehensive RAG processing`);
  }

  /**
   * Main method that handles the complete RAG pipeline for responding to prompts
   */
  async respondToPrompt(userId, conversationId, prompt, conversationHistory = [], vectorStore = null) {
    try {
      console.log(`[${new Date().toISOString()}] QueryPipeline processing prompt for user ${userId}`);
      
      // Use provided vectorStore or fall back to instance vectorStore
      const activeVectorStore = vectorStore || this.vectorStore;
      
      // If no vectorStore available, indicate to use standard response
      if (!activeVectorStore || !this.pinecone) {
        console.warn(`[${new Date().toISOString()}] Vector database not available, indicating standard response should be used`);
        return {
          success: true,
          useStandardResponse: true,
          reason: 'Vector database not available'
        };
      }

      // Perform intelligent vector search
      const searchResults = await this.performIntelligentVectorSearch(prompt, activeVectorStore);
      
      if (searchResults.documents.length === 0) {
        console.log(`[${new Date().toISOString()}] No relevant documents found, indicating standard response should be used`);
        return {
          success: true,
          useStandardResponse: true,
          reason: 'No relevant documents found'
        };
      }

      // Analyze and format context
      const contextData = this.analyzeAndFormatContext(searchResults.documents);
      
      // Generate LLM response with context
      const response = await this.generateLLMResponse(prompt, contextData, conversationHistory);
      
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

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in QueryPipeline.respondToPrompt:`, error.message);
      return {
        success: false,
        response: "I encountered an issue while processing your request. Please try again shortly.",
        conversationId,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Performs intelligent vector search with multiple strategies and fallbacks
   */
  async performIntelligentVectorSearch(prompt, vectorStore) {
    console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Running intelligent similarity search with semantic filtering`);
    
    // Determine search strategy based on prompt analysis
    const searchStrategy = VectorSearchStrategy.determineSearchStrategy(prompt);
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH STRATEGY: User=${searchStrategy.userResults} docs, Core=${searchStrategy.coreResults} docs`);
    console.log(`[${new Date().toISOString()}] 🧠 SEARCH FILTERS: User=${JSON.stringify(searchStrategy.userFilters)}, Core=${JSON.stringify(searchStrategy.coreFilters)}`);
    
    const VECTOR_SEARCH_TIMEOUT = 30000; // 30 seconds
    const pineconeIndex = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
    
    // Search user-specific namespace with intelligent filtering (resilient to filter errors)
    const userSearchPromise = (async () => {
      try {
        if (searchStrategy.userFilters && Object.keys(searchStrategy.userFilters).length > 0) {
          console.log(`[${new Date().toISOString()}] 🔍 USER SEARCH: Attempting filtered search with:`, JSON.stringify(searchStrategy.userFilters));
          return await vectorStore.similaritySearch(
            prompt, 
            searchStrategy.userResults,
            { filter: searchStrategy.userFilters }
          );
        } else {
          return await vectorStore.similaritySearch(prompt, searchStrategy.userResults);
        }
      } catch (filterError) {
        console.log(`[${new Date().toISOString()}] ⚠️ User search filter error (${filterError.message}), retrying without filters`);
        return await vectorStore.similaritySearch(prompt, searchStrategy.userResults);
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
      // Retrieve documents from both namespaces
      const [userDocs, coreDocs] = await Promise.race([
          Promise.all([userSearchPromise, coreDocsSearchPromise]),
          timeoutPromise
      ]);
      const similarDocuments = [...userDocs, ...coreDocs];

      // Log retrieved documents for debugging
      similarDocuments.forEach((doc, i) => {
        console.log(`[DEBUG] Chunk ${i}: ${doc.metadata.source || 'Unknown'} | ${doc.pageContent.substring(0, 200)}`);
      });
      console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Retrieved ${similarDocuments.length} documents from vector store`);
      
      if (similarDocuments.length > 0) {
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: First document metadata:`, 
          JSON.stringify(similarDocuments[0].metadata, null, 2));
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: First document content preview: ${similarDocuments[0].pageContent.substring(0, 100)}...`);
        
        // Log all document sources for better debugging
        console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: All retrieved document sources:`);
        similarDocuments.forEach((doc, index) => {
          console.log(`[${new Date().toISOString()}]   ${index + 1}. ${doc.metadata.source || 'Unknown'} (${doc.pageContent.length} chars)`);
        });
        
        // Emit retrieval success status
        this.emitRagStatus('retrieval_success', {
          userId: this.userId,
          conversationId: '',
          documentsFound: similarDocuments.length,
          sources: similarDocuments.map(doc => doc.metadata.source || 'Unknown'),
          sourceTypes: {
            apiSpec: similarDocuments.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
            githubCode: similarDocuments.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
          },
          firstDocContentPreview: similarDocuments[0].pageContent.substring(0, 100) + '...'
        });
      }
      
      return { documents: similarDocuments };

    } catch (timeoutError) {
      console.log(`[${new Date().toISOString()}] ⚠️ Vector search timed out`);
      this.emitRagStatus('retrieval_timeout_fallback', {
        userId: this.userId,
        conversationId: '',
        error: timeoutError.message,
        query: prompt.substring(0, 100)
      });
      throw timeoutError;
    }
  }

  /**
   * Analyzes retrieved documents and formats them into structured context
   */
  analyzeAndFormatContext(documents) {
    console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Found ${documents.length} relevant documents`);
    console.log(`[${new Date().toISOString()}] 📚 MULTI-SOURCE RAG CONTEXT FROM VECTOR SEARCH:`);
    console.log(`[${new Date().toISOString()}] 🎯 TOTAL CONTEXT: ${documents.length} chunks retrieved from vector database ready for AI processing`);

    // Analyze and log source composition
    const sourceAnalysis = {
      apiSpec: 0,
      rootDocumentation: 0,
      moduleDocumentation: 0,
      githubRepo: 0,
      total: documents.length
    };
    
    documents.forEach(doc => {
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
    const moduleDocsUsed = documents
      .filter(doc => doc.metadata.type === 'module_documentation')
      .map(doc => doc.metadata.module)
      .filter((module, index, arr) => arr.indexOf(module) === index);
    
    if (moduleDocsUsed.length > 0) {
      console.log(`[${new Date().toISOString()}] 📁 Module docs included: ${moduleDocsUsed.join(', ')}`);
    }
    
    // Log GitHub repositories being used
    const reposUsed = documents
      .filter(doc => doc.metadata.repoId)
      .map(doc => `${doc.metadata.githubOwner}/${doc.metadata.repoId}`)
      .filter((repo, index, arr) => arr.indexOf(repo) === index);
    
    if (reposUsed.length > 0) {
      console.log(`[${new Date().toISOString()}] 💻 GitHub repos referenced: ${reposUsed.join(', ')}`);
    }
    
    // Format the context from retrieved documents
    const context = documents.map((doc, index) => {
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
    
    console.log(`[${new Date().toISOString()}] 🔍 RAG DEBUG: Created context with ${context.length} characters from ${documents.length} documents`);
    
    const sourcesBreakdown = {
      hasApiSpec: sourceAnalysis.apiSpec > 0,
      hasRootDocs: sourceAnalysis.rootDocumentation > 0,
      hasModuleDocs: sourceAnalysis.moduleDocumentation > 0,
      hasGithubCode: sourceAnalysis.githubRepo > 0
    };
    
    return {
      context,
      sourceAnalysis,
      sourcesBreakdown,
      moduleDocsUsed,
      reposUsed
    };
  }

  /**
   * Generates LLM response using the provided context
   */
  async generateLLMResponse(prompt, contextData, conversationHistory = []) {
    // Format conversation history for context continuity
    const historyMessages = AIUtils.formatConversationHistory(conversationHistory);
    
    // Analyze context sources for intelligent prompt selection
    const contextSources = {
      apiSpec: contextData.sourceAnalysis.apiSpec > 0,
      rootDocumentation: contextData.sourceAnalysis.rootDocumentation > 0,
      moduleDocumentation: contextData.sourceAnalysis.moduleDocumentation > 0,
      code: contextData.sourceAnalysis.githubRepo > 0
    };

    // Select appropriate system prompt based on context and question
    const systemPrompt = PromptSelector.selectPrompt({
      hasRagContext: true,
      conversationCount: conversationHistory.length,
      question: prompt,
      contextSources: contextSources,
      mode: 'auto'
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
        content: `I have a question: "${prompt}"\n\nHere is the relevant information:\n\n${contextData.context}`
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
    
    // Generate response with retry logic
    return await this.generateResponseWithRetry(messages);
  }

  /**
   * Generates response with retry logic for rate limiting
   */
  async generateResponseWithRetry(messages) {
    let retries = 0;
    let success = false;
    let response;
    
    while (!success && retries < this.requestQueue.maxRetries) {
      if (await this.requestQueue.checkRateLimit()) {
        try {
          const result = await this.llm.invoke(messages);
          response = result.content;
          success = true;
          console.log(`[${new Date().toISOString()}] LLM invoke successful`);
        } catch (error) {
          if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit'))) {
            retries++;
            console.warn(`[${new Date().toISOString()}] Rate limit hit during generation, retry ${retries}/${this.requestQueue.maxRetries}`);
            await this.requestQueue.waitWithBackoff(retries);
          } else {
            // Log the error and throw it for proper handling
            console.error(`[${new Date().toISOString()}] Failed to respond to prompt:`, error);
            throw error;
          }
        }
      } else {
        // Wait if we're rate limited
        await this.requestQueue.waitWithBackoff(retries);
      }
    }
    
    if (!success) {
      // If we couldn't generate a response after all retries
      throw new Error(`Failed to generate response after ${this.requestQueue.maxRetries} retries due to rate limits`);
    }
    
    return { content: response };
  }

  /**
   * Generates a standard response without RAG context
   */
  async generateStandardResponse(prompt, conversationId, conversationHistory = []) {
    try {
      // Format conversation history for continuity even in standard responses
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

      // Generate response with retry logic
      const result = await this.generateResponseWithRetry(messages);

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

  /**
   * Emits RAG status events for monitoring
   */
  emitRagStatus(status, data) {
    if (this.eventBus && this.eventBus.emit) {
      this.eventBus.emit('ragStatus', { status, ...data });
      console.log(`[${new Date().toISOString()}] Emitted RAG status: ${status}`);
    }
  }
}

module.exports = QueryPipeline;
