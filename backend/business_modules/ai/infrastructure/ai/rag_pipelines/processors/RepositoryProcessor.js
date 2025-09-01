// RepositoryProcessor.js
"use strict";

const { GithubRepoLoader } = require('langchain/document_loaders/web/github');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');

/**
 * Dedicated processor for GitHub repository source code
 * Handles repository cloning, code analysis, AST-based splitting, and semantic enhancement
 */
class RepositoryProcessor {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pinecone = options.pinecone;
    this.pineconeLimiter = options.pineconeLimiter;
    this.repositoryManager = options.repositoryManager;
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    this.astBasedSplitter = options.astBasedSplitter;
    this.semanticPreprocessor = options.semanticPreprocessor;
  }

  /**
   * Process GitHub repository source code
   */
  async processRepository(repoUrl, branch = 'main', namespace = null) {
    console.log(`[${new Date().toISOString()}] 🔧 REPOSITORY PROCESSOR: Starting repository processing`);
    console.log(`[${new Date().toISOString()}] 📂 REPOSITORY: ${repoUrl} (branch: ${branch})`);
    console.log(`[${new Date().toISOString()}] 🎯 EXPLANATION: Processing source code with AST-based intelligent splitting and semantic analysis`);

    if (!namespace) {
      namespace = this.repositoryManager.sanitizeId(repoUrl);
    }

    // Load repository documents
    const documents = await this.loadRepositoryDocuments(repoUrl, branch);
    
    if (!documents || documents.length === 0) {
      console.log(`[${new Date().toISOString()}] ⚠️ REPOSITORY: No documents found in repository`);
      return { success: true, documentsProcessed: 0, chunksGenerated: 0 };
    }

    console.log(`[${new Date().toISOString()}] 📄 REPOSITORY: Loaded ${documents.length} source files from repository`);

    // Apply intelligent document processing
    const processedDocuments = await this.intelligentProcessDocuments(documents);
    
    console.log(`[${new Date().toISOString()}] 🧠 REPOSITORY: Applied intelligent processing to ${documents.length} documents`);

    // Split documents using AST-based intelligent chunking
    const splitDocuments = await this.intelligentSplitDocuments(processedDocuments);
    
    console.log(`[${new Date().toISOString()}] ✂️  REPOSITORY: Split ${documents.length} documents into ${splitDocuments.length} chunks`);

    // Enhance with ubiquitous language if available
    const enhancedDocuments = await this.enhanceWithDomainKnowledge(splitDocuments);
    
    console.log(`[${new Date().toISOString()}] 🎯 REPOSITORY: Enhanced ${splitDocuments.length} chunks with domain knowledge`);

    // Store in vector database
    await this.storeRepositoryDocuments(enhancedDocuments, namespace);

    console.log(`[${new Date().toISOString()}] ✅ REPOSITORY PROCESSOR: Successfully processed repository into ${enhancedDocuments.length} chunks`);

    return {
      success: true,
      documentsProcessed: documents.length,
      chunksGenerated: enhancedDocuments.length,
      namespace,
      repoUrl,
      branch,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Load documents from GitHub repository
   */
  async loadRepositoryDocuments(repoUrl, branch) {
    console.log(`[${new Date().toISOString()}] 📥 REPOSITORY LOADING: Loading documents from ${repoUrl}...`);
    
    try {
      const loader = new GithubRepoLoader(repoUrl, {
        branch,
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5,
        ignoreFiles: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          'coverage/**',
          '*.log',
          '*.lock',
          '*.tmp',
          '.DS_Store',
          'temp/**'
        ]
      });

      const documents = await loader.load();
      
      // Filter and categorize documents
      const categorizedDocs = documents.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          file_type: this.repositoryManager.getFileType(doc.metadata.source || ''),
          repository_url: repoUrl,
          branch: branch,
          loaded_at: new Date().toISOString()
        }
      }));

      console.log(`[${new Date().toISOString()}] ✅ REPOSITORY LOADING: Loaded ${categorizedDocs.length} documents`);
      return categorizedDocs;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPOSITORY LOADING: Error loading repository:`, error.message);
      return [];
    }
  }

  /**
   * Apply intelligent preprocessing to documents
   */
  async intelligentProcessDocuments(documents) {
    console.log(`[${new Date().toISOString()}] 🧠 REPOSITORY PREPROCESSING: Applying semantic analysis and code understanding...`);

    const processedDocs = [];
    
    for (const doc of documents) {
      try {
        let processedDoc = { ...doc };

        // Apply semantic preprocessing if available
        if (this.semanticPreprocessor && doc.metadata.file_type === 'code') {
          processedDoc = await this.semanticPreprocessor.preprocessDocument(processedDoc);
        }

        // Add repository-specific metadata
        processedDoc.metadata = {
          ...processedDoc.metadata,
          processing_method: 'intelligent_analysis',
          content_length: processedDoc.pageContent.length,
          preprocessing_applied: !!this.semanticPreprocessor
        };

        processedDocs.push(processedDoc);

      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ REPOSITORY: Error preprocessing ${doc.metadata.source}:`, error.message);
        processedDocs.push(doc); // Use original if preprocessing fails
      }
    }

    console.log(`[${new Date().toISOString()}] 🧠 REPOSITORY PREPROCESSING: Processed ${processedDocs.length} documents with intelligent analysis`);
    return processedDocs;
  }

  /**
   * Split documents using intelligent AST-based chunking
   */
  async intelligentSplitDocuments(documents) {
    console.log(`[${new Date().toISOString()}] ✂️  REPOSITORY SPLITTING: Applying AST-based intelligent chunking for ${documents.length} documents`);
    console.log(`[${new Date().toISOString()}] 🎯 STRATEGY: Using Abstract Syntax Tree parsing for code files, semantic boundaries for text`);

    const allChunks = [];
    let codeFileCount = 0;
    let textFileCount = 0;
    
    for (const doc of documents) {
      try {
        let chunks;

        // Use AST-based splitting for code files if available
        if (this.astBasedSplitter && doc.metadata.file_type === 'code') {
          chunks = await this.astBasedSplitter.splitDocument(doc);
          codeFileCount++;
          console.log(`[${new Date().toISOString()}] 🌳 REPOSITORY: AST split ${doc.metadata.source} into ${chunks.length} chunks`);
        } else {
          chunks = await this.standardSplitDocument(doc);
          textFileCount++;
          console.log(`[${new Date().toISOString()}] 📄 REPOSITORY: Text split ${doc.metadata.source} into ${chunks.length} chunks`);
        }

        // Add chunk-specific metadata
        const enrichedChunks = chunks.map((chunk, index) => ({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            chunk_index: index,
            total_chunks: chunks.length,
            splitting_method: doc.metadata.file_type === 'code' && this.astBasedSplitter ? 'ast_based' : 'text_based',
            original_document: doc.metadata.source
          }
        }));

        allChunks.push(...enrichedChunks);

      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ REPOSITORY: Failed to split ${doc.metadata.source}, using fallback:`, error.message);
        
        // Fallback to standard splitting
        const fallbackChunks = await this.standardSplitDocument(doc);
        allChunks.push(...fallbackChunks.map(chunk => ({
          ...chunk,
          metadata: {
            ...chunk.metadata,
            splitting_method: 'fallback_standard'
          }
        })));
      }
    }

    console.log(`[${new Date().toISOString()}] ✂️  REPOSITORY SPLITTING COMPLETE: ${codeFileCount} code files (AST), ${textFileCount} text files (standard), ${allChunks.length} total chunks`);
    return allChunks;
  }

  /**
   * Standard text-based document splitting
   */
  async standardSplitDocument(doc) {
    // Configure splitter based on file type
    let chunkSize, chunkOverlap, separators;
    
    if (doc.metadata.file_type === 'code') {
      chunkSize = 1000;
      chunkOverlap = 100;
      separators = ['\n\nclass ', '\n\nfunction ', '\n\nconst ', '\n\n', '\n', ' ', ''];
    } else if (doc.metadata.file_type === 'markdown') {
      chunkSize = 1500;
      chunkOverlap = 200;
      separators = ['\n## ', '\n### ', '\n\n', '\n', ' ', ''];
    } else {
      chunkSize = 1200;
      chunkOverlap = 150;
      separators = ['\n\n', '\n', ' ', ''];
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators
    });

    return await splitter.splitDocuments([doc]);
  }

  /**
   * Enhance documents with domain knowledge
   */
  async enhanceWithDomainKnowledge(documents) {
    if (!this.ubiquitousLanguageProcessor) {
      console.log(`[${new Date().toISOString()}] ℹ️ REPOSITORY: No ubiquitous language processor available, skipping enhancement`);
      return documents;
    }

    console.log(`[${new Date().toISOString()}] 🎯 REPOSITORY ENHANCEMENT: Applying domain knowledge to ${documents.length} chunks...`);

    const enhancedDocs = [];
    
    for (const doc of documents) {
      try {
        const enhancedDoc = await this.ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(doc);
        enhancedDocs.push(enhancedDoc);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ REPOSITORY: Error enhancing document:`, error.message);
        enhancedDocs.push(doc); // Use original if enhancement fails
      }
    }

    console.log(`[${new Date().toISOString()}] 🎯 REPOSITORY ENHANCEMENT: Enhanced ${enhancedDocs.length} chunks with domain knowledge`);
    return enhancedDocs;
  }

  /**
   * Store repository documents in vector database
   */
  async storeRepositoryDocuments(documents, namespace) {
    console.log(`[${new Date().toISOString()}] 🗄️ REPOSITORY STORAGE: Storing ${documents.length} repository chunks in namespace '${namespace}'`);

    if (!this.pinecone) {
      console.warn(`[${new Date().toISOString()}] ⚠️ REPOSITORY: Pinecone not available, skipping storage`);
      return;
    }

    try {
      const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      const vectorStore = new PineconeStore(this.embeddings, {
        pineconeIndex: index,
        namespace: namespace
      });

      // Generate unique IDs
      const documentIds = documents.map((doc, index) => {
        const sanitizedSource = this.repositoryManager.sanitizeId(doc.metadata.source || 'repo');
        const sanitizedMethod = this.repositoryManager.sanitizeId(doc.metadata.splitting_method || 'unknown');
        return `repo_${sanitizedSource}_${sanitizedMethod}_chunk_${index}`;
      });

      // Store with rate limiting if available
      if (this.pineconeLimiter) {
        await this.pineconeLimiter.schedule(async () => {
          await vectorStore.addDocuments(documents, { ids: documentIds });
        });
      } else {
        await vectorStore.addDocuments(documents, { ids: documentIds });
      }

      console.log(`[${new Date().toISOString()}] ✅ REPOSITORY STORAGE: Successfully stored ${documents.length} repository chunks`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPOSITORY STORAGE: Error storing documents:`, error.message);
      throw error;
    }
  }
}

module.exports = RepositoryProcessor;
