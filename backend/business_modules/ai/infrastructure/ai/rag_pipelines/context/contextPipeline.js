/**
 * contextPipeline.js - EventStorm RAG Document Processing Pipeline
 * 
 * OVERVIEW:
 * The ContextPipeline is the main orchestrator for processing GitHub repositories into a RAG
 * (Retrieval-Augmented Generation) system. It intelligently routes different document types
 * to specialized processors, manages the complete ingestion workflow, and handles both full
 * repository processing and incremental updates. This class follows a clean separation of 
 * concerns pattern, delegating Git/GitHub operations to repoSelector while focusing on 
 * document processing orchestration.
 * 
 * CORE FUNCTIONALITY:
 * - Intelligent document routing based on content type detection
 * - Document splitting followed by chunk-level semantic preprocessing for optimal RAG performance
 * - Specialized processing for code, markdown, OpenAPI specs, and generic documents  
 * - Repository-level orchestration with commit tracking and duplicate detection
 * - Horizontal scaling support for large repositories using worker processes
 * - Comprehensive error handling with delegation to specialized components
 * - Integration with Pinecone vector database and LangSmith tracing
 * 
 * MAIN SECTIONS:
 * 
 * 1. INITIALIZATION & SETUP
 *    - constructor(): Lazy initialization pattern with inline processor creation
 *    - _initializeTracing(): LangSmith tracing setup for observability
 *    - getPineconeClient(): Inline lazy initialization of Pinecone vector database client
 * 
 * 2. DOCUMENT ROUTING & PROCESSING
 * 
 *    - routeDocumentToProcessor(): Main routing logic based on content type detection
 *    - detectContentType(): Intelligent content classification (code, markdown, OpenAPI, etc.)
 *    - processCodeDocument(): Splits code using ASTCodeSplitter, then applies SemanticPreprocessor to each chunk
 *    - processMarkdownDocument(): Splits markdown using DocsProcessor, then applies SemanticPreprocessor to each chunk
 *    - processOpenAPIDocument(): Applies SemanticPreprocessor to API spec chunks for enhanced API processing
 *    - processConfigDocument(): Applies SemanticPreprocessor for enhanced config processing
 *    - processGenericDocument(): Splits text using RecursiveCharacterTextSplitter, then applies SemanticPreprocessor to each chunk
 *    - routeDocumentsToProcessors(): Batch processing with comprehensive statistics tracking
 * 
 * 3. REPOSITORY ORCHESTRATION
 * 📥 processPushedRepo() [ENTRY POINT]
    ├─ Check if same commit → SKIP
    ├─ Check if commit changed → processIncrementalOptimized()
    └─ New repo/major changes → processFullRepositoryOptimized()
                                   ├─ Size analysis
                                   ├─ Large repo → processLargeRepositoryWithWorkers()
                                   └─ Small repo → processStandardRepository()
 *    - processPushedRepo(): Main entry point for repository processing workflow
 *    - processFullRepositoryOptimized(): Full repository processing with scaling decisions
 *    - processIncrementalOptimized(): Incremental processing for repository updates
 *    - processStandardRepository(): Standard Langchain-based document loading and processing
 *    - processLargeRepositoryWithWorkers(): Horizontal scaling using worker processes
 * 
 * 4. SCALING & OPTIMIZATION
 *    - shouldUseHorizontalScaling(): Repository size analysis for scaling decisions
 *    - isProcessableFileForScaling(): File filtering for performance optimization
 *    - processIncrementalChangesInternal(): Legacy incremental processing with Git operations
 * 
 * 5. UTILITY & HELPERS
 *    - Content type detection helpers (isCodeFile, isOpenAPIFile, isJSONSchemaFile, etc.)
 *    - File path utilities (getFileExtension, getBasename)
 *    - removeChangedFilesFromPinecone(): Vector cleanup for incremental updates
 *    - emitRagStatus(): Status event emission (delegates to EventManager)
 * 
 * 6. DELEGATION & ERROR HANDLING
 *    - Git error detection and GitHub API fallback delegation to repoSelector
 *    - Repository commit operations delegated to repoSelector
 *    - Change detection operations delegated to repoSelector
 *    - Maintains clean separation between document processing and Git operations
 * 
 * KEY FEATURES:
 * - Inline lazy initialization pattern for all processors
 * - Intelligent content-type routing with specialized processors
 * - Clean separation of concerns: document processing vs Git/GitHub operations
 * - Comprehensive error handling with delegation to specialized components
 * - Horizontal scaling support based on repository size analysis
 * - Integration with vector databases (Pinecone) and observability (LangSmith)
 * - Support for both full and incremental repository processing
 * - Cloud-native compatibility through delegated operations
 * 
 * ARCHITECTURE PATTERNS:
 * - Strategy Pattern: Different processors for different content types
 * - Factory Pattern: Inline lazy initialization of processors
 * - Pipeline Pattern: Sequential document processing with accumulation
 * - Observer Pattern: Event emission for processing status updates
 * - Delegation Pattern: Git/GitHub operations delegated to repoSelector
 * 
 * REFACTORING NOTES:
 * - Removed direct GitHub API operations (moved to repoLoader for better separation)
 * - Enhanced error handling delegation to maintain clean boundaries
 * - Improved separation of concerns between document processing and Git operations
 * - Maintained backward compatibility while improving internal architecture
 * - Fixed repoProcessor initialization in processStandardRepository method
 * - All integration tests passing after comprehensive refactoring work
 */

