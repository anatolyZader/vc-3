// contextPipeline.js
"use strict";

const EventManager = require('./eventManager');
const PineconePlugin = require('../../pinecone/pineconePlugin');
const SemanticPreprocessor = require('./semanticPreprocessor');
const UbiquitousLanguageEnhancer = require('./ubiquitousLanguageEnhancer');
const ApiSpecProcessor = require('./processors_by_doc_type/apiSpecProcessor');
const DocsProcessor = require('./processors/docsProcessor');
const GitHubOperations = require('./githubOperations');
const ASTCodeSplitter = require('./processors_by_doc_type/astCodeSplitter');
const RepoProcessor = require('./repoProcessor');
const EmbeddingManager = require('./embeddingManager');
const RepoWorkerManager = require('./RepoWorkerManager');
const ChangeAnalyzer = require('./changeAnalyzer');
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
    console.log(`[${new Date().toISOString()}] 🎯 INITIALIZING ContextPipeline`);
    
    // Store options for lazy initialization
    this.options = options;
    this.embeddings = options.embeddings;
    this.eventBus = options.eventBus;
    this.pineconeLimiter = options.pineconeLimiter;
    this.config = options.config || {};
    
    // Initialize core components only
    this.pineconeManager = new PineconePlugin();
    this.githubOperations = new GitHubOperations({
      pineconeManager: this.pineconeManager
    });
    this.changeAnalyzer = new ChangeAnalyzer();
    this.ubiquitousLanguageEnhancer = new UbiquitousLanguageEnhancer();
    this.workerManager = new RepoWorkerManager();
    
    // Initialize document processing components
    this.astCodeSplitter = new ASTCodeSplitter({
      maxChunkSize: this.options.maxChunkSize || 2000,
      includeComments: true,
      includeImports: true
    });
    
    this.semanticPreprocessor = new SemanticPreprocessor();
    
    this.apiSpecProcessor = new ApiSpecProcessor({
      embeddings: this.embeddings,
      pineconeLimiter: this.pineconeLimiter
    });
    
    this.docsProcessor = new DocsProcessor({
      embeddings: this.embeddings,
      pineconeLimiter: this.pineconeLimiter,
      repoPreparation: this.githubOperations,
      pineconeManager: this.pineconeManager
    });
    
    // Initialize EmbeddingManager first
    this.embeddingManager = new EmbeddingManager({
      embeddings: this.embeddings,
      pineconeLimiter: this.pineconeLimiter,
      pineconeManager: this.pineconeManager
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
    return ContextPipelineUtils.detectContentType(document);
  }



  // Specialized processors for different content types
  //--------------------------------------------------
  
  async processCodeDocument(document) {
    console.log(`[${new Date().toISOString()}] 💻 CODE PROCESSING: AST splitting + semantic preprocessing + ubiquitous language enhancement`);
    
    // Step 1: Enhance document with ubiquitous language context before processing
    const ubiquitousEnhanced = this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(document);
    
    // Step 2: Apply AST-based code splitting 
    const chunks = await this.astCodeSplitter.splitDocument(ubiquitousEnhanced);
    
    // Step 3: Apply semantic preprocessing to each chunk
    const enhancedChunks = [];
    for (const chunk of chunks) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }
    
    return enhancedChunks;
  }

  async processMarkdownDocument(document) {
    console.log(`[${new Date().toISOString()}] 📝 MARKDOWN/DOCS PROCESSING: Ubiquitous language enhancement + docs splitting + semantic preprocessing`);
    
    // Step 1: Enhance document with ubiquitous language context before processing
    const ubiquitousEnhanced = this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(document);
    
    // Step 2: Apply markdown/documentation-specific splitting
    const docs = [ubiquitousEnhanced];
    const splitDocs = await this.docsProcessor.splitMarkdownDocuments(docs);
    
    // Step 3: Apply semantic preprocessing to each chunk
    const enhancedChunks = [];
    for (const chunk of splitDocs) {
      const enhanced = await this.semanticPreprocessor.preprocessChunk(chunk);
      enhancedChunks.push(enhanced);
    }
    
    return enhancedChunks;
  }

  async processOpenAPIDocument(document) {
    console.log(`[${new Date().toISOString()}] 🔌 OPENAPI PROCESSING: Ubiquitous language enhancement + specialized API documentation processing`);
    
    // Step 1: Enhance document with ubiquitous language context before processing
    const ubiquitousEnhanced = this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(document);
    
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
        console.log(`[${new Date().toISOString()}] 🔄 OPENAPI FALLBACK: No structured API content found, using semantic preprocessing`);
        const enhanced = await this.semanticPreprocessor.preprocessChunk(ubiquitousEnhanced);
        allChunks = [enhanced];
      }
      
      return allChunks;
      
    } catch (parseError) {
      console.warn(`[${new Date().toISOString()}] ⚠️ OPENAPI PARSE ERROR: ${parseError.message}, falling back to semantic preprocessing`);
      
      // Fallback to semantic preprocessing if parsing fails
      const enhanced = await this.semanticPreprocessor.preprocessChunk(ubiquitousEnhanced);
      return [enhanced];
    }
  }

  async processConfigDocument(document, contentType) {
    console.log(`[${new Date().toISOString()}] ⚙️ CONFIG PROCESSING: Ubiquitous language enhancement + semantic preprocessing for ${contentType.toUpperCase()}`);
    
    // Step 1: Enhance document with ubiquitous language context for configuration files
    const ubiquitousEnhanced = this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(document);
    
    // Step 2: Apply semantic preprocessing for domain intelligence
    const semanticallyEnhanced = await this.semanticPreprocessor.preprocessChunk(ubiquitousEnhanced);
    
    // Step 3: Return as single chunk (can be enhanced later with specific config processors)
    return [semanticallyEnhanced];
  }

  async processGenericDocument(document) {
    console.log(`[${new Date().toISOString()}] 📄 GENERIC PROCESSING: Ubiquitous language enhancement + text splitting + semantic preprocessing`);
    
    // Step 1: Enhance document with ubiquitous language context before processing
    const ubiquitousEnhanced = this.ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(document);
    
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
    // Scrub sensitive data from logs
    const safeRepoData = ContextPipelineUtils.scrubSensitiveData(repoData);
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Received repoData structure:`, JSON.stringify(safeRepoData, null, 2));  
    
    // STEP 0: Validate and extract repository data BEFORE any processing
    console.log(`[${new Date().toISOString()}] 🔵 STAGE 0: REPOSITORY DATA VALIDATION`);
    
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
      console.log(`[${new Date().toISOString()}] 🎯 EXPLANATION: Checking for duplicates and retrieving commit info`);

      // OPTIMIZED: Smart commit tracking using CommitManager
      console.log(`[${new Date().toISOString()}] 🔄 OPTIMIZED PROCESSING: Using Langchain-first approach with smart commit detection`);


      // Step 1: Try to get commit info efficiently using GitHubOperations
      const commitInfo = await this.githubOperations.getPushedCommitInfo(url, branch, githubOwner, repoName);

      if (!commitInfo) {
        throw new Error('Failed to retrieve commit information');
      }

      console.log(`[${new Date().toISOString()}] 🔑 COMMIT DETECTED: ${commitInfo?.hash?.substring(0, 8) ?? 'unknown'} - ${commitInfo?.subject ?? 'No subject'}`);

      // Step 2: Enhanced duplicate check with commit hash comparison
      const pineconeClient = await this.getPineconeClient();
      const existingRepo = await this.githubOperations.findExistingRepo(
        userId, repoId, githubOwner, repoName, commitInfo?.hash ?? null, pineconeClient, this.embeddings
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
      console.log(`[${new Date().toISOString()}] 🔍 SCALING ANALYSIS: Calling shouldUseHorizontalScaling for ${githubOwner}/${repoName}:${branch}`);
      const shouldUseHorizontalScaling = await ContextPipelineUtils.shouldUseHorizontalScaling(githubOwner, repoName, branch);
      
      console.log(`[${new Date().toISOString()}] 📊 SCALING DECISION:`, JSON.stringify(shouldUseHorizontalScaling, null, 2));
      
      // TEMPORARY FIX: Disable worker scaling due to embedding storage bug
      // Workers process files but don't store embeddings to Pinecone
      // TODO: Fix workers to actually store embeddings or modify pipeline to store worker results
      if (true && shouldUseHorizontalScaling.useWorkers) {
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

    console.log(`[${new Date().toISOString()}] � ENTRY POINT: processRepoWithWorkers() called for ${githubOwner}/${repoName}`);
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
      
      console.log(`[${new Date().toISOString()}] 🏃 Calling workerManager.processLargeRepository()...`);
      
      // Process using worker manager
      const result = await this.workerManager.processLargeRepository(repositoryJob);
      
      console.log(`[${new Date().toISOString()}] 📊 Worker manager result:`, JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log(`[${new Date().toISOString()}] ✅ Worker processing successful, storing embeddings and tracking info...`);
        
        // Step 1: Store processed chunks to Pinecone via EmbeddingManager
        const namespace = this.githubOperations.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
        
        if (result.processedChunks?.length > 0) {
          console.log(`[${new Date().toISOString()}] 📦 Storing ${result.processedChunks.length} chunks from workers to Pinecone...`);
          await this.embeddingManager.storeToPinecone(result.processedChunks, namespace, githubOwner, repoName);
        } else {
          console.log(`[${new Date().toISOString()}] ⚠️ No processed chunks from workers to store`);
        }
        
        // Step 2: Store repository tracking info for future duplicate detection
        const pineconeClient2 = await this.getPineconeClient();
        
        await this.githubOperations.storeRepositoryTrackingInfo(
          userId, repoId, githubOwner, repoName, commitInfo, 
          namespace, pineconeClient2, this.embeddings
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
        console.log(`[${new Date().toISOString()}] ❌ Worker processing returned failure:`, result);
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
      const processedDocuments = await this.repoProcessor.intelligentProcessDocuments(documents);
      
      // Step 4: Split documents with intelligent routing
      const splitDocuments = await this.repoProcessor.intelligentSplitDocuments(
        processedDocuments, 
        this.routeDocumentsToProcessors?.bind(this)
      );

      // Step 5: Store processed documents using EmbeddingManager
      const namespace = this.githubOperations.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
      await this.embeddingManager.storeToPinecone(splitDocuments, namespace, githubOwner, repoName);
      
      // Step 6: Store repository tracking info for future duplicate detection  
      if (commitHash) {
        const pineconeClient2 = await this.getPineconeClient();
        await this.githubOperations.storeRepositoryTrackingInfo(
          userId, repoId, githubOwner, repoName, actualCommitInfo, 
          namespace, pineconeClient2, this.embeddings
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
  async _checkExistingRepo(githubOwner, repoName, currentCommitHash) {
    try {
      const namespace = this.githubOperations.sanitizeId(`${githubOwner}_${repoName}_main`);
      const pineconeClient = await this.getPineconeClient();
      
      // Query for any existing documents in this namespace
      const queryResponse = await pineconeClient.namespace(namespace).query({
        vector: new Array(1536).fill(0), // Dummy vector for existence check
        topK: 1,
        includeMetadata: true
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const existingCommit = queryResponse.matches[0].metadata?.commitHash;
        return {
          exists: true,
          commitHash: existingCommit,
          needsUpdate: existingCommit !== currentCommitHash,
          namespace,
          reason: existingCommit === currentCommitHash ? 'same_commit' : 'commit_changed'
        };
      }

      return { exists: false, namespace };
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ℹ️ Repository check: ${error.message}`);
      return { exists: false, namespace: this.githubOperations.sanitizeId(`${githubOwner}_${repoName}_main`) };
    }
  }
}

module.exports = ContextPipeline;
