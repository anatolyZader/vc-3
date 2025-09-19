// DataPreparationPipeline.js - REFACTORED WITH MODULAR ORCHESTRATORS
"use strict";

const EventManager = require('./orchestrators/eventManager');
const PineconePlugin = require('../../pinecone/pineconePlugin');
const SemanticPreprocessor = require('./processors/semanticPreprocessor');
const UbiquitousLanguageEnhancer = require('./processors/ubiquitousLanguageEnhancer');
const ApiSpecProcessor = require('./processors/apiSpecProcessor');
const DocsProcessor = require('./processors/markdownDocumentationProcessor');
const RepoSelectionManager = require('./processors/repositoryManager');
const CommitSelectionManager = require('./orchestrators/commitManager');
const ASTCodeSplitter = require('./processors/aSTCodeSplitter');
const RepoProcessorUtils = require('./processors/optimizedRepositoryProcessor');
const RepoProcessor = require('./orchestrators/repositoryProcessingOrchestrator');
const EmbeddingManager = require('./processors/embeddingManager');

let traceable;
try {
  ({ traceable } = require('langsmith/traceable'));
} catch (err) {
  if (process.env.LANGSMITH_TRACING === 'true') {
    console.warn(`[${new Date().toISOString()}] [TRACE] LangSmith traceable not available: ${err.message}`);
  }
}

/**
 * REFACTORED DataPreparationPipeline - Now uses modular orchestrators for better organization
 * 
 * This pipeline serves as a coordination hub with modular orchestrators:
 * - CommitManager: Handles commit operations and change detection
 * - RepoProcessor: Main repository content processing
 * - EventManager: Manages event emission and status reporting
 * - Processing strategies: Integrated directly for simpler architecture
 */
