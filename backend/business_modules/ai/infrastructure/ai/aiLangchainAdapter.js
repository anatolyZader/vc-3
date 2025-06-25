// aiLangchainAdapter.js
'use strict';
/* eslint-disable no-unused-vars */

const IAIPort = require('./IAIPort');
const { GithubRepoLoader } = require("@langchain/community/document_loaders/web/github");
const { RecursiveCharacterTextSplitter, Language } = require("@langchain/textsplitters");
const { PineconeStore } = require('@langchain/pinecone');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { ChatOpenAI } = require('@langchain/openai');

class AILangchainAdapter extends IAIPort {
  constructor() {
    super();
    
    console.log(`[2025-06-25 09:23:04] AILangchainAdapter initializing for user: anatolyZader`);
    
    // Initialize embeddings model: converts text to vectors
    this.embeddings = new OpenAIEmbeddings({ 
      model: 'text-embedding-3-large',
      apiKey: process.env.OPENAI_API_KEY  
    });

    // Initialize Pinecone client
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
      
    // Initialize vector store with Pinecone
    this.vectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex: this.pinecone.Index(process.env.PINECONE_INDEX_NAME),
      namespace: 'anatolyZader'
    });
    
    // Initialize chat model: generates responses
    this.llm = new ChatOpenAI({ 
      modelName: 'gpt-4', 
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log(`[2025-06-25 09:23:04] AILangchainAdapter initialized successfully for user: anatolyZader`);
  }

  async processPushedRepo(userId, repoId, repoData) {
    console.log(`[2025-06-25 09:23:04] Processing repo for user ${userId}: ${repoId}`);

    try {
      // 1. INDEXING :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

      // Load: Document Loaders.
      console.log(`[2025-06-25 09:23:04] Loading repository from GitHub...`);
      
      // Use dynamic repo URL from repoData if provided, fallback to hardcoded
      const repoUrl = repoData?.url || `https://github.com/${userId}/${repoId}` || "https://github.com/anatolyZader/vc-3";
      const repoBranch = repoData?.branch || repoData?.defaultBranch || "main";
      
      console.log(`[2025-06-25 09:23:04] Repository URL: ${repoUrl}, Branch: ${repoBranch}`);
      
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
      
      console.log(`[2025-06-25 09:23:04] Starting document loading...`);
      
      for await (const doc of repoLoader.loadAsStream()) {
        loadedRepo.push(doc);
        loadCount++;
        
        // Progress logging for anatolyZader
        if (loadCount % 10 === 0) {
          console.log(`[2025-06-25 09:23:04] Loaded ${loadCount} documents...`);
        }
      }

      console.log(`[2025-06-25 09:23:04] ✅ Loaded ${loadedRepo.length} documents from repository`);

      if (loadedRepo.length === 0) {
        throw new Error(`No documents loaded from repository ${repoUrl}. Check repository access and branch name.`);
      }

      // Split: Text splitters 
      console.log(`[2025-06-25 09:23:04] Splitting documents into chunks...`);

      // Smart splitter selection based on repository content
      const repoSplitter = this.createSmartSplitter(loadedRepo);
      
      // Split documents into chunks
      const splittedRepo = await repoSplitter.splitDocuments(loadedRepo);

      console.log(`[2025-06-25 09:23:04] ✅ Split into ${splittedRepo.length} chunks`);

      // Store: VectorStore and Embeddings model.
      console.log(`[2025-06-25 09:23:04] Storing embeddings in vector database...`);

      // Add comprehensive metadata to chunks for better tracking
      const documentsWithMetadata = splittedRepo.map((doc, index) => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          userId: userId,
          repoId: repoId,
          repoUrl: repoUrl,
          branch: repoBranch,
          chunkIndex: index,
          totalChunks: splittedRepo.length,
          processedAt: '2025-06-25 09:23:04',
          processedBy: 'anatolyZader',
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
        
        console.log(`[2025-06-25 09:23:04] Stored batch ${Math.ceil((i + 1) / batchSize)} - ${storedCount}/${documentsWithMetadata.length} chunks`);
      }
      
      console.log(`[2025-06-25 09:23:04] ✅ Successfully stored ${documentsWithMetadata.length} document chunks in vector database`);

      return {
        success: true,
        userId: userId,
        repoId: repoId,
        repoUrl: repoUrl,
        branch: repoBranch,
        documentsLoaded: loadedRepo.length,
        chunksCreated: splittedRepo.length,
        chunksStored: documentsWithMetadata.length,
        processedAt: '2025-06-25 09:23:04',
        processedBy: 'anatolyZader'
      };

    } catch (error) {
      console.error(`[2025-06-25 09:23:04] ❌ Failed to process repository ${repoId}:`, error.message);
      throw new Error(`Repository processing failed: ${error.message}`);
    }
  }

  // 2. Retrieval and generation:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  // The actual RAG chain, which takes the user query at run time and retrieves the relevant data from the index, then passes it to the model

  async respondToPrompt(conversationId, prompt) {
    console.log(`[2025-06-25 09:23:04] Responding to prompt for conversation ${conversationId}: "${prompt.slice(0, 100)}..."`);
    
    try {
      // Step 1: Retrieve relevant documents from the vector store
      console.log(`[2025-06-25 09:23:04] Searching vector database for relevant code chunks...`);
      
      const searchStartTime = Date.now();
      
      // Perform semantic search to find most relevant code chunks
      const relevantDocs = await this.vectorStore.similaritySearch(
        prompt, 
        6, // Retrieve top 6 most relevant chunks
        {
          // Filter by anatolyZader's repositories only
          userId: 'anatolyZader'
        }
      );
      
      const searchTime = Date.now() - searchStartTime;
      console.log(`[2025-06-25 09:23:04] Found ${relevantDocs.length} relevant documents in ${searchTime}ms`);

      if (relevantDocs.length === 0) {
        console.log(`[2025-06-25 09:23:04] No relevant documents found for prompt`);
        return {
          success: false,
          message: "I couldn't find any relevant code in your repositories for that question. Try asking about specific files, functions, or concepts that exist in your codebase.",
          conversationId: conversationId,
          timestamp: '2025-06-25 09:23:04'
        };
      }

      // Step 2: Format the retrieved context for the LLM (FIXED SYNTAX ERROR HERE)
      const context = relevantDocs.map((doc, index) => {
        const fileName = doc.metadata.source || 'Unknown file';
        const repoInfo = doc.metadata.repoId || 'Unknown repo';
        const fileType = doc.metadata.fileType || 'Unknown type';
        
        return `--- Code Chunk ${index + 1} ---
Repository: ${repoInfo}
File: ${fileName} (${fileType})
Content:
${doc.pageContent.trim()}
`;
      }).join('\n\n');

      console.log(`[2025-06-25 09:23:04] Prepared context with ${context.length} characters from ${relevantDocs.length} code chunks`);

      // Define an enhanced system prompt for anatolyZader's coding assistant
      const systemPrompt = `You are an expert software engineering assistant helping anatolyZader analyze and understand code from their GitHub repositories.

        Current Date/Time: 2025-06-25 09:23:04 UTC
        User: anatolyZader
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

        CONTEXT FROM anatolyZader's REPOSITORIES:
        ${context}

        Remember: You have access to anatolyZader's actual code. Provide specific, actionable insights based on the retrieved context.`;

      // Step 3: Generate response using chat model
      console.log(`[2025-06-25 09:23:04] Generating AI response using GPT-4...`);
      
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
      console.log(`[2025-06-25 09:23:04] ✅ AI response generated in ${generationTime}ms`);

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
          timestamp: '2025-06-25 09:23:04',
          user: 'anatolyZader'
        }
      };

    } catch (error) {
      console.error(`[2025-06-25 09:23:04] ❌ Failed to respond to prompt:`, error.message);
      
      return {
        success: false,
        error: `Failed to generate response: ${error.message}`,
        conversationId: conversationId,
        timestamp: '2025-06-25 09:23:04',
        user: 'anatolyZader'
      };
    }
  }

  // Additional utility methods for anatolyZader's workflow

  /**
   * Create smart splitter based on repository content analysis
   * @param {Array} documents - Loaded documents to analyze
   * @returns {RecursiveCharacterTextSplitter} Optimized splitter
   */
  createSmartSplitter(documents) {
    console.log(`[2025-06-25 09:23:04] Analyzing repository content for optimal splitting strategy...`);
    
    // Analyze file types in the repository
    const fileTypes = documents.map(doc => this.getFileType(doc.metadata.source || ''));
    const typeFrequency = fileTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    console.log(`[2025-06-25 09:23:04] File type distribution:`, typeFrequency);

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
        console.log(`[2025-06-25 09:23:04] Using JavaScript/TypeScript optimized splitter`);
        break;
        
      case 'python':
        splitter = RecursiveCharacterTextSplitter.fromLanguage(Language.PYTHON, {
          chunkSize: 1500,
          chunkOverlap: 300,
        });
        console.log(`[2025-06-25 09:23:04] Using Python optimized splitter`);
        break;
        
      case 'markdown':
        splitter = RecursiveCharacterTextSplitter.fromLanguage(Language.MARKDOWN, {
          chunkSize: 1200,
          chunkOverlap: 200,
        });
        console.log(`[2025-06-25 09:23:04] Using Markdown optimized splitter`);
        break;
        
      default:
        splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
          separators: ["\n\n", "\n", " ", ""]
        });
        console.log(`[2025-06-25 09:23:04] Using generic text splitter`);
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
    console.log(`[2025-06-25 09:23:04] Advanced search for anatolyZader: "${query}"`);
    
    try {
      const {
        userId = 'anatolyZader',
        repoId = null,
        fileType = null,
        k = 5
      } = options;

      // Build filter object
      const filter = { userId };
      if (repoId) filter.repoId = repoId;
      if (fileType) filter.fileType = fileType;

      const results = await this.vectorStore.similaritySearch(query, k, filter);
      
      console.log(`[2025-06-25 09:23:04] Found ${results.length} results for advanced search`);
      
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
        timestamp: '2025-06-25 09:23:04'
      };
    } catch (error) {
      console.error(`[2025-06-25 09:23:04] Advanced search failed:`, error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive adapter statistics for anatolyZader
   * @returns {Object} Adapter statistics and status
   */
  getAdapterStats() {
    return {
      adapterVersion: '1.0.0',
      storeType: 'PineconeStore',
      embeddingModel: 'text-embedding-3-large',
      chatModel: 'gpt-4',
      user: 'anatolyZader',
      timestamp: '2025-06-25 09:23:04',
      status: 'operational',
      features: [
        'GitHub repository loading',
        'Smart document splitting',
        'Semantic search',
        'RAG-powered responses',
        'Multi-repository support',
        'Advanced metadata tracking',
        'Persistent vector storage'
      ],
      limitations: [
        'Requires Pinecone API key and index setup',
        'Network dependent for vector operations'
      ]
    };
  }

  /**
   * Health check for the adapter
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    console.log(`[2025-06-25 09:23:04] Performing health check for anatolyZader...`);
    
    try {
      // Test embeddings
      const testEmbedding = await this.embeddings.embedQuery("test");
      const embeddingsOk = Array.isArray(testEmbedding) && testEmbedding.length > 0;
      
      // Test LLM
      const testResponse = await this.llm.invoke([
        { role: "user", content: "Say 'OK' if you're working" }
      ]);
      const llmOk = testResponse && testResponse.content;
      
      // Test Pinecone connection
      const pineconeOk = await this.pinecone.describeIndex(process.env.PINECONE_INDEX_NAME).then(() => true).catch(() => false);
      
      return {
        status: 'healthy',
        timestamp: '2025-06-25 09:23:04',
        user: 'anatolyZader',
        components: {
          embeddings: embeddingsOk ? 'OK' : 'FAILED',
          llm: llmOk ? 'OK' : 'FAILED',
          vectorStore: pineconeOk ? 'OK' : 'FAILED'
        },
        allSystemsOperational: embeddingsOk && llmOk && pineconeOk
      };
    } catch (error) {
      console.error(`[2025-06-25 09:23:04] Health check failed:`, error.message);
      return {
        status: 'unhealthy',
        timestamp: '2025-06-25 09:23:04',
        user: 'anatolyZader',
        error: error.message
      };
    }
  }
}

module.exports = AILangchainAdapter;