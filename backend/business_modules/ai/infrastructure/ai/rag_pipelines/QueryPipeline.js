// QueryPipeline.js
"use strict";

const { PineconeStore } = require('@langchain/pinecone');

/**
 * QueryPipeline - Lightweight RAG Operations
 * 
 * Responsibilities:
 * - Retrieving relevant documents from vector database
 * - Generating responses using retrieved context
 * - Managing conversation history integration
 * - Handling fallback responses when vector search fails
 * 
 * This pipeline handles the lightweight operations that run on every user query.
 * It assumes data preparation has already been done by DataPreparationPipeline.
 */
class QueryPipeline {
  constructor(options = {}) {
    // Store dependencies passed from the adapter
    this.embeddings = options.embeddings;
    this.pinecone = options.pinecone;
    this.llm = options.llm;
    this.eventBus = options.eventBus;
    this.maxRetries = options.maxRetries || 10;
    
    console.log(`[${new Date().toISOString()}] QueryPipeline initialized`);
  }

  /**
   * Main entry point for responding to user prompts
   */
  async respondToPrompt(userId, conversationId, prompt, conversationHistory = []) {
    console.log(`[${new Date().toISOString()}] 🔍 QUERY: Processing AI request for conversation ${conversationId}`);

    try {
      // Load API spec and format summary for additional context
      const apiSpec = await this.loadApiSpec('httpApiSpec.json');
      const apiSpecSummary = this.formatApiSpecSummary(apiSpec);
      
      // Build context: code chunks + API spec summary
      let contextIntro = '';
      if (typeof apiSpecSummary === 'string') contextIntro += apiSpecSummary + '\n\n';

      // If no vectorStore or pinecone client, fall back to standard mode
      if (!this.pinecone) {
        console.warn(`[${new Date().toISOString()}] 🔍 QUERY: Vector database not available, falling back to standard model response.`);
        
        this.emitRagStatus('retrieval_disabled', {
          userId: userId,
          conversationId: conversationId,
          reason: 'Vector database not available'
        });
        
        return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
      }

      console.log(`[${new Date().toISOString()}] 🔍 QUERY: Searching vector database for relevant code chunks for user ${userId}...`);
      const pineconeIndex = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
      
      console.log(`[${new Date().toISOString()}] 🔍 QUERY: Vector store namespace: ${userId}`);
      console.log(`[${new Date().toISOString()}] 🔍 QUERY: Pinecone index name: ${pineconeIndex}`);

      // Attempt retrieval with timeout protection
      let similarDocuments = [];
      
      try {
        // Find relevant documents from vector database with timeout
        console.log(`[${new Date().toISOString()}] 🔍 QUERY: Running similarity search`);
        
        // Add timeout to prevent hanging
        const VECTOR_SEARCH_TIMEOUT = 30000; // 30 seconds
        
        // Create vector stores for both user-specific and core docs namespaces
        const userVectorStore = new PineconeStore(this.embeddings, {
          pineconeIndex: this.pinecone.Index(pineconeIndex),
          namespace: userId // User-specific namespace
        });

        const coreDocsVectorStore = new PineconeStore(this.embeddings, {
          pineconeIndex: this.pinecone.Index(pineconeIndex),
          namespace: 'core-docs' // Global core docs namespace
        });

        // Search both namespaces
        const userSearchPromise = userVectorStore.similaritySearch(prompt, 10);
        const coreDocsSearchPromise = coreDocsVectorStore.similaritySearch(prompt, 5);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Vector search timeout')), VECTOR_SEARCH_TIMEOUT);
        });
        
        // Retrieve chunks for richer context
        const [userDocs, coreDocs] = await Promise.race([
          Promise.all([userSearchPromise, coreDocsSearchPromise]),
          timeoutPromise
        ]);
        
        similarDocuments = [...userDocs, ...coreDocs];

        // Log the first few chunks for debugging
        similarDocuments.forEach((doc, i) => {
          console.log(`[DEBUG] Chunk ${i}: ${doc.metadata.source || 'Unknown'} | ${doc.pageContent.substring(0, 200)}`);
        });
        console.log(`[${new Date().toISOString()}] 🔍 QUERY: Retrieved ${similarDocuments.length} documents from vector store`);
        
        if (similarDocuments.length > 0) {
          console.log(`[${new Date().toISOString()}] 🔍 QUERY: First document metadata:`, 
            JSON.stringify(similarDocuments[0].metadata, null, 2));
          console.log(`[${new Date().toISOString()}] 🔍 QUERY: First document content preview: ${similarDocuments[0].pageContent.substring(0, 100)}...`);
          
          // Log all document sources for better debugging
          console.log(`[${new Date().toISOString()}] 🔍 QUERY: All retrieved document sources:`);
          similarDocuments.forEach((doc, index) => {
            console.log(`[${new Date().toISOString()}]   ${index + 1}. ${doc.metadata.source || 'Unknown'} (${doc.pageContent.length} chars)`);
          });
          
          this.emitRagStatus('retrieval_success', {
            userId: userId,
            conversationId: conversationId,
            documentsFound: similarDocuments.length,
            sources: similarDocuments.map(doc => doc.metadata.source || 'Unknown'),
            sourceTypes: {
              apiSpec: similarDocuments.filter(doc => doc.metadata.type === 'apiSpec' || doc.metadata.type === 'apiSpecFull').length,
              githubCode: similarDocuments.filter(doc => doc.metadata.repoId || doc.metadata.githubOwner).length
            },
            firstDocContentPreview: similarDocuments[0].pageContent.substring(0, 100) + '...'
          });
        }
        
      } catch (timeoutError) {
        if (timeoutError.message === 'Vector search timeout') {
          console.log(`[${new Date().toISOString()}] ⚠️ Vector search timed out, falling back to standard response`);
          this.emitRagStatus('retrieval_timeout_fallback', {
            userId: userId,
            conversationId: conversationId,
            error: timeoutError.message,
            query: prompt.substring(0, 100)
          });
          return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
        } else {
          // For other errors, log and continue with standard response
          console.error(`[${new Date().toISOString()}] 🔍 QUERY: Vector search error:`, timeoutError.message);
          
          this.emitRagStatus('retrieval_error', {
            userId: userId,
            conversationId: conversationId,
            error: timeoutError.message,
            query: prompt.substring(0, 100)
          });
          
          return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
        }
      }

