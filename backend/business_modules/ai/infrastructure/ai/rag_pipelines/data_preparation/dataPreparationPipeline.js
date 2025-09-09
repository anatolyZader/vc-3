// DataPreparationPipeline.js - REFACTORED WITH MODULAR ORCHESTRATORS
"use strict";

const SemanticPreprocessor = require('./processors/semanticPreprocessor');
const ASTCodeSplitter = require('./processors/aSTCodeSplitter');

// Import all specialized processors
const UbiquitousLanguageProcessor = require('./processors/ubiquitousLanguageProcessor');
const RepositoryManager = require('./processors/repositoryManager');
const VectorStorageManager = require('./processors/vectorStorageManager');
const ApiSpecProcessor = require('./processors/apiSpecProcessor');
const MarkdownDocumentationProcessor = require('./processors/markdownDocumentationProcessor');
const RepositoryProcessor = require('./processors/repositoryProcessor');

// Import modular orchestrators
const CommitManager = require('./orchestrators/commitManager');
const DocumentProcessingOrchestrator = require('./orchestrators/documentProcessingOrchestrator');
const ProcessingStrategyManager = require('./orchestrators/processingStrategyManager');
const EventManager = require('./orchestrators/eventManager');
// Optional LangSmith tracing
let traceable;
try {
  ({ traceable } = require('langsmith/traceable'));
} catch (_) {
  // silent if not installed
}

/**
 * REFACTORED DataPreparationPipeline - Now uses modular orchestrators for better organization
 * 
 * This pipeline serves as a coordination hub with modular orchestrators:
 * - CommitManager: Handles commit operations and change detection
 * - DocumentProcessingOrchestrator: Coordinates specialized processors
 * - ProcessingStrategyManager: Manages processing strategies and workflows
 * - EventManager: Manages event emission and status reporting
 */
class DataPreparationPipeline {
  constructor(options = {}) {
    console.log(`[${new Date().toISOString()}] 🎯 INITIALIZING DataPreparationPipeline with modular architecture`);
    console.log(`[${new Date().toISOString()}] 🎯 Using specialized orchestrators for better code organization`);
    
    // Store dependencies passed from the adapter
    this.embeddings = options.embeddings;
    this.pinecone = options.pinecone;
    this.eventBus = options.eventBus;
    this.pineconeLimiter = options.pineconeLimiter;
    
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
    
    this.vectorStorageManager = new VectorStorageManager({
      embeddings: this.embeddings,
      pinecone: this.pinecone,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repositoryManager
    });

    // Initialize dedicated processors for each information source
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

    // Initialize modular managers
    this.commitManager = new CommitManager({
      repositoryManager: this.repositoryManager
    });

    this.documentOrchestrator = new DocumentProcessingOrchestrator({
      ubiquitousLanguageProcessor: this.ubiquitousLanguageProcessor,
      apiSpecProcessor: this.apiSpecProcessor,
      markdownDocumentationProcessor: this.markdownDocumentationProcessor,
      repositoryProcessor: this.repositoryProcessor,
      repositoryManager: this.repositoryManager
    });

    this.strategyManager = new ProcessingStrategyManager({
      commitManager: this.commitManager,
      documentOrchestrator: this.documentOrchestrator,
      repositoryManager: this.repositoryManager,
      repositoryProcessor: this.repositoryProcessor,
      pinecone: this.pinecone
    });

    this.eventManager = new EventManager({
      eventBus: this.eventBus
    });

    // Enhanced processing strategy
    this.processingStrategy = {
      preferGitHubAPI: true, // Try GitHub API first for public repos
      fallbackToLocalGit: true, // Fallback to local git when needed
      langchainFirst: true // Always use Langchain for document loading
    };
    
    console.log(`[${new Date().toISOString()}] ✅ PIPELINE READY: DataPreparationPipeline initialized with modular architecture`);

    this.enableTracing = process.env.LANGSMITH_TRACING === 'true' && !!traceable;
    if (this.enableTracing) {
      try {
        this.processPushedRepo = traceable(
          this.processPushedRepo.bind(this),
          {
            name: 'DataPreparationPipeline.processPushedRepo',
            metadata: { component: 'DataPreparationPipeline' },
            tags: ['rag', 'ingestion']
          }
        );
        console.log(`[${new Date().toISOString()}] [TRACE] DataPreparationPipeline tracing enabled.`);
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] [TRACE] Failed to enable DataPreparationPipeline tracing: ${err.message}`);
      }
    }
  }

  /**
   * REFACTORED: Main entry point - uses modular managers for orchestration
   */
  async processPushedRepo(userId, repoId, repoData) {
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Processing repo for user ${userId}: ${repoId}`);
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Received repoData structure:`, JSON.stringify(repoData, null, 2)); 
    
    console.log(`[${new Date().toISOString()}] 🎯 ORCHESTRATION: Using modular managers for coordinated processing`);
    
    // Emit starting status
    this.eventManager.emitProcessingStarted(userId, repoId);

    try {
      console.log(`[${new Date().toISOString()}] 🔵 STAGE 1: REPOSITORY VALIDATION & SETUP`);
      console.log(`[${new Date().toISOString()}] 🎯 EXPLANATION: Validating repository data and checking for duplicates`);
      
      // Validate repoData structure
      if (!repoData?.url || !repoData?.branch) {
        throw new Error(`Invalid repository data: ${JSON.stringify(repoData)}`);
      }

      const { url, branch } = repoData;
      const urlParts = url.split('/');
      const githubOwner = urlParts[urlParts.length - 2];
      const repoName = urlParts[urlParts.length - 1].replace('.git', '');

      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Extracted GitHub owner: ${githubOwner}, repo name: ${repoName}`);

