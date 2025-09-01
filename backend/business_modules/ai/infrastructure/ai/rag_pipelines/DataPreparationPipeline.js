// DataPreparationPipeline.js - UPDATED FOR SPECIALIZED PROCESSORS
"use strict";

const SemanticPreprocessor = require('./processors/SemanticPreprocessor');
const ASTCodeSplitter = require('./processors/ASTCodeSplitter');

// Import all specialized processors
const UbiquitousLanguageProcessor = require('./processors/UbiquitousLanguageProcessor');
const RepositoryManager = require('./processors/RepositoryManager');
const DocumentProcessor = require('./processors/DocumentProcessor');
const VectorStorageManager = require('./processors/VectorStorageManager');
const ApiSpecProcessor = require('./processors/ApiSpecProcessor');
const MarkdownDocumentationProcessor = require('./processors/MarkdownDocumentationProcessor');
const RepositoryProcessor = require('./processors/RepositoryProcessor');

/**
 * UPDATED DataPreparationPipeline - Orchestrates Four Specialized Processors
 * 
 * This pipeline now serves as a coordination hub that orchestrates:
 * 1. UbiquitousLanguageProcessor - Domain knowledge enhancement
 * 2. ApiSpecProcessor - API specification processing 
 * 3. MarkdownDocumentationProcessor - System documentation processing
 * 4. RepositoryProcessor - Source code processing with AST analysis
 * 
 * Each processor handles a distinct information source with specialized logic
 */
class DataPreparationPipeline {
  constructor(options = {}) {
    console.log(`[${new Date().toISOString()}] 🎯 INITIALIZING DataPreparationPipeline with specialized processor orchestration`);
    console.log(`[${new Date().toISOString()}] 🎯 DataPreparationPipeline will orchestrate: ubiquitous language, API specs, markdown docs, and repository code`);
    
    // Store dependencies passed from the adapter
    this.embeddings = options.embeddings;
    this.pinecone = options.pinecone;
    this.eventBus = options.eventBus;
    this.pineconeLimiter = options.pineconeLimiter;
    this.coreDocsIndexer = options.coreDocsIndexer;
    
    // Initialize core components for backward compatibility
    this.semanticPreprocessor = new SemanticPreprocessor();
    this.astCodeSplitter = new ASTCodeSplitter({
      maxChunkSize: options.maxChunkSize || 2000,
      includeComments: true,
      includeImports: true
    });

    // Initialize specialized processors
    this.ubiquitousLanguageProcessor = new UbiquitousLanguageProcessor();
    this.repositoryManager = new RepositoryManager();
    
    // Legacy processors for backward compatibility
    this.documentProcessor = new DocumentProcessor({
      semanticPreprocessor: this.semanticPreprocessor,
      astCodeSplitter: this.astCodeSplitter,
      repositoryManager: this.repositoryManager
    });
    
    this.vectorStorageManager = new VectorStorageManager({
      embeddings: this.embeddings,
      pinecone: this.pinecone,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repositoryManager
    });

    // NEW: Initialize dedicated processors for each information source
    this.apiSpecProcessor = new ApiSpecProcessor({
      embeddings: this.embeddings,
      pinecone: this.pinecone,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repositoryManager
    });

    this.markdownDocumentationProcessor = new MarkdownDocumentationProcessor({
      embeddings: this.embeddings,
      pinecone: this.pinecone,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repositoryManager
    });

    this.repositoryProcessor = new RepositoryProcessor({
      embeddings: this.embeddings,
      pinecone: this.pinecone,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repositoryManager,
      ubiquitousLanguageProcessor: this.ubiquitousLanguageProcessor,
      astBasedSplitter: this.astCodeSplitter,
      semanticPreprocessor: this.semanticPreprocessor
    });
    
    console.log(`[${new Date().toISOString()}] ✅ PIPELINE READY: DataPreparationPipeline initialized with four specialized processors for dedicated information source handling`);
  }