      if (similarDocuments.length === 0) {
        console.log(`[${new Date().toISOString()}] 🔍 QUERY: No relevant documents found, using standard response`);
        
        this.emitRagStatus('retrieval_no_results', {
          userId: userId,
          conversationId: conversationId,
          query: prompt.substring(0, 100)
        });
        
        return await this.generateStandardResponse(prompt, conversationId, conversationHistory);
      }

      // Process the retrieved documents
      console.log(`[${new Date().toISOString()}] 🔍 QUERY: Found ${similarDocuments.length} relevant documents`);

      // Log comprehensive source loading summary
      console.log(`[${new Date().toISOString()}] 📚 MULTI-SOURCE RAG CONTEXT FROM VECTOR SEARCH:`);
      console.log(`[${new Date().toISOString()}] 🎯 TOTAL CONTEXT: ${similarDocuments.length} chunks retrieved from vector database ready for AI processing`);

      // Format the context from retrieved documents
      console.log(`[${new Date().toISOString()}] 🔍 QUERY: Formatting context from retrieved documents.`);
      
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
      
      console.log(`[${new Date().toISOString()}] 🔍 QUERY: Created context with ${context.length} characters from ${similarDocuments.length} documents`);
      
      // Format conversation history into messages
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
      
      // Generate response using LLM with retry logic
      const response = await this.generateResponseWithRetry(messages);
      
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
      console.log(`[${new Date().toISOString()}] 🔍 CONVERSATION HISTORY: Used ${conversationHistory.length} previous exchanges for continuity`);
      
      return {
        success: true,
        response,
        conversationId,
        timestamp: new Date().toISOString(),
        ragEnabled: true,
        contextSize: context.length,
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
  }

  /**
   * Generate response using LLM with retry logic
   */
  async generateResponseWithRetry(messages) {
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
            console.warn(`[${new Date().toISOString()}] Rate limit hit during generation, retry ${retries}/${this.maxRetries}`);
            await this.waitWithBackoff(retries);
          } else {
            // Log the error and throw it for proper handling
            console.error(`[${new Date().toISOString()}] Failed to respond to prompt:`, error);
            throw error;
          }
        }
      } else {
        // Wait if we're rate limited
        await this.waitWithBackoff(retries);
      }
    }
    
    if (!success) {
      // If we couldn't generate a response after all retries
      throw new Error(`Failed to generate response after ${this.maxRetries} retries due to rate limits`);
    }
    
    return response;
  }

  /**
   * Helper method for generating responses without context
   */
  async generateStandardResponse(prompt, conversationId, conversationHistory = []) {
    try {
      // Format conversation history into messages
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

      const response = await this.generateResponseWithRetry(messages);

      console.log(`[${new Date().toISOString()}] 🔍 QUERY: Generated standard response with conversation history for conversation ${conversationId}`);
      
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

  // Helper methods

  /**
   * Helper method to format conversation history into messages
   */
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

  /**
   * Helper to extract endpoints and tags from OpenAPI spec
   */
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

  /**
   * Helper to load JSON spec file from backend root
   */
  async loadApiSpec(filePath) {
    const fs = require('fs');
    const path = require('path');
    const backendRoot = path.resolve(__dirname, '../../../../..');
    const absPath = path.resolve(backendRoot, filePath);
    try {
      const content = await fs.promises.readFile(absPath, 'utf8');
      // Optionally parse and pretty-print JSON
      let prettyContent = content;
      try {
        const json = JSON.parse(content);
        prettyContent = JSON.stringify(json, null, 2);
        return json; // Return parsed JSON for formatApiSpecSummary
      } catch (e) {
        return null;
      }
    } catch (err) {
      console.warn(`[${new Date().toISOString()}] Could not load API spec file at ${absPath}: ${err.message}`);
      return null;
    }
  }

  /**
   * Check rate limits (simplified version)
   */
  async checkRateLimit() {
    // Simplified rate limit check - could be enhanced
    return true;
  }

  /**
   * Wait with exponential backoff
   */
  async waitWithBackoff(retryCount) {
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
    console.log(`[${new Date().toISOString()}] Waiting ${delay}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Helper method to emit RAG status updates for monitoring
   */
  emitRagStatus(status, details = {}) {
    // Always log the status update
    console.log(`[${new Date().toISOString()}] 🔍 RAG STATUS: ${status}`, 
      Object.keys(details).length > 0 ? JSON.stringify(details, null, 2) : '');
    
    // Try to emit to the event bus if available
    try {
      if (this.eventBus) {
        this.eventBus.emit('ragStatusUpdate', {
          component: 'QueryPipeline',
          timestamp: new Date().toISOString(),
          status,
          ...details
        });
        return;
      }
      
      // Fallback to imported event bus if instance one isn't available
      const eventDispatcherPath = '../../../../../eventDispatcher';
      const { eventBus } = require(eventDispatcherPath);
      if (eventBus) {
        eventBus.emit('ragStatusUpdate', {
          component: 'QueryPipeline',
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

module.exports = QueryPipeline;