class DataPreparationPipeline {
  constructor(options = {}) {
    console.log(`[${new Date().toISOString()}] 🎯 INITIALIZING DataPreparationPipeline with modular architecture`);
    console.log(`[${new Date().toISOString()}] 🎯 Using specialized orchestrators for better code organization`);
    
    // Store dependencies passed from the adapter
    this.embeddings = options.embeddings;
    this.eventBus = options.eventBus;
    this.pineconeLimiter = options.pineconeLimiter;
    
    // Initialize shared Pinecone connection manager
    this.pineconeManager = new PineconePlugin();
    
    // Initialize core components for backward compatibility
    this.semanticPreprocessor = new SemanticPreprocessor();
    this.astCodeSplitter = new ASTCodeSplitter({
      maxChunkSize: options.maxChunkSize || 2000,
      includeComments: true,
      includeImports: true
    });

    // Initialize specialized processors
    this.ubiquitousLanguageProcessor = new UbiquitousLanguageEnhancer();
    this.repoSelectionManager = new RepoSelectionManager();
    
    this.embeddingManager = new EmbeddingManager({
      embeddings: this.embeddings,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repoSelectionManager,
      pineconeManager: this.pineconeManager
    });

    // Initialize dedicated processors for each information source
    this.apiSpecProcessor = new ApiSpecProcessor({
      embeddings: this.embeddings,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repoSelectionManager,
      pineconeManager: this.pineconeManager
    });

    this.docsProcessor = new DocsProcessor({
      embeddings: this.embeddings,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repoSelectionManager,
      pineconeManager: this.pineconeManager
    });

    // Initialize modular managers
    this.commitSelectionManager = new CommitSelectionManager({
      repositoryManager: this.repoSelectionManager
    });

    this.repoProcessorUtils = new RepoProcessorUtils({
      embeddings: this.embeddings,
      pineconeLimiter: this.pineconeLimiter,
      repositoryManager: this.repoSelectionManager,
      commitManager: this.commitSelectionManager,
      pineconeManager: this.pineconeManager,
      ubiquitousLanguageProcessor: this.ubiquitousLanguageProcessor,
      astBasedSplitter: this.astCodeSplitter,
      semanticPreprocessor: this.semanticPreprocessor
    });

    this.repoProcessor = new RepoProcessor({
      ubiquitousLanguageProcessor: this.ubiquitousLanguageProcessor,
      apiSpecProcessor: this.apiSpecProcessor,
      markdownDocumentationProcessor: this.docsProcessor,
      repositoryProcessor: this.repoProcessorUtils,
      repositoryManager: this.repoSelectionManager
    });

    this.eventManager = new EventManager({
      eventBus: this.eventBus
    });

    // Get the shared Pinecone service from the connection manager for vector operations
    this.pineconeService = this.pineconeManager?.getPineconeService();
    this.pinecone = this.pineconeService; // For backward compatibility

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
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { component: 'DataPreparationPipeline' },
            tags: ['rag', 'ingestion']
          }
        );
        console.log(`[${new Date().toISOString()}] [TRACE] DataPreparationPipeline tracing enabled.`);
  console.log(`[${new Date().toISOString()}] [TRACE] DataPreparationPipeline tracing env summary: project=${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'} apiKeySet=${!!process.env.LANGSMITH_API_KEY} workspaceIdSet=${!!process.env.LANGSMITH_WORKSPACE_ID}`);
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
      const commitInfo = await this.commitSelectionManager.getCommitInfoOptimized(url, branch, githubOwner, repoName);
      
      if (!commitInfo) {
        throw new Error('Failed to retrieve commit information');
      }

      console.log(`[${new Date().toISOString()}] 🔑 COMMIT DETECTED: ${commitInfo.hash.substring(0, 8)} - ${commitInfo.subject}`);

      // Step 2: Enhanced duplicate check with commit hash comparison
      const existingRepo = await this.repoSelectionManager.findExistingRepo(
        userId, repoId, githubOwner, repoName, commitInfo.hash
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
          console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL PROCESSING: Repository has changes, using integrated strategy`);
          return await this.processIncrementalOptimized(
            userId, repoId, url, branch, githubOwner, repoName,
            existingRepo.existingCommitHash, commitInfo
          );
        }
      }

      console.log(`[${new Date().toISOString()}] 🆕 FULL PROCESSING: New repository or major changes, using integrated strategy`);
      const result = await this.processFullRepositoryOptimized(
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
   * Process incremental changes between commits - now integrated directly
   */
  async processIncrementalChanges(userId, repoId, repoData, tempDir, githubOwner, repoName, branch, oldCommitHash, newCommitHash, commitInfo) {
    // Group parameters to reduce count
    const repoInfo = { githubOwner, repoName, branch };
    const commitHashes = { oldCommitHash, newCommitHash };
    
    return await this.processIncrementalChangesInternal(
      userId, repoId, repoData, tempDir, repoInfo, commitHashes, commitInfo
    );
  }

  /**
   * Process full repository - delegates to RepoProcessor
   */
  async processFullRepository(userId, repoId, repoData, tempDir, githubOwner, repoName, branch, commitInfo) {
    return await this.repoProcessor.processFullRepositoryWithProcessors(
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
      if (clearFirst && this.embeddingManager.pinecone) {
        console.log(`[${new Date().toISOString()}] 🧹 CORE DOCS: Clearing existing docs in namespace '${namespace}'`);
        try {
          const index = this.embeddingManager.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
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

      // Processs API specifications using specialized processor
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
        results.markdownResults = await this.docsProcessor.processMarkdownDocumentation(namespace);
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

  /**
   * OPTIMIZED: Incremental processing using Langchain-first approach  
   */
  async processIncrementalOptimized(userId, repoId, repoUrl, branch, githubOwner, repoName, oldCommitHash, newCommitInfo) {
    console.log(`[${new Date().toISOString()}] 🔄 OPTIMIZED INCREMENTAL: Processing changes between commits`);
    console.log(`[${new Date().toISOString()}] 📊 From: ${oldCommitHash.substring(0, 8)} → To: ${newCommitInfo.hash.substring(0, 8)}`);
    
    try {
      // Step 1: Get changed files efficiently
      const changedFiles = await this.commitSelectionManager.getChangedFilesOptimized(
        repoUrl, branch, githubOwner, repoName, oldCommitHash, newCommitInfo.hash
      );
      
      if (changedFiles.length === 0) {
        console.log(`[${new Date().toISOString()}] 📭 NO CHANGES: No files modified between commits, skipping processing`);
        return { 
          success: true, 
          message: 'No files changed between commits', 
          repoId, userId,
          changedFiles: [],
          skipped: true
        };
      }

      console.log(`[${new Date().toISOString()}] 📋 CHANGED FILES (${changedFiles.length}): ${changedFiles.join(', ')}`);

      // Step 2: Load documents using Langchain (no manual filesystem operations!)
      const allDocuments = await this.repoProcessor.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, newCommitInfo);
      
      // Step 3: Filter to only changed files
      const changedDocuments = allDocuments.filter(doc => 
        changedFiles.some(file => doc.metadata.source?.includes(file))
      );

      console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL DOCUMENTS: Filtered to ${changedDocuments.length} documents from ${allDocuments.length} total`);

      if (changedDocuments.length === 0) {
        console.log(`[${new Date().toISOString()}] ⚠️ No documents found for changed files, processing all files as fallback`);
        return await this.processFullRepositoryOptimized(userId, repoId, repoUrl, branch, githubOwner, repoName, newCommitInfo);
      }

      // Step 4: Process changed documents
      const namespace = this.repoSelectionManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      const result = await this.repoProcessor.processFilteredDocuments(changedDocuments, namespace, newCommitInfo, true);
      
      // Step 5: Update repository tracking
      await this.repoSelectionManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, newCommitInfo, 
        namespace, this.pinecone, this.embeddings
      );

      return {
        success: true,
        message: `Optimized incremental processing completed for ${changedFiles.length} changed files`,
        incrementalProcessing: true,
        changedFiles,
        documentsProcessed: result.documentsProcessed || 0,
        chunksGenerated: result.chunksGenerated || 0,
        oldCommitHash, 
        newCommitHash: newCommitInfo.hash,
        userId, repoId, githubOwner, repoName,
        namespace,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in optimized incremental processing:`, error.message);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Full repository processing using Langchain-first approach
   */
  async processFullRepositoryOptimized(userId, repoId, repoUrl, branch, githubOwner, repoName, commitInfo) {
    console.log(`[${new Date().toISOString()}] 🔵 OPTIMIZED FULL PROCESSING: Using Langchain-first approach for complete repository`);
    
    try {
      // Step 1: Load ALL documents using Langchain (no manual filesystem operations)
      const documents = await this.repoProcessor.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      // Step 2: Process all documents
      const namespace = this.repoSelectionManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      const result = await this.repoProcessor.processFilteredDocuments(documents, namespace, commitInfo, false);
      
      // Step 3: Store repository tracking info for future duplicate detection
      await this.repoSelectionManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, commitInfo, 
        namespace, this.pinecone, this.embeddings
      );

      return {
        success: true,
        message: 'Optimized repository processing completed with Langchain-first approach',
        totalDocuments: result.documentsProcessed || 0,
        totalChunks: result.chunksGenerated || 0,
        commitHash: commitInfo.hash,
        commitInfo,
        userId, repoId, githubOwner, repoName,
        namespace,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in optimized full processing:`, error.message);
      throw error;
    }
  }

  /**
   * Process incremental changes between commits (legacy method with updated signature)
   */
  async processIncrementalChangesInternal(userId, repoId, repoData, tempDir, repoInfo, commitHashes, commitInfo) {
    const { githubOwner, repoName, branch } = repoInfo;
    const { oldCommitHash, newCommitHash } = commitHashes;
    
    console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL PROCESSING: Analyzing changes between commits`);
    console.log(`[${new Date().toISOString()}] 📊 From: ${oldCommitHash.substring(0, 8)} → To: ${newCommitHash.substring(0, 8)}`);
    
    try {
      // Get list of changed files
      const changedFiles = await this.commitSelectionManager.getChangedFilesFromLocalGit(tempDir, oldCommitHash, newCommitHash);
      
      if (changedFiles.length === 0) {
        console.log(`[${new Date().toISOString()}] 📭 NO CHANGES: No files modified between commits, skipping processing`);
        await this.repoSelectionManager.cleanupTempDir(tempDir);
        return { 
          success: true, 
          message: 'No files changed between commits', 
          repoId, userId,
          changedFiles: [],
          skipped: true
        };
      }

      console.log(`[${new Date().toISOString()}] 📋 CHANGED FILES (${changedFiles.length}):`);
      changedFiles.forEach(file => {
        console.log(`[${new Date().toISOString()}]   🔄 ${file}`);
      });

      // Create namespace for this repository
      const namespace = this.repoSelectionManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      
      // Remove vectors for changed files from Pinecone
      await this.removeChangedFilesFromPinecone(changedFiles, namespace, githubOwner, repoName);
      
      // Process only the changed files using repository processor
      const incrementalResult = await this.repoProcessorUtils.processChangedFiles(
        tempDir, changedFiles, namespace, githubOwner, repoName
      );
      
      // Update repository tracking info
      await this.repoSelectionManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, commitInfo, 
        namespace, this.pinecone, this.embeddings
      );
      
      // Cleanup temp directory
      await this.repoSelectionManager.cleanupTempDir(tempDir);

      return {
        success: true,
        message: `Incremental processing completed for ${changedFiles.length} changed files`,
        incrementalProcessing: true,
        changedFiles,
        documentsProcessed: incrementalResult.documentsProcessed || 0,
        chunksGenerated: incrementalResult.chunksGenerated || 0,
        oldCommitHash, newCommitHash,
        userId, repoId, githubOwner, repoName,
        namespace,
        processedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in incremental processing:`, error.message);
      
      // Cleanup temp directory on error
      try {
        await this.repoSelectionManager.cleanupTempDir(tempDir);
      } catch (cleanupError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Failed to cleanup temp directory:`, cleanupError.message);
      }
      
      throw error;
    }
  }

  /**
   * Remove vectors for changed files from Pinecone
   */
  async removeChangedFilesFromPinecone(changedFiles, namespace, githubOwner, repoName) {
    if (!this.pinecone) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Cannot remove changed files: Pinecone client not available`);
      return;
    }

    try {
      const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      
      // Create vector IDs for changed files (matching the pattern used in EmbeddingManager)
      const vectorIdsToDelete = [];
      
      changedFiles.forEach(filePath => {
        const sanitizedFile = this.repoSelectionManager.sanitizeId(filePath);
        // Generate pattern to match all chunks from this file
        // Note: This is a simplified approach - in practice, you might need to query first to find exact IDs
        const filePattern = `${githubOwner}_*_${sanitizedFile}_chunk_*`;
        vectorIdsToDelete.push(filePattern);
      });

      console.log(`[${new Date().toISOString()}] 🗑️ CLEANUP: Removing vectors for ${changedFiles.length} changed files from namespace ${namespace}`);
      
      // Note: Pinecone doesn't support wildcard deletion directly
      // We'll need to query first to find matching vectors, then delete them
      // For now, we'll log this limitation
      console.log(`[${new Date().toISOString()}] 📝 TODO: Implement precise vector deletion for changed files`);
      console.log(`[${new Date().toISOString()}] 💡 Current approach will overwrite existing vectors when new ones are added`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error removing changed files from Pinecone:`, error.message);
    }
  }

  emitRagStatus(status, details = {}) {
    return this.eventManager.emitRagStatus(status, details);
  }
}

module.exports = DataPreparationPipeline;