      // OPTIMIZED: Smart commit tracking using CommitManager
      console.log(`[${new Date().toISOString()}] 🔄 OPTIMIZED PROCESSING: Using Langchain-first approach with smart commit detection`);
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Processing ${githubOwner}/${repoName} with optimized strategy`);

      // Step 1: Try to get commit info efficiently using CommitManager
      const commitInfo = await this.commitManager.getCommitInfoOptimized(url, branch, githubOwner, repoName);
      
      if (!commitInfo) {
        throw new Error('Failed to retrieve commit information');
      }

      console.log(`[${new Date().toISOString()}] 🔑 COMMIT DETECTED: ${commitInfo.hash.substring(0, 8)} - ${commitInfo.subject}`);

      // Step 2: Enhanced duplicate check with commit hash comparison
      const existingRepo = await this.repositoryManager.findExistingRepo(
        userId, repoId, githubOwner, repoName, commitInfo.hash, this.pinecone
      );
      
      if (existingRepo) {
        if (existingRepo.reason === 'same_commit') {
          console.log(`[${new Date().toISOString()}] ⏭️ SKIPPING: Repository at same commit (${commitInfo.hash.substring(0, 8)}), no changes to process`);
          this.eventManager.emitProcessingSkipped(userId, repoId, 'No changes - same commit hash', commitInfo.hash);
          
          return { 
            success: true, 
            message: 'Repository already processed at same commit', 
            repoId, userId,
            commitHash: commitInfo.hash,
            skipped: true
          };
        } else if (existingRepo.reason === 'commit_changed' && existingRepo.requiresIncremental) {
          console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL PROCESSING: Repository has changes, using ProcessingStrategyManager`);
          return await this.strategyManager.processIncrementalOptimized(
            userId, repoId, url, branch, githubOwner, repoName,
            existingRepo.existingCommitHash, commitInfo
          );
        }
      }

      console.log(`[${new Date().toISOString()}] 🆕 FULL PROCESSING: New repository or major changes, using ProcessingStrategyManager`);
      const result = await this.strategyManager.processFullRepositoryOptimized(
        userId, repoId, url, branch, githubOwner, repoName, commitInfo
      );

      // Emit completion event
      this.eventManager.emitProcessingCompleted(userId, repoId, result);
      
      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in orchestration for repository ${repoId}:`, error.message);
      
      this.eventManager.emitProcessingError(userId, repoId, error, 'repository_orchestration');
      
      return {
        success: false,
        error: `Repository orchestration failed: ${error.message}`,
        userId, repoId
      };
    }
  }

  /**
   * Process incremental changes between commits - delegates to ProcessingStrategyManager
   */
  async processIncrementalChanges(userId, repoId, repoData, tempDir, githubOwner, repoName, branch, oldCommitHash, newCommitHash, commitInfo) {
    // Group parameters to reduce count
    const repoInfo = { githubOwner, repoName, branch };
    const commitHashes = { oldCommitHash, newCommitHash };
    
    return await this.strategyManager.processIncrementalChanges(
      userId, repoId, repoData, tempDir, repoInfo, commitHashes, commitInfo
    );
  }

  /**
   * Process full repository - delegates to DocumentProcessingOrchestrator
   */
  async processFullRepository(userId, repoId, repoData, tempDir, githubOwner, repoName, branch, commitInfo) {
    return await this.documentOrchestrator.processFullRepositoryWithProcessors(
      userId, repoId, tempDir, githubOwner, repoName, branch, commitInfo
    );
  }

  /**
   * Index core documentation - directly coordinates specialized processors
   */
  async indexCoreDocsToPinecone(namespace = 'core-docs', clearFirst = false) {
    console.log(`[${new Date().toISOString()}] 🎯 CORE DOCS: Starting comprehensive core documentation processing`);
    console.log(`[${new Date().toISOString()}] 🎯 Using specialized processors: API specs + markdown documentation`);
    
    try {
      // Clear namespace if requested
      if (clearFirst && this.pinecone) {
        console.log(`[${new Date().toISOString()}] 🧹 CORE DOCS: Clearing existing docs in namespace '${namespace}'`);
        try {
          const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
          await index.namespace(namespace).deleteAll();
          console.log(`[${new Date().toISOString()}] ✅ CORE DOCS: Successfully cleared namespace '${namespace}'`);
        } catch (clearError) {
          console.warn(`[${new Date().toISOString()}] ⚠️ CORE DOCS: Could not clear namespace:`, clearError.message);
        }
      }

      const results = {
        success: true,
        apiSpecResults: null,
        markdownResults: null,
        totalDocuments: 0,
        totalChunks: 0,
        namespace,
        processedAt: new Date().toISOString()
      };

      // Process API specifications using specialized processor
      try {
        console.log(`[${new Date().toISOString()}] 🔵 CORE DOCS: Processing API specifications...`);
        results.apiSpecResults = await this.apiSpecProcessor.processApiSpec(namespace);
        results.totalDocuments += results.apiSpecResults.documentsProcessed || 0;
        results.totalChunks += results.apiSpecResults.chunksGenerated || 0;
      } catch (apiError) {
        console.error(`[${new Date().toISOString()}] ❌ CORE DOCS: API spec processing failed:`, apiError.message);
        results.apiSpecError = apiError.message;
      }

      // Process markdown documentation using specialized processor
      try {
        console.log(`[${new Date().toISOString()}] 📚 CORE DOCS: Processing markdown documentation...`);
        results.markdownResults = await this.markdownDocumentationProcessor.processMarkdownDocumentation(namespace);
        results.totalDocuments += results.markdownResults.documentsProcessed || 0;
        results.totalChunks += results.markdownResults.chunksGenerated || 0;
      } catch (markdownError) {
        console.error(`[${new Date().toISOString()}] ❌ CORE DOCS: Markdown processing failed:`, markdownError.message);
        results.markdownError = markdownError.message;
      }

      console.log(`[${new Date().toISOString()}] ✅ CORE DOCS PROCESSING COMPLETE: Processed ${results.totalDocuments} documents into ${results.totalChunks} chunks`);
      return results;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ CORE DOCS: Core documentation processing failed:`, error.message);
      return {
        success: false,
        error: error.message,
        namespace,
        processedAt: new Date().toISOString()
      };
    }
  }

  emitRagStatus(status, details = {}) {
    return this.eventManager.emitRagStatus(status, details);
  }
}

module.exports = DataPreparationPipeline;
