// aiLangchainAdapter.js
'use strict';
/* eslint-disable no-unused-vars */

const IAIPort = require('../../domain/ports/IAIPort');
const { GithubRepoLoader } = require("@langchain/community/document_loaders/web/github");
const { RecursiveCharacterTextSplitter, Language } = require("@langchain/textsplitters");
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { ChatOpenAI } = require('@langchain/openai');

class AILangchainAdapter extends IAIPort {
  // Accept userId in the constructor (this will be the internal application userId)
  constructor(options = {}) {
    super();
    
    // Make userId optional during DI registration
    this.userId = options.userId || null;
    
    console.log(`[${new Date().toISOString()}] AILangchainAdapter initializing for user: ${this.userId}`);
    
    // Initialize embeddings model: converts text to vectors
    this.embeddings = new OpenAIEmbeddings({ 
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY 
    });

    // Initialize Pinecone client
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
      
    // Initialize vector store with Pinecone, using the dynamic application userId as namespace
    this.vectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pinecone.Index(process.env.PINECONE_INDEX_NAME),
      namespace: this.userId // Use dynamic application userId for namespace
    });
    
    // Initialize chat model: generates responses
    this.llm = new ChatOpenAI({ 
      modelName: 'gpt-4', 
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log(`[${new Date().toISOString()}] AILangchainAdapter initialized successfully for user: ${this.userId}`);
  }

  // Add method to set userId after construction
  setUserId(userId) {
    this.userId = userId;
    
    // Update vector store namespace
    this.vectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pinecone.Index(process.env.PINECONE_INDEX_NAME),
      namespace: this.userId
    });
    
    console.log(`[${new Date().toISOString()}] AILangchainAdapter userId updated to: ${this.userId}`);
    return this;
  }

  async processPushedRepo(userId, repoId, repoData) {
    // userId here is the application's internal userId (e.g., UUID from JWT)
    // repoData should now contain githubOwner (e.g., "anatolyZader")
    console.log(`[${new Date().toISOString()}] Processing repo for user ${userId}: ${repoId}`);

    try {
      // 1. INDEXING :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

      // Load: Document Loaders.
      console.log(`[${new Date().toISOString()}] Loading repository from GitHub...`);
      
      // Use dynamic repo URL from repoData.url or construct using repoData.githubOwner
      const githubOwner = repoData?.githubOwner || userId; // Fallback to userId if githubOwner not provided
      const repoUrl = repoData?.url || `https://github.com/${githubOwner}/${repoId}`;
      const repoBranch = repoData?.branch || repoData?.defaultBranch || "main";
      
      console.log(`[${new Date().toISOString()}] Repository URL: ${repoUrl}, Branch: ${repoBranch}`);
      
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
          ]
        }
      ); 

      const loadedRepo = [];
      let loadCount = 0;
      
      console.log(`[${new Date().toISOString()}] Starting document loading...`);
      
      for await (const doc of repoLoader.loadAsStream()) {
        loadedRepo.push(doc);
        loadCount++;
        
        // Progress logging
        if (loadCount % 10 === 0) {
          console.log(`[${new Date().toISOString()}] Loaded ${loadCount} documents...`);
        }
      }

      console.log(`[${new Date().toISOString()}] ✅ Loaded ${loadedRepo.length} documents from repository`);

      if (loadedRepo.length === 0) {
        throw new Error(`No documents loaded from repository ${repoUrl}. Check repository access and branch name.`);
      }

      // Split: Text splitters 
      console.log(`[${new Date().toISOString()}] Splitting documents into chunks...`);

      // Smart splitter selection based on repository content
      const repoSplitter = this.createSmartSplitter(loadedRepo);
      
      // Split documents into chunks
      const splittedRepo = await repoSplitter.splitDocuments(loadedRepo);

      console.log(`[${new Date().toISOString()}] ✅ Split into ${splittedRepo.length} chunks`);

      // Store: VectorStore and Embeddings model.
      console.log(`[${new Date().toISOString()}] Storing embeddings in vector database...`);

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
      const batchSize = 50;
      let storedCount = 0;
      
      for (let i = 0; i < documentsWithMetadata.length; i += batchSize) {
        const batch = documentsWithMetadata.slice(i, i + batchSize);
        const batchIds = documentIds.slice(i, i + batchSize);
        
        await this.vectorStore.addDocuments(batch, { ids: batchIds });
        storedCount += batch.length;
        
        console.log(`[${new Date().toISOString()}] Stored batch ${Math.ceil((i + 1) / batchSize)} - ${storedCount}/${documentsWithMetadata.length} chunks`);
      }
      
      console.log(`[${new Date().toISOString()}] ✅ Successfully stored ${documentsWithMetadata.length} document chunks in vector database`);

      return {
        success: true,
        userId: userId,
        repoId: repoId,
        repoUrl: repoUrl,
        branch: repoBranch,
        githubOwner: githubOwner,
        documentsLoaded: loadedRepo.length,
        chunksCreated: splittedRepo.length,
        chunksStored: documentsWithMetadata.length,
        processedAt: new Date().toISOString(), // Use current timestamp
        processedBy: 'AI-Service'
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to process repository ${repoId}:`, error.message);
      throw new Error(`Repository processing failed: ${error.message}`);
    }
  }

  // 2. Retrieval and generation:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  // The actual RAG chain, which takes the user query at run time and retrieves the relevant data from the index, then passes it to the model

  async respondToPrompt(conversationId, prompt) {
    if (!this.userId) {
      throw new Error('UserId is required. Call setUserId() first.');
    }

    console.log(`[${new Date().toISOString()}] Responding to prompt for conversation ${conversationId}: "${prompt.slice(0, 100)}..."`);
    
    try {
      // Step 1: Retrieve relevant documents from the vector store
      console.log(`[${new Date().toISOString()}] Searching vector database for relevant code chunks for user ${this.userId}...`);
      
      const searchStartTime = Date.now();
      
      // Perform semantic search to find most relevant code chunks, filtering by the current application userId
      const relevantDocs = await this.vectorStore.similaritySearch(
        prompt, 
        6, // Retrieve top 6 most relevant chunks
        {
          userId: this.userId // Use the dynamic application userId for filtering
        }
      );
      
      const searchTime = Date.now() - searchStartTime;
      console.log(`[${new Date().toISOString()}] Found ${relevantDocs.length} relevant documents in ${searchTime}ms`);
      // Log the retrieved documents for debugging
      console.log(`[${new Date().toISOString()}] Retrieved documents details:`, relevantDocs.map(doc => ({
        source: doc.metadata.source,
        repoId: doc.metadata.repoId,
        githubOwner: doc.metadata.githubOwner, // Log GitHub owner
        chunkIndex: doc.metadata.chunkIndex,
        contentPreview: doc.pageContent.substring(0, 100) + '...'
      })));

      if (relevantDocs.length === 0) {
        console.log(`[${new Date().toISOString()}] No relevant documents found for prompt`);
        return {
          success: false,
          response: "I couldn't find any relevant code in your repositories for that question. Please ensure the repository was processed with the correct user ID, and try asking about specific files, functions, or concepts that exist in your codebase.",
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        };
      }

      // Step 2: Format the retrieved context for the LLM
      const context = relevantDocs.map((doc, index) => {
        const fileName = doc.metadata.source || 'Unknown file';
        const repoInfo = doc.metadata.repoId || 'Unknown repo';
        const fileType = doc.metadata.fileType || 'Unknown type';
        const githubOwner = doc.metadata.githubOwner || 'Unknown owner'; // Get GitHub owner from metadata
        
        return `--- Code Chunk ${index + 1} ---
Repository: ${repoInfo} (Owner: ${githubOwner})
File: ${fileName} (${fileType})
Content:
${doc.pageContent.trim()}
`;
      }).join('\n\n');

      console.log(`[${new Date().toISOString()}] Prepared context with ${context.length} characters from ${relevantDocs.length} code chunks`);

      // Define an enhanced system prompt for the coding assistant
      const systemPrompt = `You are an expert software engineering assistant helping ${this.userId} analyze and understand code from their GitHub repositories.

        Current Date/Time: ${new Date().toISOString()}
        User: ${this.userId}
        Conversation ID: ${conversationId}

        INSTRUCTIONS:
        - Use the provided code context to answer questions accurately and helpfully
        - Reference specific files and line numbers when possible
        - Explain code functionality, architecture patterns, and relationships
        - Suggest improvements, optimizations, or best practices when relevant
        - If you don't have enough context, clearly state what's missing
        - Keep responses concise but comprehensive
        - Use markdown formatting for better readability
        - Always cite which files/repositories you're referencing

        CONTEXT FROM ${this.userId}'s REPOSITORIES:
        ${context}

        Remember: You have access to ${this.userId}'s actual code. Provide specific, actionable insights based on the retrieved context.`;

      // Step 3: Generate response using chat model
      console.log(`[${new Date().toISOString()}] Generating AI response using GPT-4...`);
      
      const generationStartTime = Date.now();
      
      const response = await this.llm.invoke([
        { 
          role: "system", 
          content: systemPrompt 
        },
        { 
          role: "user", 
          content: `Question: ${prompt}` 
        }
      ]);

      const generationTime = Date.now() - generationStartTime;
      console.log(`[${new Date().toISOString()}] ✅ AI response generated in ${generationTime}ms`);

      // Log the raw LLM response content for debugging
      console.log(`[${new Date().toISOString()}] Raw LLM response content:`, response.content);

      // Step 4: Return structured response
      return {
        success: true,
        response: response.content,
        conversationId: conversationId,
        metadata: {
          documentsUsed: relevantDocs.length,
          searchTimeMs: searchTime,
          generationTimeMs: generationTime,
          repositoriesReferenced: [...new Set(relevantDocs.map(doc => doc.metadata.repoId))],
          filesReferenced: [...new Set(relevantDocs.map(doc => doc.metadata.source))],
          totalContextLength: context.length,
          timestamp: new Date().toISOString(), // Use current timestamp
          user: this.userId
        }
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to respond to prompt:`, error.message);
      
      return {
        success: false,
        response: `Failed to generate response: ${error.message}. Please check your API keys and network connection.`, // More informative error
        conversationId: conversationId,
        timestamp: new Date().toISOString(),
        user: this.userId
      };
    }
  }

  // Additional utility methods

  /**
   * Create smart splitter based on repository content analysis
   * @param {Array} documents - Loaded documents to analyze
   * @returns {RecursiveCharacterTextSplitter} Optimized splitter
   */
  createSmartSplitter(documents) {
    console.log(`[${new Date().toISOString()}] Analyzing repository content for optimal splitting strategy...`);
    
    // Analyze file types in the repository
    const fileTypes = documents.map(doc => this.getFileType(doc.metadata.source || ''));
    const typeFrequency = fileTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    console.log(`[${new Date().toISOString()}] File type distribution:`, typeFrequency);

    // Choose splitter based on dominant file types
    const dominantType = Object.keys(typeFrequency).reduce((a, b) => 
      typeFrequency[a] > typeFrequency[b] ? a : b
    );

    let splitter;
    
    switch (dominantType) {
      case 'javascript':
      case 'typescript':
        splitter = RecursiveCharacterTextSplitter.fromLanguage(Language.JS, {
          chunkSize: 1500,
          chunkOverlap: 300,
        });
        console.log(`[${new Date().toISOString()}] Using JavaScript/TypeScript optimized splitter`);
        break;
        
      case 'python':
        splitter = RecursiveCharacterTextSplitter.fromLanguage(Language.PYTHON, {
          chunkSize: 1500,
          chunkOverlap: 300,
        });
        console.log(`[${new Date().toISOString()}] Using Python optimized splitter`);
        break;
        
      case 'markdown':
        splitter = RecursiveCharacterTextSplitter.fromLanguage(Language.MARKDOWN, {
          chunkSize: 1200,
          chunkOverlap: 200,
        });
        console.log(`[${new Date().toISOString()}] Using Markdown optimized splitter`);
        break;
        
      default:
        splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
          separators: ["\n\n", "\n", " ", ""]
        });
        console.log(`[${new Date().toISOString()}] Using generic text splitter`);
    }

    return splitter;
  }

  /**
   * Determine file type based on file extension
   * @param {string} filePath - Path to the file
   * @returns {string} File type category
   */
  getFileType(filePath) {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    
    const typeMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'md': 'markdown',
      'txt': 'text',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sql': 'sql'
    };

    return typeMap[extension] || 'unknown';
  }

  /**
   * Sanitize string for use as document ID
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  /**
   * Search repositories with advanced filtering
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchRepositories(query, options = {}) {
    console.log(`[${new Date().toISOString()}] Advanced search for user ${this.userId}: "${query}"`);
    
    try {
      const {
        userId = this.userId, // Default to instance userId
        repoId = null,
        fileType = null,
        k = 5
      } = options;

      // Build filter object
      const filter = { userId };
      if (repoId) filter.repoId = repoId;
      if (fileType) filter.fileType = fileType;

      const results = await this.vectorStore.similaritySearch(query, k, filter);
      
      console.log(`[${new Date().toISOString()}] Found ${results.length} results for advanced search`);
      
      return {
        success: true,
        results: results.map(doc => ({
          content: doc.pageContent,
          metadata: doc.metadata,
          relevanceScore: doc.score || 'N/A'
        })),
        query: query,
        filter: filter,
        totalResults: results.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Advanced search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive adapter statistics
   * @returns {Object} Adapter statistics and status
   */
  getAdapterStats() {
    return {
      adapterVersion: '1.0.2', // Updated version
      storeType: 'PineconeStore',
      embeddingModel: 'text-embedding-3-large',
      chatModel: 'gpt-4',
      user: this.userId, // Use dynamic userId
      timestamp: new Date().toISOString(),
      status: 'operational',
      features: [
        'GitHub repository loading',
        'Smart document splitting',
        'Semantic search',
        'RAG-powered responses',
        'Multi-repository support',
        'Advanced metadata tracking',
        'Persistent vector storage',
        'Dynamic user-specific namespacing' // New feature
      ],
      limitations: [
        'Requires Pinecone API key and index setup',
        'Network dependent for vector operations',
        'OpenAI API key required for LLM and embeddings'
      ]
    };
  }

  /**
   * Health check for the adapter
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    console.log(`[${new Date().toISOString()}] Performing health check for user ${this.userId}...`);
    
    try {
      // Test embeddings
      const testEmbedding = await this.embeddings.embedQuery("test");
      const embeddingsOk = Array.isArray(testEmbedding) && testEmbedding.length > 0;
      
      // Test LLM
      const testResponse = await this.llm.invoke([
        { role: "user", content: "Say 'OK' if you're working" }
      ]);
      const llmOk = testResponse && testResponse.content && testResponse.content.includes('OK');
      
      // Test Pinecone connection (describeIndex is a good way to check connectivity)
      const pineconeIndexName = process.env.PINECONE_INDEX_NAME;
      let pineconeOk = false;
      if (pineconeIndexName) {
        try {
          await this.pinecone.describeIndex(pineconeIndexName);
          pineconeOk = true;
        } catch (e) {
          console.error(`Pinecone describeIndex failed:`, e.message);
          pineconeOk = false;
        }
      } else {
        console.warn('PINECONE_INDEX_NAME is not set for health check.');
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        user: this.userId,
        components: {
          embeddings: embeddingsOk ? 'OK' : 'FAILED',
          llm: llmOk ? 'OK' : 'FAILED',
          vectorStore: pineconeOk ? 'OK' : 'FAILED'
        },
        allSystemsOperational: embeddingsOk && llmOk && pineconeOk
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Health check failed:`, error.message);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        user: this.userId,
        error: error.message
      };
    }
  }
}

module.exports = AILangchainAdapter;