// contextPipeline.js
"use strict";

const EventManager = require('./eventManager');
const PineconePlugin = require('../../pinecone/pineconePlugin');
const SemanticPreprocessor = require('./processors/semanticPreprocessor');
const UbiquitousLanguageEnhancer = require('./processors/ubiquitousLanguageEnhancer');
const ApiSpecProcessor = require('./processors/apiSpecProcessor');
const DocsProcessor = require('./processors/docsProcessor');
const RepoLoader = require('./processors/repoLoader');
const repoSelector = require('./processors/repoSelector');
const ASTCodeSplitter = require('./processors/astCodeSplitter');
const RepoProcessorUtils = require('./processors/repoProcessorUtils');
const RepoProcessor = require('./processors/repoProcessor');
const EmbeddingManager = require('./processors/embeddingManager');
const RepoWorkerManager = require('./processors/RepoWorkerManager');

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
    console.log(`[${new Date().toISOString()}] 🎯 INITIALIZING ContextPipeline`);
    
    // Store options for lazy initialization
    this.options = options;
    this.embeddings = options.embeddings;
    this.eventBus = options.eventBus;
    this.pineconeLimiter = options.pineconeLimiter;
    
    // Initialize core components only
    this.pineconeManager = new PineconePlugin();
    this.repoLoader = new RepoLoader();
    
    // Pinecone will be initialized inline when needed
    this.pinecone = null;
    
    // Initialize tracing if enabled
    this._initializeTracing();
    
    console.log(`[${new Date().toISOString()}] ✅ PIPELINE READY: ContextPipeline`);
  }

  _initializeTracing() {
    this.enableTracing = process.env.LANGSMITH_TRACING === 'true' && !!traceable;
    
    if (!this.enableTracing) {
      return;
    }

    // bind(this) call ensures that when processPushedRepo is eventually called, the this keyword inside that method will always refer to the current object, regardless of how or where the method is invoked.
    try {
      this.processPushedRepo = traceable(
        this.processPushedRepo.bind(this), // 
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

  async getPineconeClient() {
    if (!this.pinecone) {
      try {
        console.log(`[${new Date().toISOString()}] ⚙️ PINECONE: Initializing client...`);
        this.pinecone = await this.pineconeManager?.getPineconeService();
        console.log(`[${new Date().toISOString()}] ✅ PINECONE: Client initialized`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ PINECONE: Initialization failed:`, error.message);
        return null;
      }
    }
    return this.pinecone;
  }

  async routeDocumentToProcessor(document) {
    const contentType = this.detectContentType(document);
    // document.metadata is a property of LangChain Document objects. In your RAG pipeline, documents are created by LangChain's document loaders when they process files from repositories. CloudNativeRepoLoader creates LangChain-compatible documents with metadata fields including source file path, etc.
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
    const extension = this.getFileExtension(source).toLowerCase();
    const basename = this.getBasename(source).toLowerCase();
    const content = document.pageContent ?? '';

    // OpenAPI/Swagger files - check content and filename patterns
    if (this.isOpenAPIFile(source, content)) {
      return 'openapi';
    }

    // JSON Schema files - check content and filename patterns  
    if (this.isJSONSchemaFile(source, content)) {
      return 'json_schema';
    }

    // YAML configuration files
    if (extension === '.yml' || extension === '.yaml') {
      return 'yaml_config';
    }

    // JSON configuration files (but not OpenAPI/schema which are handled above)
    if (extension === '.json') {
      return 'json_config';
    }

    // Code files - use AST splitter
    if (this.isCodeFile(extension)) {
      return 'code';
    }

    // Markdown and Documentation files - consolidated handling
    if (extension === '.md' || extension === '.markdown' || this.isDocumentationFile(extension, basename)) {
      return 'markdown';
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

  // Specialized processors for different content types
  //--------------------------------------------------
  
  async processCodeDocument(document) {
    console.log(`[${new Date().toISOString()}] 💻 CODE PROCESSING: AST splitting + semantic preprocessing of chunks`);
    
    // Step 1: Apply AST-based code splitting first
    this.astCodeSplitter = this.astCodeSplitter || new ASTCodeSplitter({
      maxChunkSize: this.options.maxChunkSize || 2000,
      includeComments: true,
      includeImports: true
    });
    const chunks = await this.astCodeSplitter.splitDocument(document);
    
    // Step 2: Apply semantic preprocessing to each chunk
    this.semanticPreprocessor = this.semanticPreprocessor || new SemanticPreprocessor();
    const enhancedChunks = [];
    for (const chunk of chunks) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }
    
    return enhancedChunks;
  }

  async processMarkdownDocument(document) {
    console.log(`[${new Date().toISOString()}] 📝 MARKDOWN/DOCS PROCESSING: Docs splitting + semantic preprocessing of chunks`);
    
    // Step 1: Apply markdown/documentation-specific splitting first
    this.docsProcessor = this.docsProcessor || new DocsProcessor({
      embeddings: this.embeddings,
      pineconeLimiter: this.pineconeLimiter,
      repoLoader: this.repoLoader,
      pineconeManager: this.pineconeManager
    });
    
    const docs = [document];
    const splitDocs = await this.docsProcessor.splitMarkdownDocuments(docs);
    
    // Step 2: Apply semantic preprocessing to each chunk
    this.semanticPreprocessor = this.semanticPreprocessor || new SemanticPreprocessor();
    const enhancedChunks = [];
    for (const chunk of splitDocs) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }
    
    return enhancedChunks;
  }

  async processOpenAPIDocument(document) {
    console.log(`[${new Date().toISOString()}] 🔌 OPENAPI PROCESSING: API spec splitting + semantic preprocessing of chunks`);
    
    // Step 1: For OpenAPI documents, they typically don't need heavy splitting as they're structured
    // However, we can still create logical chunks based on endpoints, schemas, etc.
    // For now, we'll treat the whole document as one chunk since ApiSpecProcessor handles internal structuring
    const chunks = [document];
    
    // Step 2: Apply semantic preprocessing to each chunk
    this.semanticPreprocessor = this.semanticPreprocessor || new SemanticPreprocessor();
    const enhancedChunks = [];
    for (const chunk of chunks) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }
    
    return enhancedChunks;
  }

  async processConfigDocument(document, contentType) {
    console.log(`[${new Date().toISOString()}] ⚙️ CONFIG PROCESSING: Applying semantic preprocessing for ${contentType.toUpperCase()}`);
    
    // Step 1: Apply semantic preprocessing for domain intelligence
    this.semanticPreprocessor = this.semanticPreprocessor || new SemanticPreprocessor();
    const semanticallyEnhanced = await this.semanticPreprocessor.preprocessChunk(document);
    
    // Step 2: For now, return as single chunk (can be enhanced later with specific config processors)
    return [semanticallyEnhanced];
  }

  async processGenericDocument(document) {
    console.log(`[${new Date().toISOString()}] 📄 GENERIC PROCESSING: Text splitting + semantic preprocessing of chunks`);
    
    // Step 1: Split document into manageable chunks first
    const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.options.maxChunkSize || 1500,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', '']  // Generic text splitting
    });
    
    const splitDocs = await textSplitter.splitDocuments([document]);
    
    // Step 2: Apply semantic preprocessing to each chunk
    this.semanticPreprocessor = this.semanticPreprocessor || new SemanticPreprocessor();
    const enhancedChunks = [];
    for (const chunk of splitDocs) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }
    
    return enhancedChunks;
  }

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
      generic: 0
    };

    for (const document of documents) {
      try {
        const contentType = this.detectContentType(document);
        stats[contentType] = (stats[contentType] || 0) + 1;
        
        // Route and process each document, return chunks
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


  // entry point for processing a pushed repository

  async processPushedRepo(userId, repoId, repoData) {
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Processing repo for user ${userId}: ${repoId}`);
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Received repoData structure:`, JSON.stringify(repoData, null, 2)); 
    
    console.log(`[${new Date().toISOString()}] 🎯 ORCHESTRATION: Using modular managers for coordinated processing`);
    
    // Emit starting status
    this.eventManager = this.eventManager || new EventManager({
      eventBus: this.eventBus
    });
    this.eventManager.emitProcessingStarted(userId, repoId);

    // Pre-process repository data outside try-catch for use in fallback
    let url, branch, githubOwner, repoName;
    
    try {
      console.log(`[${new Date().toISOString()}] 🔵 STAGE 1: REPOSITORY VALIDATION & SETUP`);
      console.log(`[${new Date().toISOString()}] 🎯 EXPLANATION: Validating repository data and checking for duplicates`);
      
      // Validate repoData structure
      if (!repoData?.url || !repoData?.branch) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Invalid repository data received: ${JSON.stringify(repoData)}`);
        const invalidResult = { success: false, reason: 'invalid_repo_data', repoId, userId };
        this.eventManager.emitProcessingError(userId, repoId, new Error('Invalid repository data'));
        return invalidResult;
      }

      // Extract repository information (moved outside try for fallback access)
      url = repoData.url;
      branch = repoData.branch;
      const urlParts = url.split('/');
      githubOwner = urlParts[urlParts.length - 2];
      repoName = urlParts[urlParts.length - 1].replace('.git', '');

      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Extracted GitHub owner: ${githubOwner}, repo name: ${repoName}`);

      // OPTIMIZED: Smart commit tracking using CommitManager
      console.log(`[${new Date().toISOString()}] 🔄 OPTIMIZED PROCESSING: Using Langchain-first approach with smart commit detection`);
      console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Processing ${githubOwner}/${repoName} with optimized strategy`);

      // Step 1: Try to get commit info efficiently using CommitManager
      this.repoSelector = this.repoSelector || new repoSelector({
        repoLoader: this.repoLoader
      });
      const commitInfo = await this.repoSelector.getCommitInfoOptimized(url, branch, githubOwner, repoName);
      
      if (!commitInfo) {
        throw new Error('Failed to retrieve commit information');
      }

      console.log(`[${new Date().toISOString()}] 🔑 COMMIT DETECTED: ${commitInfo?.hash?.substring(0, 8) ?? 'unknown'} - ${commitInfo?.subject ?? 'No subject'}`);

      // Step 2: Enhanced duplicate check with commit hash comparison
      const pineconeClient = await this.getPineconeClient();
      const existingRepo = await this.repoLoader.findExistingRepo(
        userId, repoId, githubOwner, repoName, commitInfo?.hash ?? null, pineconeClient, this.embeddings
      );
      
      if (existingRepo) {
        if (existingRepo.reason === 'same_commit') {
          console.log(`[${new Date().toISOString()}] ⏭️ SKIPPING: Repository at same commit (${commitInfo?.hash?.substring(0, 8) ?? 'unknown'}), no changes to process`);
          this.eventManager.emitProcessingSkipped(userId, repoId, 'No changes - same commit hash', commitInfo?.hash ?? null);
          
          return { 
            success: true, 
            message: 'Repository already processed at same commit', 
            repoId, userId,
            commitHash: commitInfo?.hash ?? null,
            skipped: true
          };
        } else if (existingRepo.reason === 'commit_changed' && existingRepo.requiresIncremental) {
          console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL PROCESSING: Repository has changes, using integrated strategy`);
          return await this.processIncrementalOptimized({
            userId, repoId, repoUrl: url, branch, githubOwner, repoName,
            oldCommitHash: existingRepo.existingCommitHash, newCommitInfo: commitInfo
          });
        }
        // If existingRepo exists but doesn't match above conditions, fall through to full processing
        console.log(`[${new Date().toISOString()}] 🔄 FULL PROCESSING REQUIRED: Repository exists but requires full reprocessing (reason: ${existingRepo.reason})`);
      }

      console.log(`[${new Date().toISOString()}] 🆕 FULL PROCESSING: New repository or major changes, using integrated strategy`);
      const result = await this.processFullRepositoryOptimized({
        userId, repoId, repoUrl: url, branch, githubOwner, repoName, commitInfo
      });

      // Emit completion event
      this.eventManager.emitProcessingCompleted(userId, repoId, result);
      
      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in orchestration for repository ${repoId}:`, error.message);
      
      // IMMEDIATE GITHUB API FALLBACK: Detect Git-related errors and skip to API approach
      const isGitError = this.repoSelector?.constructor.isGitError?.(error) || 
                        error.message.includes('git: not found') || 
                        error.message.includes('Command failed: git') || 
                        error.message.includes('Failed to clone repository');
                        
      if (isGitError) {
        console.log(`[${new Date().toISOString()}] 🚨 GIT NOT AVAILABLE: Detected Git installation issue, switching directly to GitHub API`);
        console.log(`[${new Date().toISOString()}] 🔄 CLOUD-NATIVE MODE: Processing repository without local Git dependencies`);
      }
      
      // CRITICAL FALLBACK: Try direct GitHub API document loading when orchestration fails
      console.log(`[${new Date().toISOString()}] 🆘 FALLBACK: Attempting direct GitHub API document loading`);
      try {
        // Ensure repoSelector is initialized
        this.repoSelector = this.repoSelector || new repoSelector({
          repositoryManager: this.repositoryManager || null,  // Handle optional repositoryManager
          repoLoader: this.repoLoader  // Add repoLoader for GitHub API delegation
        });
        
        // Ensure required processors are initialized
        if (!this.repoProcessor) {
          this.repoProcessor = new RepoProcessor({
            embeddings: this.embeddings,
            pineconeLimiter: this.pineconeLimiter,
            eventBus: this.eventBus
          });
        }
        
        if (!this.eventManager) {
          this.eventManager = new EventManager({
            eventBus: this.eventBus,
            userId: userId,
            repoId: repoId
          });
        }
        
        // Delegate to repoSelector for GitHub API fallback processing
        const result = await this.repoSelector.processRepositoryViaDirectAPIFallback({
          userId, repoId, repoUrl: url, branch, githubOwner, repoName,
          repoProcessor: this.repoProcessor,
          repoLoader: this.repoLoader,
          pineconeClient: await this.getPineconeClient(),
          embeddings: this.embeddings,
          routeDocumentsToProcessors: this.routeDocumentsToProcessors.bind(this),
          eventManager: this.eventManager
        });
        if (result.success) {
          console.log(`[${new Date().toISOString()}] ✅ FALLBACK SUCCESS: Direct GitHub API processing completed`);
          return result;
        }
      } catch (fallbackError) {
        console.error(`[${new Date().toISOString()}] ❌ FALLBACK FAILED:`, fallbackError.message);
      }
      
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
  async processIncrementalChanges(params) {
    const {
      userId,
      repoId,
      tempDir,
      githubOwner,
      repoName,
      branch,
      oldCommitHash,
      newCommitHash,
      commitInfo
    } = params;

    // Group parameters to reduce count
    const repoInfo = { githubOwner, repoName, branch };
    const commitHashes = { oldCommitHash, newCommitHash };
    
    return await this.processIncrementalChangesInternal(
      userId, repoId, tempDir, repoInfo, commitHashes, commitInfo
    );
  }

  /**
   * Process full repository - delegates to RepoProcessor
   */
  async processFullRepository(params) {
    const {
      userId,
      repoId,
      tempDir,
      githubOwner,
      repoName,
      branch,
      commitInfo
    } = params;

    // Initialize inline when needed
    this.ubiquitousLanguageEnhancer = this.ubiquitousLanguageEnhancer || new UbiquitousLanguageEnhancer();
    this.repoProcessor = this.repoProcessor || new RepoProcessor({
      ubiquitousLanguageProcessor: this.ubiquitousLanguageEnhancer,
      apiSpecProcessor: this.apiSpecProcessor,
      docsProcessor: this.docsProcessor,
      repoProcessorUtils: this.repoProcessorUtils,
      repoLoader: this.repoLoader
    });

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
    
    // Initialize inline when needed
    this.embeddingManager = this.embeddingManager || new EmbeddingManager({ config: this.config });
    
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
  async processIncrementalOptimized(params) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      oldCommitHash,
      newCommitInfo
    } = params;

    console.log(`[${new Date().toISOString()}] 🔄 OPTIMIZED INCREMENTAL: Processing changes between commits`);
    console.log(`[${new Date().toISOString()}] 📊 From: ${oldCommitHash.substring(0, 8)} → To: ${newCommitInfo?.hash?.substring(0, 8) ?? 'unknown'}`);
    
    try {
      // Step 1: Get changed files efficiently
      const changedFiles = await this.repoSelector.getChangedFilesOptimized(
        repoUrl, branch, githubOwner, repoName, oldCommitHash, newCommitInfo?.hash ?? null
      );
      
      // Handle special case where change detection failed and full reload is required
      if (changedFiles === 'FULL_RELOAD_REQUIRED') {
        console.log(`[${new Date().toISOString()}] 🔄 FULL RELOAD TRIGGERED: Change detection failed, processing entire repository`);
        console.log(`[${new Date().toISOString()}] 🌐 Cloud-native approach: Loading all files when specific changes cannot be determined`);
        
        return await this.processFullRepositoryOptimized({
          userId, repoId, repoUrl, branch, githubOwner, repoName, commitInfo: newCommitInfo
        });
      }
      
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
        return await this.processFullRepositoryOptimized({
          userId, repoId, repoUrl, branch, githubOwner, repoName, commitInfo: newCommitInfo
        });
      }

      // Step 4: Process changed documents
      const namespace = this.repoLoader.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      const result = await this.repoProcessor.processFilteredDocuments(
        changedDocuments, namespace, newCommitInfo, true, this.routeDocumentsToProcessors.bind(this)
      );
      
      // Step 5: Update repository tracking
      const pineconeClient = await this.getPineconeClient();
      await this.repoLoader.storeRepositoryTrackingInfo(
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
        newCommitHash: newCommitInfo?.hash ?? null,
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
   * Enhanced with horizontal scaling for large repositories
   */
  async processFullRepositoryOptimized(params) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      commitInfo
    } = params;

    console.log(`[${new Date().toISOString()}] 🔵 OPTIMIZED FULL PROCESSING: Analyzing repository size for processing strategy`);
    
    try {
      // Step 1: Analyze repository size to determine processing strategy
      const shouldUseHorizontalScaling = await this.shouldUseHorizontalScaling(githubOwner, repoName, branch);
      
      if (shouldUseHorizontalScaling.useWorkers) {
        console.log(`[${new Date().toISOString()}] 🏭 HORIZONTAL SCALING: Repository size (${shouldUseHorizontalScaling.estimatedFiles} files) exceeds threshold, using worker-based processing`);
        
        // Use worker-based horizontal scaling for large repositories
        return await this.processLargeRepositoryWithWorkers({
          userId,
          repoId,
          repoUrl,
          branch,
          githubOwner,
          repoName,
          commitInfo
        });
        
      } else {
        console.log(`[${new Date().toISOString()}] 🔵 STANDARD PROCESSING: Repository size (${shouldUseHorizontalScaling.estimatedFiles} files) within threshold, using standard approach`);
        
        // Use standard Langchain-first approach for smaller repositories
        return await this.processStandardRepository({
          userId,
          repoId,
          repoUrl,
          branch,
          githubOwner,
          repoName,
          commitInfo
        });
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in optimized processing for repository ${repoId}:`, error.message);
      throw error;
    }
  }

  /**
   * Process large repository using horizontal scaling with workers
   */
  async processLargeRepositoryWithWorkers(params) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      commitInfo
    } = params;

    console.log(`[${new Date().toISOString()}] 🏭 WORKER PROCESSING: Starting horizontal scaling for ${githubOwner}/${repoName}`);
    
    try {
      // Create repository job for worker processing
      const repositoryJob = {
        userId,
        repoId,
        repoUrl,
        branch,
        githubOwner,
        repoName,
        commitInfo
      };
      
      // Process using worker manager
      const result = await this.workerManager.processLargeRepository(repositoryJob);
      
      if (result.success) {
        // Step 2: Store repository tracking info for future duplicate detection
        const pineconeClient2 = await this.getPineconeClient();
        const namespace = this.repoLoader.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
        
        await this.repoLoader.storeRepositoryTrackingInfo(
          userId, repoId, githubOwner, repoName, commitInfo, 
          namespace, pineconeClient2, this.embeddings
        );

        return {
          success: true,
          message: 'Large repository processing completed with horizontal scaling',
          totalDocuments: result.totalDocuments || 0,
          totalChunks: result.totalChunks || 0,
          commitHash: commitInfo?.hash ?? null,
          commitInfo,
          userId, repoId, githubOwner, repoName,
          namespace,
          processedAt: new Date().toISOString(),
          processingStrategy: 'horizontal_scaling',
          workersUsed: result.workersUsed,
          processingTime: result.processingTime,
          jobId: result.jobId
        };
      } else {
        throw new Error(`Worker processing failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Worker processing failed for ${repoId}:`, error.message);
      
      // Fallback to standard processing
      console.log(`[${new Date().toISOString()}] 🔄 FALLBACK: Attempting standard processing after worker failure`);
      return await this.processStandardRepository(params);
    }
  }

  /**
   * Process standard repository using existing Langchain approach
   */
  async processStandardRepository(params) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      commitInfo
    } = params;

    console.log(`[${new Date().toISOString()}] 🔵 STANDARD PROCESSING: Using Langchain-first approach for repository`);
    
    // Initialize repoProcessor if not already done
    this.repoProcessor = this.repoProcessor || new RepoProcessor({
      embeddings: this.embeddings,
      pinecone: await this.getPineconeClient(),
      repoProcessorUtils: this.repoProcessorUtils,
    });
    
    try {
      // Step 1: Load ALL documents using Langchain (no manual filesystem operations)
      const documents = await this.repoProcessor.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      // Step 2: Process all documents
      const namespace = this.repoLoader.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      const result = await this.repoProcessor.processFilteredDocuments(
        documents, namespace, commitInfo, false, this.routeDocumentsToProcessors.bind(this)
      );
      
      // Step 3: Store repository tracking info for future duplicate detection
      const pineconeClient2 = await this.getPineconeClient();
      await this.repoLoader.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, commitInfo, 
        namespace, pineconeClient2, this.embeddings
      );

      return {
        success: true,
        message: 'Standard repository processing completed with Langchain-first approach',
        totalDocuments: result.documentsProcessed || 0,
        totalChunks: result.chunksGenerated || 0,
        commitHash: commitInfo?.hash ?? null,
        commitInfo,
        userId, repoId, githubOwner, repoName,
        namespace,
        processedAt: new Date().toISOString(),
        processingStrategy: 'standard_langchain'
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Standard processing error for ${repoId}:`, error.message);
      throw error;
    }
  }

  /**
   * Determine if horizontal scaling should be used based on repository characteristics
   */
  async shouldUseHorizontalScaling(githubOwner, repoName, branch) {
    try {
      console.log(`[${new Date().toISOString()}] 📊 ANALYZING: Repository size for ${githubOwner}/${repoName}`);
      
      // Get repository statistics from GitHub API
      const headers = {};
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        headers['User-Agent'] = 'eventstorm-context-pipeline';
      }
      
      // Get repository info
      const repoResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${repoName}`, {
        headers
      });
      
      if (!repoResponse.ok) {
        console.warn(`[${new Date().toISOString()}] ⚠️  Failed to get repo info, using standard processing`);
        return { useWorkers: false, estimatedFiles: 'unknown', reason: 'api_error' };
      }
      
      const repoData = await repoResponse.json();
      const repoSize = repoData.size; // Size in KB
      
      // Get file tree to count processable files
      const treeResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${repoName}/git/trees/${branch}?recursive=1`, {
        headers
      });
      
      if (!treeResponse.ok) {
        console.warn(`[${new Date().toISOString()}] ⚠️  Failed to get file tree, using repo size for estimation`);
        // Estimate based on repository size
        const estimatedFiles = Math.floor(repoSize / 10); // Rough estimation: 10KB per file
        return {
          useWorkers: estimatedFiles > 100, // Use workers for repos with >100 estimated files
          estimatedFiles: estimatedFiles,
          repoSize: repoSize,
          reason: 'size_estimation'
        };
      }
      
      const treeData = await treeResponse.json();
      
      // Count processable files
      const processableFiles = treeData.tree?.filter(item => 
        item.type === 'blob' && 
        this.isProcessableFileForScaling(item.path)
      ) || [];
      
      const fileCount = processableFiles.length;
      const shouldScale = fileCount > 50; // Threshold: 50+ files
      
      console.log(`[${new Date().toISOString()}] 📊 REPOSITORY ANALYSIS: ${fileCount} processable files, size: ${repoSize}KB`);
      console.log(`[${new Date().toISOString()}] 📊 SCALING DECISION: ${shouldScale ? 'USE WORKERS' : 'STANDARD PROCESSING'}`);
      
      return {
        useWorkers: shouldScale,
        estimatedFiles: fileCount,
        repoSize: repoSize,
        reason: shouldScale ? 'file_count_threshold' : 'below_threshold',
        threshold: 50
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error analyzing repository size:`, error.message);
      // Default to standard processing on error
      return { useWorkers: false, estimatedFiles: 'error', reason: 'analysis_error' };
    }
  }

  /**
   * Check if file should be processed (for scaling analysis)
   */
  isProcessableFileForScaling(filePath) {
    const excludePatterns = [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.log$/,
      /\.(png|jpg|jpeg|gif|ico|svg)$/i,
      /\.DS_Store$/
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(filePath)) return false;
    }
    
    // Focus on backend files for EventStorm
    if (filePath.includes('backend/')) {
      const sourceExtensions = /\.(js|ts|jsx|tsx|json|md|sql|yaml|yml|txt|env)$/i;
      return sourceExtensions.test(filePath);
    }
    
    return false;
  }

  /**
   * Process incremental changes between commits (legacy method with updated signature)
   */
  async processIncrementalChangesInternal(userId, repoId, tempDir, repoInfo, commitHashes, commitInfo) {
    const { githubOwner, repoName, branch } = repoInfo;
    const { oldCommitHash, newCommitHash } = commitHashes;
    
    // Initialize inline when needed
    this.repoProcessorUtils = this.repoProcessorUtils || new RepoProcessorUtils(
      this.routeDocumentToProcessor.bind(this),
      this.routeDocumentsToProcessors.bind(this)
    );
    
    console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL PROCESSING: Analyzing changes between commits`);
    console.log(`[${new Date().toISOString()}] 📊 From: ${oldCommitHash.substring(0, 8)} → To: ${newCommitHash.substring(0, 8)}`);
    
    try {
      // Get list of changed files
      const changedFiles = await this.repoSelector.getChangedFilesFromLocalGit(tempDir, oldCommitHash, newCommitHash);
      
      if (changedFiles.length === 0) {
        console.log(`[${new Date().toISOString()}] 📭 NO CHANGES: No files modified between commits, skipping processing`);
        await this.repoLoader.cleanupTempDir(tempDir);
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
      const namespace = this.repoLoader.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      
      // Remove vectors for changed files from Pinecone
      await this.removeChangedFilesFromPinecone(changedFiles, namespace, githubOwner, repoName);
      
      // Process only the changed files using repository processor
      const incrementalResult = await this.repoProcessorUtils.processChangedFiles(
        tempDir, changedFiles, namespace, githubOwner, repoName
      );
      
      // Update repository tracking info
      const pineconeClient3 = await this.getPineconeClient();
      await this.repoLoader.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, commitInfo, 
        namespace, pineconeClient3, this.embeddings
      );
      
      // Cleanup temp directory
      await this.repoLoader.cleanupTempDir(tempDir);

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
        await this.repoLoader.cleanupTempDir(tempDir);
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
      // Note: Pinecone doesn't support wildcard deletion directly
      // We'll need to query first to find matching vectors, then delete them
      // For now, we'll log this limitation
      console.log(`[${new Date().toISOString()}] 🗑️ CLEANUP: Would remove vectors for ${changedFiles.length} changed files from namespace ${namespace}`);
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
