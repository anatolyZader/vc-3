// DataPreparationPipeline.js - REFACTORED WITH MODULAR MANAGERS
"use strict";

const SemanticPreprocessor = require('./processors/SemanticPreprocessor');
const ASTCodeSplitter = require('./processors/ASTCodeSplitter');

// Import all specialized processors
const UbiquitousLanguageProcessor = require('./processors/UbiquitousLanguageProcessor');
const RepositoryManager = require('./processors/RepositoryManager');
const VectorStorageManager = require('./processors/VectorStorageManager');
const ApiSpecProcessor = require('./processors/ApiSpecProcessor');
const MarkdownDocumentationProcessor = require('./processors/MarkdownDocumentationProcessor');
const RepositoryProcessor = require('./processors/RepositoryProcessor');

// Import modular managers
const CommitManager = require('./managers/CommitManager');
const DocumentProcessingOrchestrator = require('./managers/DocumentProcessingOrchestrator');
const ProcessingStrategyManager = require('./managers/ProcessingStrategyManager');
const CoreDocumentationIndexer = require('./managers/CoreDocumentationIndexer');
const EventManager = require('./managers/EventManager');
const LegacyCompatibilityLayer = require('./managers/LegacyCompatibilityLayer');

/**
 * REFACTORED DataPreparationPipeline - Now uses modular managers for better organization
 * 
 * This pipeline serves as a coordination hub with modular managers:
 * - CommitManager: Handles commit operations and change detection
 * - DocumentProcessingOrchestrator: Coordinates specialized processors
 * - ProcessingStrategyManager: Manages processing strategies and workflows
 * - CoreDocumentationIndexer: Handles core documentation indexing
 * - EventManager: Manages event emission and status reporting
 * - LegacyCompatibilityLayer: Provides backward compatibility
 */
class DataPreparationPipeline {
  constructor(options = {}) {
    console.log(`[${new Date().toISOString()}] 🎯 INITIALIZING DataPreparationPipeline with modular architecture`);
    console.log(`[${new Date().toISOString()}] 🎯 Using specialized managers for better code organization`);
    
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

    this.coreDocIndexer = new CoreDocumentationIndexer({
      apiSpecProcessor: this.apiSpecProcessor,
      markdownDocumentationProcessor: this.markdownDocumentationProcessor,
      pinecone: this.pinecone
    });

    this.eventManager = new EventManager({
      eventBus: this.eventBus
    });

    this.legacyLayer = new LegacyCompatibilityLayer({
      repositoryManager: this.repositoryManager,
      ubiquitousLanguageProcessor: this.ubiquitousLanguageProcessor,
      vectorStorageManager: this.vectorStorageManager,
      semanticPreprocessor: this.semanticPreprocessor,
      repositoryProcessor: this.repositoryProcessor,
      pinecone: this.pinecone
    });

    // Enhanced processing strategy
    this.processingStrategy = {
      preferGitHubAPI: true, // Try GitHub API first for public repos
      fallbackToLocalGit: true, // Fallback to local git when needed
      langchainFirst: true // Always use Langchain for document loading
    };
    
    console.log(`[${new Date().toISOString()}] ✅ PIPELINE READY: DataPreparationPipeline initialized with modular architecture`);
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
   * Index core documentation - delegates to CoreDocumentationIndexer
   */
  async indexCoreDocsToPinecone(namespace = 'core-docs', clearFirst = false) {
    return await this.coreDocIndexer.indexCoreDocsToPinecone(namespace, clearFirst);
  }

  // LEGACY COMPATIBILITY METHODS - Delegate to LegacyCompatibilityLayer
  
  async processDocuments(documents, repoId, githubOwner, repoName) {
    return await this.legacyLayer.processDocuments(documents, repoId, githubOwner, repoName);
  }

  emitRagStatus(status, details = {}) {
    return this.eventManager.emitRagStatus(status, details);
  }

  sanitizeId(input) { 
    return this.legacyLayer.sanitizeId(input); 
  }
  
  getFileType(filePath) { 
    return this.legacyLayer.getFileType(filePath); 
  }
  
  enhanceWithUbiquitousLanguage(document) { 
    return this.legacyLayer.enhanceWithUbiquitousLanguage(document); 
  }
  
  async storeToPinecone(documents, namespace, githubOwner, repoName) { 
    return await this.legacyLayer.storeToPinecone(documents, namespace, githubOwner, repoName); 
  }
  
  async intelligentSplitDocuments(documents) { 
    return await this.legacyLayer.intelligentSplitDocuments(documents); 
  }
  
  async cloneRepository(url, branch) { 
    return await this.legacyLayer.cloneRepository(url, branch); 
  }
  
  async cleanupTempDir(tempDir) { 
    return await this.legacyLayer.cleanupTempDir(tempDir); 
  }
  
  async findExistingRepo(userId, repoId, githubOwner, repoName, currentCommitHash = null) { 
    return await this.legacyLayer.findExistingRepo(userId, repoId, githubOwner, repoName, currentCommitHash); 
  }
  
  async loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName) { 
    return await this.legacyLayer.loadAndProcessRepoDocuments(tempDir, userId, repoId, githubOwner, repoName); 
  }
}

module.exports = DataPreparationPipeline;