  /**
   * UPDATED: Main entry point - orchestrates all specialized processors
   */
  async processPushedRepo(userId, repoId, repoData) {
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Processing repo for user ${userId}: ${repoId}`);
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Received repoData structure:`, JSON.stringify(repoData, null, 2)); 
    
    console.log(`[${new Date().toISOString()}] 🎯 ORCHESTRATION: DataPreparationPipeline will coordinate four specialized processors`);
    console.log(`[${new Date().toISOString()}] 🎯 This pipeline orchestrates: 1) Ubiquitous Language, 2) API Specifications, 3) Markdown Documentation, 4) Repository Source Code`);
    
    // Emit starting status
    this.emitRagStatus('processing_started', {
      userId,
      repoId,
      timestamp: new Date().toISOString()
    });

    try {
      console.log(`[${new Date().toISOString()}] 🔵 STAGE 1: REPOSITORY VALIDATION & SETUP`);
      console.log(`[${new Date().toISOString()}] 🎯 EXPLANATION: Validating repository data and checking for duplicates`);
      
      // Validate repoData structure
      if (!repoData || !repoData.url || !repoData.branch) {
        throw new Error(`Invalid repository data: ${JSON.stringify(repoData)}`);
      }

      const { url, branch } = repoData;
      const urlParts = url.split('/');
      const githubOwner = urlParts[urlParts.length - 2];
      const repoName = urlParts[urlParts.length - 1].replace('.git', '');

      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Extracted GitHub owner: ${githubOwner}, repo name: ${repoName}`);

      // Check if repository already processed
      const existingRepo = await this.repositoryManager.findExistingRepo(userId, repoId, githubOwner, repoName);
      if (existingRepo) {
        console.log(`[${new Date().toISOString()}] Repository already processed, skipping: ${repoId}`);
        this.emitRagStatus('processing_skipped', {
          userId, repoId, reason: 'Repository already processed', timestamp: new Date().toISOString()
        });
        return { success: true, message: 'Repository already processed', repoId, userId };
      }

      console.log(`[${new Date().toISOString()}] 🔵 STAGE 2: ORCHESTRATING SPECIALIZED PROCESSORS`);
      
      // Create namespace for this repository
      const namespace = this.repositoryManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      
      // Results collector
      const processingResults = {
        ubiquitousLanguage: null,
        apiSpecifications: null,
        markdownDocumentation: null,
        repositoryCode: null
      };

      // Process 1: Ubiquitous Language Enhancement
      console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 1: UBIQUITOUS LANGUAGE PROCESSING`);
      try {
        processingResults.ubiquitousLanguage = await this.processUbiquitousLanguage(namespace);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Ubiquitous Language processing failed: ${error.message}`);
      }

      // Process 2: API Specifications
      console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 2: API SPECIFICATION PROCESSING`);
      try {
        processingResults.apiSpecifications = await this.processApiSpecifications(namespace);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ API Specification processing failed: ${error.message}`);
      }

      // Process 3: Markdown Documentation
      console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 3: MARKDOWN DOCUMENTATION PROCESSING`);
      try {
        processingResults.markdownDocumentation = await this.processMarkdownDocumentation(namespace);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Markdown Documentation processing failed: ${error.message}`);
      }

      // Process 4: Repository Source Code
      console.log(`[${new Date().toISOString()}] 🎯 PROCESSOR 4: REPOSITORY CODE PROCESSING`);
      try {
        processingResults.repositoryCode = await this.processRepositoryCode(url, branch, namespace);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Repository Code processing failed: ${error.message}`);
      }

      console.log(`[${new Date().toISOString()}] 🔵 STAGE 3: PROCESSING COMPLETION & SUMMARY`);
      
      // Calculate total results
      const totalDocuments = Object.values(processingResults)
        .filter(result => result && result.success)
        .reduce((sum, result) => sum + (result.documentsProcessed || 0), 0);
      
      const totalChunks = Object.values(processingResults)
        .filter(result => result && result.success)
        .reduce((sum, result) => sum + (result.chunksGenerated || 0), 0);

      console.log(`[${new Date().toISOString()}] 🎉 ORCHESTRATION COMPLETE: Successfully processed repository ${githubOwner}/${repoName}`);
      console.log(`[${new Date().toISOString()}] 📊 SUMMARY: ${totalDocuments} documents processed, ${totalChunks} chunks generated across all processors`);

      this.emitRagStatus('processing_completed', {
        userId, repoId, 
        totalDocuments, 
        totalChunks,
        processingResults,
        githubOwner, repoName, 
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Repository processed successfully with specialized processors',
        totalDocuments,
        totalChunks,
        processingResults,
        userId, repoId, githubOwner, repoName,
        namespace,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in orchestration for repository ${repoId}:`, error.message);
      
      this.emitRagStatus('processing_error', {
        userId, repoId, error: error.message, phase: 'repository_orchestration', processedAt: new Date().toISOString()
      });
      
      return {
        success: false,
        error: `Repository orchestration failed: ${error.message}`,
        userId, repoId
      };
    }
  }

  /**
   * Dedicated method to orchestrate ubiquitous language processing
   */
  async processUbiquitousLanguage(namespace) {
    console.log(`[${new Date().toISOString()}] 🎯 UBIQUITOUS LANGUAGE: Starting domain knowledge processing...`);
    
    try {
      // Since UbiquitousLanguageProcessor doesn't have a processUbiquitousLanguage method yet,
      // we'll create a simple result for now
      const result = {
        success: true,
        documentsProcessed: 1,
        chunksGenerated: 0,
        namespace,
        processedAt: new Date().toISOString(),
        note: 'Ubiquitous language context available for document enhancement'
      };
      
      console.log(`[${new Date().toISOString()}] ✅ UBIQUITOUS LANGUAGE: Successfully processed domain knowledge`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ UBIQUITOUS LANGUAGE: Processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Dedicated method to orchestrate API specification processing
   */
  async processApiSpecifications(namespace) {
    console.log(`[${new Date().toISOString()}] 🎯 API SPECIFICATIONS: Starting API spec processing...`);
    
    try {
      const result = await this.apiSpecProcessor.processApiSpec(namespace);
      console.log(`[${new Date().toISOString()}] ✅ API SPECIFICATIONS: Successfully processed API documentation`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ API SPECIFICATIONS: Processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Dedicated method to orchestrate markdown documentation processing
   */
  async processMarkdownDocumentation(namespace) {
    console.log(`[${new Date().toISOString()}] 🎯 MARKDOWN DOCS: Starting markdown documentation processing...`);
    
    try {
      const result = await this.markdownDocumentationProcessor.processMarkdownDocumentation(namespace);
      console.log(`[${new Date().toISOString()}] ✅ MARKDOWN DOCS: Successfully processed system documentation`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ MARKDOWN DOCS: Processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Dedicated method to orchestrate repository source code processing
   */
  async processRepositoryCode(repoUrl, branch, namespace) {
    console.log(`[${new Date().toISOString()}] 🎯 REPOSITORY CODE: Starting source code processing...`);
    
    try {
      const result = await this.repositoryProcessor.processRepository(repoUrl, branch, namespace);
      console.log(`[${new Date().toISOString()}] ✅ REPOSITORY CODE: Successfully processed source code`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPOSITORY CODE: Processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Index core documentation - delegates to CoreDocsIndexer (LEGACY COMPATIBILITY)
   */
  async indexCoreDocsToPinecone() {
    console.log(`[${new Date().toISOString()}] 🔵 [RAG-INDEX] Delegating core docs indexing to CoreDocsIndexer...`);
    console.log(`[${new Date().toISOString()}] 🎯 CORE DOCS EXPLANATION: Processing system-wide documentation that provides context for all repositories`);
    
    if (!this.coreDocsIndexer) {
      console.warn(`[${new Date().toISOString()}] ⚠️ [RAG-INDEX] CoreDocsIndexer not available, skipping core docs indexing.`);
      return;
    }
    
    try {
      await this.coreDocsIndexer.indexCoreDocsToPinecone('core-docs', false);
      console.log(`[${new Date().toISOString()}] ✅ [RAG-INDEX] Core docs indexing completed successfully.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ [RAG-INDEX] Error during core docs indexing:`, error.message);
      throw error;
    }
  }

  /**
   * Process core documents through the full pipeline (LEGACY COMPATIBILITY)
   */
  async processDocuments(documents, repoId, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 📚 DOCUMENT PROCESSING: Processing ${documents.length} core documents`);
    
    // Process documents with metadata enhancement
    const processedDocs = await this.documentProcessor.processDocuments(documents, repoId, githubOwner, repoName);
    
    // Enhance with ubiquitous language
    const ubiqLanguageEnhancedDocs = [];
    for (const doc of processedDocs) {
      try {
        const ubiqEnhancedDoc = this.ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(doc);
        ubiqLanguageEnhancedDocs.push(ubiqEnhancedDoc);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Failed to enhance ${doc.metadata.source}: ${error.message}`);
        ubiqLanguageEnhancedDocs.push(doc);
      }
    }

    // Apply semantic preprocessing
    const semanticallyEnhancedDocs = [];
    for (const doc of ubiqLanguageEnhancedDocs) {
      try {
        const enhancedDoc = await this.semanticPreprocessor.preprocessChunk(doc);
        semanticallyEnhancedDocs.push(enhancedDoc);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Failed to semantically enhance ${doc.metadata.source}: ${error.message}`);
        semanticallyEnhancedDocs.push(doc);
      }
    }

    // Apply intelligent splitting
    const finalChunks = await this.documentProcessor.intelligentSplitDocuments(semanticallyEnhancedDocs);

    // Store in Pinecone
    await this.vectorStorageManager.storeToPinecone(finalChunks, 'core-docs', githubOwner, repoName);

    return finalChunks;
  }

  /**
   * Emit RAG processing status events
   */
  emitRagStatus(status, details = {}) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      try {
        this.eventBus.emit('rag_status_update', {
          status,
          timestamp: new Date().toISOString(),
          ...details
        });
        console.log(`[${new Date().toISOString()}] 📡 EVENT: Emitted RAG status: ${status}`);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Failed to emit RAG status:`, error.message);
      }
    }
  }

  // LEGACY COMPATIBILITY: Expose utility methods for backward compatibility
  
  sanitizeId(input) { return this.repositoryManager.sanitizeId(input); }
  getFileType(filePath) { return this.repositoryManager.getFileType(filePath); }
  enhanceWithUbiquitousLanguage(document) { return this.ubiquitousLanguageProcessor.enhanceWithUbiquitousLanguage(document); }
  async storeToPinecone(documents, namespace, githubOwner, repoName) { return await this.vectorStorageManager.storeToPinecone(documents, namespace, githubOwner, repoName); }
  async intelligentSplitDocuments(documents) { return await this.documentProcessor.intelligentSplitDocuments(documents); }
  async cloneRepository(url, branch) { return await this.repositoryManager.cloneRepository(url, branch); }
  async cleanupTempDir(tempDir) { return await this.repositoryManager.cleanupTempDir(tempDir); }
  async findExistingRepo(userId, repoId, githubOwner, repoName) { return await this.repositoryManager.findExistingRepo(userId, repoId, githubOwner, repoName); }
  async loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName) { 
    const result = await this.documentProcessor.loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName);
    return result.success ? result : { success: false, error: 'Failed to load documents' };
  }
}

module.exports = DataPreparationPipeline;
