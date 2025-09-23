// DataPreparationPipeline.js - REFACTORED WITH MODULAR ORCHESTRATORS
"use strict";

const EventManager = require('./eventManager');
const PineconePlugin = require('../../pinecone/pineconePlugin');
const SemanticPreprocessor = require('./processors/semanticPreprocessor');
const UbiquitousLanguageEnhancer = require('./processors/ubiquitousLanguageEnhancer');
const ApiSpecProcessor = require('./processors/apiSpecProcessor');
const DocsProcessor = require('./processors/docsProcessor');
const RepoSelectionManager = require('./processors/repoSelectionManager');
const CommitSelectionManager = require('./processors/commitSelectionManager');
const ASTCodeSplitter = require('./processors/astCodeSplitter');
const RepoProcessorUtils = require('./processors/repoProcessorUtils');
const RepoProcessor = require('./processors/repoProcessor');
const EmbeddingManager = require('./processors/embeddingManager');

let traceable;
try {
  ({ traceable } = require('langsmith/traceable'));
} catch (err) {
  if (process.env.LANGSMITH_TRACING === 'true') {
    console.warn(`[${new Date().toISOString()}] [TRACE] LangSmith traceable not available: ${err.message}`);
  }
}

class ContextPipeline {
  constructor(options = {}) {
    console.log(`[${new Date().toISOString()}] 🎯 INITIALIZING ContextPipeline with modular architecture`);

    // Store dependencies passed from the adapter
    this.embeddings = options.embeddings;
    this.eventBus = options.eventBus;
    this.pineconeLimiter = options.pineconeLimiter;
    this.pineconeManager = new PineconePlugin();
    this.semanticPreprocessor = new SemanticPreprocessor();

    this.astCodeSplitter = new ASTCodeSplitter({
      maxChunkSize: options.maxChunkSize || 2000,
      includeComments: true,
      includeImports: true
    });

    this.ubiquitousLanguageEnhancer = new UbiquitousLanguageEnhancer();
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
      semanticPreprocessor: this.semanticPreprocessor,
      routingProvider: this // Provide access to centralized routing methods
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
    this.pineconeService = null;
    this.pinecone = null; // For backward compatibility
    
    // Initialize async - will be set when processPushedRepo is called
    this._initializePineconeAsync();
    
    console.log(`[${new Date().toISOString()}] ✅ PIPELINE READY: DataPreparationPipeline initialized with modular architecture`);

    this.enableTracing = process.env.LANGSMITH_TRACING === 'true' && !!traceable;
    if (this.enableTracing) {
      try {
        this.processPushedRepo = traceable(
          this.processPushedRepo.bind(this),
          {
            name: 'ContextPipeline.processPushedRepo',
            project_name: process.env.LANGCHAIN_PROJECT || 'eventstorm-trace',
            metadata: { component: 'ContextPipeline' },
            tags: ['rag', 'ingestion']
          }
        );
        console.log(`[${new Date().toISOString()}] [TRACE] ContextPipeline tracing enabled.`);
  console.log(`[${new Date().toISOString()}] [TRACE] ContextPipeline tracing env summary: project=${process.env.LANGCHAIN_PROJECT || 'eventstorm-trace'} apiKeySet=${!!process.env.LANGSMITH_API_KEY} workspaceIdSet=${!!process.env.LANGSMITH_WORKSPACE_ID}`);
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] [TRACE] Failed to enable ContextPipeline tracing: ${err.message}`);
      }
    }
  }

  /**
   * Initialize Pinecone service asynchronously
   */
  async _initializePineconeAsync() {
    try {
      this.pineconeService = await this.pineconeManager?.getPineconeService();
      this.pinecone = this.pineconeService; // For backward compatibility
      console.log(`[${new Date().toISOString()}] ✅ PINECONE: Async initialization completed`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ PINECONE: Async initialization failed:`, error.message);
      this.pineconeService = null;
      this.pinecone = null;
    }
  }

  /**
   * Ensure Pinecone is initialized before use
   */
  async _ensurePineconeInitialized() {
    if (!this.pinecone) {
      await this._initializePineconeAsync();
    }
    return this.pinecone;
  }

  /**
   * Route document to appropriate processor based on content type
   */
  async routeDocumentToProcessor(document) {
    const contentType = this.detectContentType(document);
    const source = document.metadata?.source || 'unknown';
    
    console.log(`[${new Date().toISOString()}] 🎯 ROUTING: ${source} → ${contentType}`);

    try {
      switch (contentType) {
        case 'code':
          return await this.processCodeDocument(document);
          
        case 'markdown':
          return await this.processMarkdownDocument(document);
          
        case 'openapi':
          return await this.processOpenAPIDocument(document);
          
        case 'yaml_config':
        case 'json_config':
        case 'json_schema':
          return await this.processConfigDocument(document, contentType);
          
        case 'documentation':
          return await this.processDocumentationFile(document);
          
        case 'generic':
        default:
          return await this.processGenericDocument(document);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ ROUTING ERROR: ${source}:`, error.message);
      return await this.processGenericDocument(document); // Fallback
    }
  }

  /**
   * Detect content type for routing decisions
   */
  detectContentType(document) {
    const source = document.metadata?.source || '';
    const content = document.pageContent || document.content || '';
    const extension = this.getFileExtension(source).toLowerCase();
    const basename = this.getBasename(source).toLowerCase();

    // Code files - use AST splitter
    if (this.isCodeFile(extension)) {
      return 'code';
    }

    // Markdown files
    if (extension === '.md' || extension === '.markdown') {
      return 'markdown';
    }

    // OpenAPI/Swagger specifications
    if (this.isOpenAPIFile(source, content)) {
      return 'openapi';
    }

    // JSON Schema files
    if (this.isJSONSchemaFile(source, content)) {
      return 'json_schema';
    }

    // YAML configuration files
    if (extension === '.yml' || extension === '.yaml') {
      return 'yaml_config';
    }

    // JSON configuration files
    if (extension === '.json' && !this.isOpenAPIFile(source, content) && !this.isJSONSchemaFile(source, content)) {
      return 'json_config';
    }

    // Documentation files
    if (this.isDocumentationFile(extension, basename)) {
      return 'documentation';
    }

    return 'generic';
  }

  /**
   * Content type detection helpers
   */
  isCodeFile(extension) {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',  // JavaScript/TypeScript
      '.py', '.pyx', '.pyi',                        // Python
      '.java', '.kt', '.scala',                     // JVM languages
      '.go', '.rs', '.cpp', '.c', '.h', '.hpp',     // Systems languages
      '.cs', '.vb', '.fs',                          // .NET languages
      '.php', '.rb', '.swift', '.dart'              // Other languages
    ];
    return codeExtensions.includes(extension);
  }

  isOpenAPIFile(source, content) {
    const filename = this.getBasename(source).toLowerCase();
    
    // Check filename patterns
    if (filename.includes('openapi') || 
        filename.includes('swagger') ||
        filename.includes('api-spec') ||
        filename.includes('apispec')) {
      return true;
    }

    // Check content for OpenAPI indicators
    if (content.includes('openapi:') || 
        content.includes('"openapi"') ||
        content.includes('swagger:') ||
        content.includes('"swagger"') ||
        content.includes('/paths/') ||
        content.includes('"paths"')) {
      return true;
    }

    return false;
  }

  isJSONSchemaFile(source, content) {
    const filename = this.getBasename(source).toLowerCase();
    
    // Check filename patterns
    if (filename.includes('schema') || filename.endsWith('.schema.json')) {
      return true;
    }

    // Check content for JSON Schema indicators
    if (content.includes('"$schema"') ||
        content.includes('"type"') && content.includes('"properties"') ||
        content.includes('json-schema.org')) {
      return true;
    }

    return false;
  }

  isDocumentationFile(extension, basename) {
    const docExtensions = ['.txt', '.rst', '.adoc', '.org'];
    const docFilenames = ['readme', 'changelog', 'license', 'contributing'];
    
    return docExtensions.includes(extension) || 
           docFilenames.some(name => basename.includes(name));
  }

  getFileExtension(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  getBasename(filepath) {
    if (!filepath) return '';
    const lastSlash = Math.max(filepath.lastIndexOf('/'), filepath.lastIndexOf('\\'));
    const filename = lastSlash === -1 ? filepath : filepath.substring(lastSlash + 1);
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? filename : filename.substring(0, lastDot);
  }

  /**
   * Content type specific processors
   */
  async processCodeDocument(document) {
    console.log(`[${new Date().toISOString()}] 💻 CODE PROCESSING: Using AST splitter`);
    return await this.astCodeSplitter.splitDocument(document);
  }

  async processMarkdownDocument(document) {
    console.log(`[${new Date().toISOString()}] 📝 MARKDOWN PROCESSING: Using docs processor`);
    // Use the existing docsProcessor for markdown files
    const docs = [document];
    const splitDocs = await this.docsProcessor.splitMarkdownDocuments(docs);
    return splitDocs;
  }

  async processOpenAPIDocument(document) {
    console.log(`[${new Date().toISOString()}] 🔌 OPENAPI PROCESSING: Using API spec processor`);
    // Use the existing apiSpecProcessor for OpenAPI files
    return await this.apiSpecProcessor.processApiSpecDocument(document);
  }

  async processConfigDocument(document, contentType) {
    console.log(`[${new Date().toISOString()}] ⚙️ CONFIG PROCESSING: ${contentType.toUpperCase()}`);
    // For now, use generic processing for config files
    // Can be enhanced later with specific config processors
    return await this.processGenericDocument(document);
  }

  async processDocumentationFile(document) {
    console.log(`[${new Date().toISOString()}] 📖 DOCUMENTATION PROCESSING: Using docs processor`);
    // Use docsProcessor for general documentation
    const docs = [document];
    const splitDocs = await this.docsProcessor.splitMarkdownDocuments(docs);
    return splitDocs;
  }

  async processGenericDocument(document) {
    console.log(`[${new Date().toISOString()}] 📄 GENERIC PROCESSING: Using semantic preprocessor`);
    // Use semantic preprocessor for generic documents
    const processed = await this.semanticPreprocessor.preprocessChunk(document);
    return [processed]; // Return as array for consistency
  }

  /**
   * Batch process multiple documents with intelligent routing
   */
  async routeDocumentsToProcessors(documents) {
    console.log(`[${new Date().toISOString()}] 🚦 BATCH ROUTING: Processing ${documents.length} documents`);
    
    const allChunks = [];
    const stats = {
      code: 0,
      markdown: 0,
      openapi: 0,
      yaml_config: 0,
      json_config: 0,
      json_schema: 0,
      documentation: 0,
      generic: 0
    };

    for (const document of documents) {
      try {
        const contentType = this.detectContentType(document);
        stats[contentType] = (stats[contentType] || 0) + 1;
        
        const chunks = await this.routeDocumentToProcessor(document);
        allChunks.push(...chunks);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ ROUTING ERROR: ${document.metadata?.source}:`, error.message);
        // Try generic processing as last resort
        try {
          const fallbackChunks = await this.processGenericDocument(document);
          allChunks.push(...fallbackChunks);
          stats.generic = (stats.generic || 0) + 1;
        } catch (fallbackError) {
          console.error(`[${new Date().toISOString()}] ❌ FALLBACK FAILED: ${document.metadata?.source}:`, fallbackError.message);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] 📊 ROUTING STATS:`, stats);
    console.log(`[${new Date().toISOString()}] ✅ BATCH COMPLETE: ${documents.length} documents → ${allChunks.length} chunks`);
    
    return allChunks;
  }

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
      const pineconeClient = await this._ensurePineconeInitialized();
      const existingRepo = await this.repoSelectionManager.findExistingRepo(
        userId, repoId, githubOwner, repoName, commitInfo.hash, pineconeClient
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
          const index = this.embeddingManager.pinecone.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
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
      const pineconeClient = await this._ensurePineconeInitialized();
      await this.repoSelectionManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, newCommitInfo, 
        namespace, pineconeClient, this.embeddings
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
      const pineconeClient2 = await this._ensurePineconeInitialized();
      await this.repoSelectionManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, commitInfo, 
        namespace, pineconeClient2, this.embeddings
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
      const pineconeClient3 = await this._ensurePineconeInitialized();
      await this.repoSelectionManager.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, commitInfo, 
        namespace, pineconeClient3, this.embeddings
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
      const index = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      
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

module.exports = ContextPipeline;
