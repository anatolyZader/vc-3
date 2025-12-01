// contextPipeline.js
"use strict";

const logConfig = require('./logConfig');
const EventManager = require('./eventManager');
const SemanticPreprocessor = require('./enhancers/semanticPreprocessor');
const UbiquitousLanguageEnhancer = require('./enhancers/ubiquitousLanguageEnhancer');
const CodePreprocessor = require('./processors/codePreprocessor');
const TextPreprocessor = require('./processors/textPreprocessor');
const ApiSpecProcessor = require('./processors/apiSpecProcessor');
const DocsProcessor = require('./processors/docsProcessor');
const GitHubOperations = require('./loading/githubOperations');
const ASTCodeSplitter = require('./chunking/astCodeSplitter');
const RepoProcessor = require('./processors/repoProcessor');
const EmbeddingManager = require('./embedding/embeddingManager');
const RepoWorkerManager = require('./loading/repoWorkerManager');
const ChangeAnalyzer = require('./loading/changeAnalyzer');
const ContextPipelineUtils = require('./contextPipelineUtils');

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
    // Store options for lazy initialization
    this.options = options;
    this.embeddings = options.embeddings;
    this.eventBus = options.eventBus;
    this.config = options.config || {};
    
    // Initialize core components
    this.githubOperations = new GitHubOperations();
    this.changeAnalyzer = new ChangeAnalyzer();
    this.ubiquitousLanguageEnhancer = new UbiquitousLanguageEnhancer();
    this.workerManager = new RepoWorkerManager();
    
    // Initialize document processing components
    this.codePreprocessor = new CodePreprocessor({
      excludeImportsFromChunking: this.options.excludeImportsFromChunking !== false,
      preserveDocComments: this.options.preserveDocComments !== false,
      normalizeWhitespace: this.options.normalizeWhitespace !== false,
      extractStructuralInfo: this.options.extractStructuralInfo !== false
    });
    
    this.astCodeSplitter = new ASTCodeSplitter({
      maxTokens: this.options.maxTokens || 500,        // Token-based chunking
      minTokens: this.options.minTokens || 30,         // Minimum meaningful tokens  
      overlapTokens: this.options.overlapTokens || 50, // Token overlap
      enableLineFallback: true,                        // Enable fallback for large files
      maxUnitsPerChunk: 1,                            // One semantic unit per chunk for granularity
      charsPerToken: 4,                               // Characters per token estimate
      // UL Enhancement: Smart comment inclusion based on file type
      includeComments: this.shouldIncludeCommentsForUL.bind(this),
      includeImports: false
    });
    
    this.semanticPreprocessor = new SemanticPreprocessor();
    this.textPreprocessor = new TextPreprocessor();
    
    // Initialize vector database service (PostgreSQL pgvector only)
    let vectorService = null;
    
    try {
      const PGVectorService = require('./embedding/pgVectorService');
      vectorService = PGVectorService.fromEnvironment();
      console.log(`[${new Date().toISOString()}] ✅ ContextPipeline using PostgreSQL pgvector`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to initialize PostgreSQL pgvector:`, error.message);
      throw new Error(`PostgreSQL pgvector initialization failed: ${error.message}`);
    }
    
    // Initialize EmbeddingManager with pgvector service
    this.embeddingManager = new EmbeddingManager({
      embeddings: this.embeddings,
      pgVectorService: vectorService
    });
    
    // Initialize docsProcessor with pgvector service
    this.docsProcessor = new DocsProcessor({
      embeddings: this.embeddings,
      vectorService: vectorService,
      repoPreparation: this.githubOperations
    });

    // Initialize apiSpecProcessor with pgvector service
    this.apiSpecProcessor = new ApiSpecProcessor({
      embeddings: this.embeddings,
      vectorService: vectorService
    });
    
    // Initialize repoProcessor with pure processing dependencies only
    this.repoProcessor = new RepoProcessor({
      astBasedSplitter: this.astCodeSplitter,
      semanticPreprocessor: this.semanticPreprocessor,
      ubiquitousLanguageProcessor: this.ubiquitousLanguageEnhancer
    });
    
    // Initialize EventManager
    this.eventManager = new EventManager({
      eventBus: this.eventBus
    });
    
    // Initialize tracing if enabled
    this._initializeTracing();
  }

  /**
   * Smart comment inclusion for UL enhancement
   * Enable comments for domain/application files where UL terms are more likely
   */
  shouldIncludeCommentsForUL(source) {
    if (!source) return false;
    
    // Always include comments for domain and application layers
    const domainPatterns = [
      /domain\//,
      /application\//,
      /business_modules\/[^/]+\/(domain|application)\//,
      /entities\//,
      /services\//,
      /use[_-]?cases?\//
    ];
    
    if (domainPatterns.some(pattern => pattern.test(source))) {
      return true;
    }
    
    // Include comments for files with domain-specific names
    const domainNames = [
      'conversation', 'message', 'user', 'account',
      'event', 'command', 'query', 'aggregate',
      'repository', 'factory', 'specification'
    ];
    
    const filename = source.toLowerCase().split('/').pop() || '';
    if (domainNames.some(name => filename.includes(name))) {
      return true;
    }
    
    // Exclude comments for infrastructure code where they add noise
    const infraPatterns = [
      /infrastructure\//,
      /adapters?\//,
      /repositories?\//,
      /config\//,
      /build\//,
      /test/
    ];
    
    return !infraPatterns.some(pattern => pattern.test(source));
  }

  _initializeTracing() {
    this.enableTracing = process.env.LANGSMITH_TRACING === 'true' && !!traceable;

    if (!this.enableTracing) {
      return;
    }    // bind(this) call ensures that when processPushedRepo is eventually called, the this keyword inside that method will always refer to the current object, regardless of how or where the method is invoked.
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

  async routeDocumentToProcessor(document) {
    const contentType = this.detectContentType(document);
    // document.metadata is a property of LangChain Document objects. In your RAG pipeline, documents are created by LangChain's document loaders when they process files from repositories. CloudNativeRepoLoader creates LangChain-compatible documents with metadata fields including source file path, etc.
    const source = document.metadata?.source || 'unknown';
    
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
    return ContextPipelineUtils.detectContentType(document);
  }



  // Specialized processors for different content types
  //--------------------------------------------------
  
  async processCodeDocument(document) {
    // Code document processing - removed per-step logging for performance
    console.log(`[${new Date().toISOString()}] � Processing code document: ${document.metadata?.source || 'unknown'}`);
    
    // Apply processing steps efficiently
    const preprocessedDocument = await this.codePreprocessor.preprocessCodeDocument(document, {
      excludeImportsFromChunking: true,
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      preserveWarnLogs: false,
      addStructuralMarkers: false
    });
    
    const ubiquitousEnhanced = await this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(preprocessedDocument);
    const rawChunks = this.astCodeSplitter.split(ubiquitousEnhanced.pageContent || ubiquitousEnhanced.content || '', ubiquitousEnhanced.metadata || {});
    
    const chunks = rawChunks.map(chunk => ({
      pageContent: chunk.pageContent,
      metadata: {
        ...ubiquitousEnhanced.metadata,
        ...chunk.metadata
      }
    }));
    
    const enhancedChunks = [];
    for (const chunk of chunks) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Code document completed: ${enhancedChunks.length} chunks`);
    return enhancedChunks;
  }

  async processMarkdownDocument(document) {
    // Mirror structure of other document-type processors (per-document only)
    console.log(`[${new Date().toISOString()}] 📝 MARKDOWN: Processing individual markdown document: ${document.metadata?.source || 'unknown'}`);

    // Step 1: Apply TextPreprocessor for advanced markdown normalization and enhancement
    const filePath = document.metadata?.source || 'unknown.md';
    const preprocessedResult = await this.textPreprocessor.preprocessTextFile(
      document.pageContent,
      filePath,
      document.metadata || {}
    );

    // Create enhanced document with preprocessed content and metadata
    const preprocessedDocument = {
      pageContent: preprocessedResult.content,
      metadata: {
        ...document.metadata,
        ...preprocessedResult.metadata,
        preprocessingApplied: preprocessedResult.preprocessingApplied
      }
    };

    // Step 2: Enhance document with ubiquitous language context
    const ubiquitousEnhanced = await this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(preprocessedDocument);

    // Step 3: Apply markdown/documentation-specific splitting
    const docs = [ubiquitousEnhanced];
    const splitDocs = await this.docsProcessor.splitMarkdownDocuments(docs);

    // Step 4: Apply semantic preprocessing to each chunk
    const enhancedChunks = [];
    for (const chunk of splitDocs) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }

    console.log(`[${new Date().toISOString()}] ✅ MARKDOWN: Processing completed - ${enhancedChunks.length} enhanced chunks ready`);

    return enhancedChunks;
  }

  async processOpenAPIDocument(document) {
    // Step 1: Enhance document with ubiquitous language context before processing
    const ubiquitousEnhanced = await this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(document);
    
    try {
      // Parse the OpenAPI content
      const apiSpecContent = typeof ubiquitousEnhanced.pageContent === 'string' 
        ? JSON.parse(ubiquitousEnhanced.pageContent) 
        : ubiquitousEnhanced.pageContent;
      
      // Create documents array for processing
      const documents = [ubiquitousEnhanced];
      
      // Use ApiSpecProcessor's specialized chunking methods for better structure
      let allChunks = [];
      
      // Process endpoints if they exist
      if (apiSpecContent.paths) {
        const endpointChunks = await this.apiSpecProcessor.chunkApiSpecEndpoints(apiSpecContent, documents);
        allChunks.push(...endpointChunks);
      }
      
      // Process schemas if they exist  
      if (apiSpecContent.components?.schemas || apiSpecContent.definitions) {
        const schemaChunks = await this.apiSpecProcessor.chunkApiSpecSchemas(apiSpecContent, documents);
        allChunks.push(...schemaChunks);
      }
      
      // If no structured content found, fallback to semantic preprocessing
      if (allChunks.length === 0) {
        const enhanced = await this.semanticPreprocessor.preprocessChunk(ubiquitousEnhanced);
        allChunks = [enhanced];
      }
      
      return allChunks;
      
    } catch (parseError) {
      // Fallback to semantic preprocessing if parsing fails
      const enhanced = await this.semanticPreprocessor.preprocessChunk(ubiquitousEnhanced);
      return [enhanced];
    }
  }

  async processConfigDocument(document, contentType) {
    // Step 1: Enhance document with ubiquitous language context for configuration files
    const ubiquitousEnhanced = await this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(document);
    
    // Step 2: Apply semantic preprocessing for domain intelligence
    const semanticallyEnhanced = await this.semanticPreprocessor.preprocessChunk(ubiquitousEnhanced);
    
    // Step 3: Return as single chunk (can be enhanced later with specific config processors)
    return [semanticallyEnhanced];
  }

  async processGenericDocument(document) {
    // Step 1: Enhance document with ubiquitous language context before processing
    const ubiquitousEnhanced = await this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(document);
    
    // Step 2: Split document into manageable chunks 
    const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.options.maxChunkSize || 1500,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', '']  // Generic text splitting
    });
    
    const splitDocs = await textSplitter.splitDocuments([ubiquitousEnhanced]);
    
    // Step 3: Apply semantic preprocessing to each chunk
    const enhancedChunks = [];
    for (const chunk of splitDocs) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }
    
    return enhancedChunks;
  }

  async routeDocumentsToProcessors(documents) {
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

    return allChunks;
  }


  // entry point for processing a pushed repository

  async processPushedRepo(userId, repoId, repoData) {
    // Scrub sensitive data from logs
    const safeRepoData = ContextPipelineUtils.scrubSensitiveData(repoData);
    
    // Early validation - fail fast if data is invalid
    if (!repoData?.url || !repoData?.branch) {
      const errorMsg = 'Invalid repository data: missing url or branch';
      console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: ${errorMsg}`);
      return ContextPipelineUtils.createStandardResult({
        success: false,
        mode: 'validation_failed',
        reason: 'invalid_repo_data',
        details: { missingFields: { url: !repoData?.url, branch: !repoData?.branch } },
        repoId,
        userId
      });
    }

    // Extract repository information using robust parsing
    const url = repoData.url;
    const branch = repoData.branch;
    const { githubOwner, repoName } = ContextPipelineUtils.parseRepositoryUrl(url);
    
    if (!githubOwner || !repoName) {
      const errorMsg = 'Failed to parse repository URL';
      console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: ${errorMsg}: ${url}`);
      return ContextPipelineUtils.createStandardResult({
        success: false,
        mode: 'validation_failed',
        reason: 'invalid_url_format',
        details: { url, parsedOwner: githubOwner, parsedName: repoName },
        repoId,
        userId
      });
    }

    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Extracted GitHub owner: ${githubOwner}, repo name: ${repoName}`);

    // Initialize EventManager with context and emit processing started
    this.eventManager.userId = userId;
    this.eventManager.repoId = repoId;
    this.eventManager.emitProcessingStarted(userId, repoId);
    
    try {
      console.log(`[${new Date().toISOString()}] 🔵 STAGE 1: REPOSITORY VALIDATION & SETUP`);
      // OPTIMIZED: Smart commit tracking using CommitManager


      // Step 1: Try to get commit info efficiently using GitHubOperations
      const commitInfo = await this.githubOperations.getPushedCommitInfo(url, branch, githubOwner, repoName);

      if (!commitInfo) {
        throw new Error('Failed to retrieve commit information');
      }

      console.log(`[${new Date().toISOString()}] 🔑 COMMIT DETECTED: ${commitInfo?.hash?.substring(0, 8) ?? 'unknown'} - ${commitInfo?.subject ?? 'No subject'}`);

      // Step 2: Enhanced duplicate check with commit hash comparison (pgvector-based)
      const existingRepo = await this.githubOperations.findExistingRepo(
        userId, repoId, githubOwner, repoName, commitInfo?.hash ?? null, null, this.embeddings
      );
      
      if (existingRepo) {
        if (existingRepo.reason === 'same_commit') {
          console.log(`[${new Date().toISOString()}] ⏭️ SKIPPING: Repository at same commit (${commitInfo?.hash?.substring(0, 8) ?? 'unknown'}), no changes to process`);
          this.eventManager.emitProcessingSkipped(userId, repoId, 'No changes - same commit hash', commitInfo?.hash ?? null);
          
          return ContextPipelineUtils.createStandardResult({
            success: true,
            mode: 'skipped',
            reason: 'same_commit',
            message: 'Repository already processed at same commit',
            commitHash: commitInfo?.hash ?? null,
            repoId,
            userId
          });
        } else if (existingRepo.reason === 'commit_changed' && existingRepo.requiresIncremental) {
          console.log(`[${new Date().toISOString()}] 🧠 SMART ANALYSIS: Repository has changes, analyzing change impact for optimal processing strategy`);
          
          // Use ChangeAnalyzer for intelligent processing decisions
          const smartDecision = await ContextPipelineUtils.makeSmartProcessingDecision({
            userId, repoId, repoUrl: url, branch, githubOwner, repoName,
            oldCommitHash: existingRepo.existingCommitHash, newCommitInfo: commitInfo
          }, this);
          
          return smartDecision;
        }
        // If existingRepo exists but doesn't match above conditions, fall through to full processing
        console.log(`[${new Date().toISOString()}] 🔄 FULL PROCESSING REQUIRED: Repository exists but requires full reprocessing (reason: ${existingRepo.reason})`);
      }

      console.log(`[${new Date().toISOString()}] 🆕 FULL PROCESSING: New repository or major changes, using integrated strategy`);
      const result = await this.processFullRepo({
        userId, repoId, repoUrl: url, branch, githubOwner, repoName, commitInfo
      });

      // Emit completion event
      this.eventManager.emitProcessingCompleted(userId, repoId, result);
      
      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error in orchestration for repository ${repoId}:`, error.message);
      
      // IMMEDIATE GITHUB API FALLBACK: Detect Git-related errors and skip to API approach
      const isGitError = this.githubOperations?.constructor.isGitError?.(error) || 
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
        // Delegate to githubOperations for GitHub API fallback processing
        const result = await this.githubOperations.processRepositoryViaDirectAPIFallback({
          userId, repoId, repoUrl: url, branch, githubOwner, repoName,
          repoProcessor: this.repoProcessor,
          repoPreparation: this.githubOperations,
          pineconeClient: null, // Not using Pinecone anymore
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
      
      return ContextPipelineUtils.createStandardResult({
        success: false,
        mode: 'error',
        reason: 'orchestration_failed',
        details: { error: error.message },
        repoId,
        userId
      });
    }
  }

  /**
   * OPTIMIZED: Full repository processing using Langchain-first approach
   * Enhanced with horizontal scaling for large repositories
   */
  async processFullRepo(params) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      commitInfo,
      analysisRecommendation = null
    } = params;

    console.log(`[${new Date().toISOString()}] 🔵 OPTIMIZED FULL PROCESSING: Analyzing repository size for processing strategy`);
    
    try {
      // Step 1: Analyze repository size to determine processing strategy
      const shouldUseHorizontalScaling = await ContextPipelineUtils.shouldUseHorizontalScaling(githubOwner, repoName, branch);
      
      if (shouldUseHorizontalScaling.useWorkers) {
        console.log(`[${new Date().toISOString()}] 🏭 HORIZONTAL SCALING: Repository size (${shouldUseHorizontalScaling.estimatedFiles} files) exceeds threshold, using worker-based processing`);
        console.log(`[${new Date().toISOString()}] 🚀 CALLING processRepoWithWorkers...`);
        
        // Use worker-based horizontal scaling for large repositories
        return await this.processRepoWithWorkers({
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
        console.log(`[${new Date().toISOString()}] 📝 Reason: ${shouldUseHorizontalScaling.reason}`);
        console.log(`[${new Date().toISOString()}] 🚀 CALLING processSmallRepo...`);
        
        // Use standard Langchain-first approach for smaller repositories
        return await this.processSmallRepo({
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
  async processRepoWithWorkers(params) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      commitInfo
    } = params;

    // Initialize analysis recommendation variable
    const analysisRecommendation = null;

    console.log(`[${new Date().toISOString()}] 🚀 ENTRY POINT: processRepoWithWorkers() called for ${githubOwner}/${repoName}`);
    console.log(`[${new Date().toISOString()}] �🏭 WORKER PROCESSING: Starting horizontal scaling for ${githubOwner}/${repoName}`);
    
    try {
      // Create repository job for worker processing
      console.log(`[${new Date().toISOString()}] 📋 Creating repository job...`);
      const repositoryJob = {
        userId,
        repoId,
        repoUrl,
        branch,
        githubOwner,
        repoName,
        commitInfo
      };
      
      console.log(`[${new Date().toISOString()}] 🔧 Checking workerManager availability...`);
      if (!this.workerManager) {
        throw new Error('workerManager is not initialized');
      }
      
      // Process using worker manager with embeddingManager for storage
      const result = await this.workerManager.processLargeRepository(
        repositoryJob, 
        this.embeddingManager,
        this.textSearchService  // Pass text search service for PostgreSQL storage
      );
      
      if (result.success) {
        logConfig.logProcessing(`[${new Date().toISOString()}] ✅ Worker processing successful, storing tracking info...`);
        
        // Step 2: Store repository tracking info for future duplicate detection (pgvector)
        const namespace = CollectionNameGenerator.generateForRepository({ repoId, githubOwner, repoName });
        
        await this.githubOperations.storeRepositoryTrackingInfo(
          userId, repoId, githubOwner, repoName, commitInfo, 
          namespace, null, this.embeddings
        );

        return ContextPipelineUtils.createStandardResult({
          success: true,
          mode: 'full',
          reason: analysisRecommendation ? 'smart_full_scaling' : 'large_repository_scaling',
          message: analysisRecommendation 
            ? `Smart full processing with scaling: ${analysisRecommendation.reasoning}`
            : 'Large repository processing completed with horizontal scaling',
          commitHash: commitInfo?.hash ?? null,
          details: {
            totalDocuments: result.totalDocuments || 0,
            totalChunks: result.totalChunks || 0,
            githubOwner,
            repoName,
            namespace,
            processingStrategy: 'horizontal_scaling',
            workersUsed: result.workersUsed,
            processingTime: result.processingTime,
            jobId: result.jobId,
            ...(analysisRecommendation && { smartAnalysis: analysisRecommendation })
          },
          repoId,
          userId
        });
      } else {
        console.error(`[${new Date().toISOString()}] ❌ Worker processing returned failure: ${result.error || 'Unknown worker error'}`);
        throw new Error(`Worker processing failed: ${result.error || 'Unknown worker error'}`);
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Worker processing failed for ${repoId}:`, error.message);
      console.error(`[${new Date().toISOString()}] 🔍 Error stack:`, error.stack);
      
      // Emit worker failure event for monitoring
      this.eventManager.emitProcessingError(userId, repoId, error, 'horizontal_scaling_failure');
      
      // Fallback to standard processing
      console.log(`[${new Date().toISOString()}] 🔄 FALLBACK: Worker system failed, using standard processing as backup`);
      console.warn(`[${new Date().toISOString()}] ⚠️ INFRASTRUCTURE ISSUE: Horizontal scaling not available - ${error.message}`);
      
      const fallbackResult = await this.processSmallRepo(params);
      
      // Add worker failure information to the result
      if (fallbackResult.success && fallbackResult.details) {
        fallbackResult.details.workerFailure = {
          attempted: true,
          error: error.message,
          fallbackUsed: 'standard_processing'
        };
        fallbackResult.details.processingStrategy = 'standard_fallback';
        fallbackResult.message = `Processing completed using standard approach (worker system failed: ${error.message.substring(0, 100)})`;
      }
      
      return fallbackResult;
    }
  }

  /**
   * Process standard repository using existing Langchain approach
   */
  async processSmallRepo(params) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      commitInfo
    } = params;

    // Initialize analysis recommendation (safe default)
    const analysisRecommendation = null;

    console.log(`[${new Date().toISOString()}] 🔵 STANDARD PROCESSING: Using Langchain-first approach for repository`);
    
    try {
      // Step 1: Get commit info and check for existing processing
      const actualCommitInfo = commitInfo || await this.githubOperations.getCommitInfoFromGitHubAPI(githubOwner, repoName, branch);
      const commitHash = actualCommitInfo?.hash;
      
      if (commitHash) {
        // Check if already processed
        const existingRepo = await this._checkExistingRepo(githubOwner, repoName, commitHash);
        if (existingRepo?.reason === 'same_commit') {
          console.log(`[${new Date().toISOString()}] ✅ SKIP: Repository ${githubOwner}/${repoName} already processed for commit ${commitHash}`);
          return { success: true, skipped: true, reason: 'same_commit' };
        }
      }

      // Step 2: Load documents using RepoProcessor (pure processing)
      const documents = await this.repoProcessor.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, actualCommitInfo);
      
      if (documents.length === 0) {
        console.log(`[${new Date().toISOString()}] ⚠️ No documents loaded from repository`);
        return { success: true, documentsProcessed: 0, chunksGenerated: 0 };
      }

      // Step 3: Process documents with RepoProcessor (pure processing)
      console.log(`[${new Date().toISOString()}] 🔄 Processing ${documents.length} documents`);
      console.log(`[${new Date().toISOString()}] 🔍 CALLING: repoProcessor.intelligentProcessDocuments()`);
      const processedDocuments = await this.repoProcessor.intelligentProcessDocuments(documents);
      console.log(`[${new Date().toISOString()}] ✅ RETURNED: ${processedDocuments.length} processed documents`);
      
      // Step 4: Split documents with intelligent routing
      const splitDocuments = await this.repoProcessor.intelligentSplitDocuments(
        processedDocuments, 
        this.routeDocumentsToProcessors?.bind(this)
      );

      // Step 4.5: UL PRESENCE VALIDATION - Assert UL metadata exists before storage
      console.log(`[${new Date().toISOString()}] 🔍 UL_VALIDATION: Checking ${splitDocuments.length} chunks for UL metadata...`);
      let ulMissingCount = 0;
      let ulPresentCount = 0;
      for (const doc of splitDocuments) {
        if (!doc.metadata?.ubiq_enhanced) {
          ulMissingCount++;
          if (ulMissingCount <= 3) { // Log first 3 only
            console.warn(`[${new Date().toISOString()}] ⚠️  UL_MISSING: ${doc.metadata?.source || 'unknown'} - ubiq_enhanced: ${doc.metadata?.ubiq_enhanced}`);
          }
        } else {
          ulPresentCount++;
        }
      }
      console.log(`[${new Date().toISOString()}] 📊 UL_VALIDATION: ${ulPresentCount}/${splitDocuments.length} chunks have UL metadata, ${ulMissingCount} missing`);

      // Step 5: Store processed documents to pgvector using EmbeddingManager
      await this.embeddingManager.storeRepositoryDocuments(splitDocuments, userId, repoId, githubOwner, repoName);
      
      // Step 5.5: Store chunks to PostgreSQL text search with rich metadata
      if (this.textSearchService) {
        try {
          console.log(`[${new Date().toISOString()}] 💾 Storing ${splitDocuments.length} chunks to PostgreSQL text search...`);
          const storeResult = await this.textSearchService.storeChunks(
            splitDocuments, 
            userId, 
            repoId,
            {
              includeMetadata: true  // Include all semantic tags and metadata
            }
          );
          console.log(`[${new Date().toISOString()}] ✅ PostgreSQL text search storage complete - ${storeResult.stored} new, ${storeResult.updated || 0} updated, ${storeResult.skipped} skipped`);
        } catch (pgError) {
          console.error(`[${new Date().toISOString()}] ⚠️  PostgreSQL text search storage failed (non-fatal):`, pgError.message);
          // Don't fail the whole process if PostgreSQL storage fails
        }
      } else {
        console.log(`[${new Date().toISOString()}] ⏭️  Text search service not available, skipping PostgreSQL text search storage`);
      }
      
      // Step 6: Store repository tracking info for future duplicate detection (pgvector)
      if (commitHash) {
        await this.githubOperations.storeRepositoryTrackingInfo(
          userId, repoId, githubOwner, repoName, actualCommitInfo, 
          namespace, null, this.embeddings
        );
      }

      // Prepare result
      const result = {
        success: true,
        documentsProcessed: documents.length,
        chunksGenerated: splitDocuments.length,
        commitInfo: actualCommitInfo,
        namespace,
        processedAt: new Date().toISOString()
      };

      return ContextPipelineUtils.createStandardResult({
        success: true,
        mode: 'full',
        reason: analysisRecommendation ? 'smart_full_standard' : 'standard_processing',
        message: analysisRecommendation 
          ? `Smart full processing: ${analysisRecommendation.reasoning}`
          : 'Standard repository processing completed with Langchain-first approach',
        commitHash: commitInfo?.hash ?? null,
        details: {
          totalDocuments: result.documentsProcessed || 0,
          totalChunks: result.chunksGenerated || 0,
          githubOwner,
          repoName,
          namespace,
          processingStrategy: 'standard_langchain',
          ...(analysisRecommendation && { smartAnalysis: analysisRecommendation })
        },
        repoId,
        userId
      });
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Standard processing error for ${repoId}:`, error.message);
      throw error;
    }
  }

  emitRagStatus(status, details = {}) {
    return this.eventManager.emitRagStatus(status, details);
  }

  /**
   * Check if repository already exists and processed for given commit
   * Moved from RepoProcessor as part of orchestration responsibility
   */
  /**
   * Check if repository already exists in vector store using service abstraction
   * FIXED: Use vectorService abstraction instead of direct Pinecone calls
   */
  async _checkExistingRepo(githubOwner, repoName, currentCommitHash) {
    try {
      const namespace = CollectionNameGenerator.generateForRepository({ githubOwner, repoName });
      
      // Use vectorService abstraction to get namespace stats
      const namespaceStats = await this.embeddingManager.vectorService.getNamespaceStats(namespace);
      
      if (!namespaceStats || namespaceStats.vectorCount === 0) {
        console.log(`[${new Date().toISOString()}] 📊 Namespace '${namespace}' not found or empty`);
        return { exists: false, namespace };
      }
      
      console.log(`[${new Date().toISOString()}] 📊 Namespace '${namespace}' exists with ${namespaceStats.vectorCount} vectors`);
      
      // Namespace exists and has vectors - now check commit hash using vectorService
      const queryResults = await this.embeddingManager.vectorService.querySimilar(
        await this.embeddings.embedQuery('repository metadata'),
        {
          namespace: namespace,
          topK: 1,
          includeMetadata: true,
          filter: {
            repoOwner: { $eq: githubOwner },
            repoName: { $eq: repoName }
          }
        }
      );

      if (queryResults && queryResults.length > 0) {
        const existingCommit = queryResults[0].metadata?.commitHash;
        return {
          exists: true,
          commitHash: existingCommit,
          needsUpdate: existingCommit !== currentCommitHash,
          namespace,
          vectorCount: namespaceStats.vectorCount,
          reason: existingCommit === currentCommitHash ? 'same_commit' : 'commit_changed'
        };
      }

      // Namespace has vectors but none match this repo (multi-repo index?)
      return { 
        exists: false, 
        namespace,
        vectorCount: namespaceStats.vectorCount,
        reason: 'repo_not_found_in_namespace'
      };
      
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ℹ️ Repository check error: ${error.message}`);
      return { 
        exists: false, 
        namespace: CollectionNameGenerator.generateForRepository({ repoId }),
        error: error.message
      };
    }
  }
}

module.exports = ContextPipeline;
