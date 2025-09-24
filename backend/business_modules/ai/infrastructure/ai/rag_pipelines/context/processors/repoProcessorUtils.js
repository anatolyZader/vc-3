// RepoProcessorUtils.js - Utility methods for repository processing operations
"use strict";

const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');

/**
 * Repository Processing Utilities - Contains implementation methods for repository operations
 * 
 * Key utilities:
 * 1. Git operations and local repository handling
 * 2. Document processing and chunking utilities
 * 3. File operations and cleanup methods
 * 4. Pinecone integration utilities
 */
class RepoProcessorUtils {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pineconeLimiter = options.pineconeLimiter;
    this.repoManager = options.repositoryManager;
    this.repoCommitManager = options.commitManager;
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    this.astBasedSplitter = options.astBasedSplitter;
    this.semanticPreprocessor = options.semanticPreprocessor;
    this.pineconeManager = options.pineconeManager;
    this.routingProvider = options.routingProvider; // Access to centralized routing
    
    // Get the shared Pinecone service from the connection manager
    this.pineconeService = this.pineconeManager?.getPineconeService();
    this.pinecone = this.pineconeService; // For backward compatibility
    
    // Cache for git operations
    this.gitCache = new Map();
  }

  /**
   * ENHANCED: Use Langchain GitLoader with smart commit tracking
   */
  async processRepository(repoUrl, branch = 'main', namespace = null) {
    console.log(`[${new Date().toISOString()}] 🚀 OPTIMIZED PROCESSING: Using enhanced GitHub API approach (no local cloning)`);
    
    const { githubOwner, repoName } = this.parseRepoUrl(repoUrl);
    if (!namespace) {
      namespace = this.repoManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
    }

    // Use GitHub API directly - no local git cloning required
    console.log(`[${new Date().toISOString()}] 🔄 PROCESSING: Using GitHub API via LangChain (Cloud Run compatible)`);
    return await this.processWithGitHubAPI(repoUrl, githubOwner, repoName, branch, namespace);
  }

  /**
   * Process repository using local git operations
   */
  async processWithLocalGit(repoUrl, githubOwner, repoName, branch, namespace) {
    let tempDir = null;
    
    try {
      // Only clone when absolutely necessary for git operations
      tempDir = await this.repoManager.cloneRepository(repoUrl, branch);
      
      // Get commit info from local git
      const commitHash = await this.repoCommitManager.getCommitHashFromLocalGit(tempDir);
      const commitInfo = await this.repoCommitManager.getCommitInfoFromLocalGit(tempDir);
      
      // Check existing processing
      const existingRepo = await this.checkExistingRepo(githubOwner, repoName, commitHash);
      
      if (existingRepo?.reason === 'same_commit') {
        return { success: true, skipped: true, reason: 'same_commit' };
      }

      // Load documents using Langchain (even with local path)
      const documents = await this.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      if (existingRepo?.reason === 'commit_changed') {
        // Get changed files from local git
        const changedFiles = await this.repoCommitManager.getChangedFilesFromLocalGit(
          tempDir, existingRepo.existingCommitHash, commitHash
        );
        
        const changedDocuments = documents.filter(doc => 
          changedFiles.some(file => doc.metadata.source?.includes(file))
        );
        
        console.log(`[${new Date().toISOString()}] 🔄 INCREMENTAL: Processing ${changedDocuments.length} changed files via local git`);
        return await this.processFilteredDocuments(changedDocuments, namespace, commitInfo, true);
      }

      // Full processing
      return await this.processFilteredDocuments(documents, namespace, commitInfo, false);

    } finally {
      // Always cleanup temp directory
      if (tempDir) {
        await this.repoManager.cleanupTempDir(tempDir);
      }
    }
  }

  /**
   * NEW: Process repository using GitHub API (Cloud Run compatible - no Git required)
   */
  async processWithGitHubAPI(repoUrl, githubOwner, repoName, branch, namespace) {
    try {
      // Get current commit info from GitHub API using LangChain's built-in capability
      const commitInfo = await this.getCommitInfoFromGitHubAPI(githubOwner, repoName, branch);
      const commitHash = commitInfo?.hash;
      
      if (!commitHash) {
        console.log(`[${new Date().toISOString()}] ⚠️ Could not get commit hash from GitHub API, using simplified processing`);
        return await this.processWithSimplifiedGitHubAPI(repoUrl, githubOwner, repoName, branch, namespace);
      }

      // Check existing processing
      const existingRepo = await this.checkExistingRepo(githubOwner, repoName, commitHash);
      
      if (existingRepo?.reason === 'same_commit') {
        console.log(`[${new Date().toISOString()}] ✅ SKIP: Repository ${githubOwner}/${repoName} already processed for commit ${commitHash}`);
        return { success: true, skipped: true, reason: 'same_commit' };
      }

      // Load documents using LangChain GitHub API loader
      const documents = await this.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      if (existingRepo?.reason === 'commit_changed') {
        // For GitHub API, we don't have easy diff detection, so process all files
        // In future, we could implement GitHub API diff detection
        console.log(`[${new Date().toISOString()}] 🔄 COMMIT CHANGED: Processing all documents (GitHub API doesn't support incremental diff yet)`);
        return await this.processFilteredDocuments(documents, namespace, commitInfo, false);
      }

      // Full processing
      console.log(`[${new Date().toISOString()}] 📥 FULL PROCESSING: Processing ${documents.length} documents via GitHub API`);
      return await this.processFilteredDocuments(documents, namespace, commitInfo, false);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ ERROR in GitHub API processing:`, error);
      // Fallback to simplified processing without commit tracking
      return await this.processWithSimplifiedGitHubAPI(repoUrl, githubOwner, repoName, branch, namespace);
    }
  }

  /**
   * FALLBACK: Simplified GitHub API processing without commit tracking
   */
  async processWithSimplifiedGitHubAPI(repoUrl, githubOwner, repoName, branch, namespace) {
    try {
      console.log(`[${new Date().toISOString()}] 🔧 FALLBACK: Using simplified GitHub API processing`);
      
      // Create basic commit info
      const commitInfo = {
        hash: 'unknown',
        message: 'Processed via GitHub API',
        author: 'automated',
        date: new Date().toISOString()
      };

      // Load documents using LangChain
      const documents = await this.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      console.log(`[${new Date().toISOString()}] 📥 SIMPLIFIED: Processing ${documents.length} documents`);
      return await this.processFilteredDocuments(documents, namespace, commitInfo, false);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ CRITICAL ERROR in simplified GitHub API processing:`, error);
      throw error;
    }
  }

  /**
   * ENHANCED: Load documents using batched processing to handle large repositories
   */
  async loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo) {
    console.log(`[${new Date().toISOString()}] 📥 BATCHED LOADER: Using progressive batched processing for large repositories`);
    
    // Define processing batches with different priorities and scopes
    const processingBatches = [
      {
        name: 'Core Documentation',
        recursive: false,
        priority: 1,
        maxConcurrency: 2,
        ignoreFiles: [
          'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 'temp/**',
          '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store', '*.min.js', '*.min.css',
          'backend/**', 'client/**', 'tools/**' // Skip large directories in this batch
        ]
      },
      {
        name: 'Backend JavaScript/TypeScript',
        recursive: true,
        priority: 2,
        maxConcurrency: 2,
        fileTypeFilter: ['js', 'ts', 'jsx', 'tsx'],
        ignoreFiles: [
          'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 'temp/**',
          '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store', '*.min.js', '*.min.css',
          'client/**', 'tools/**', // Focus only on backend
          '**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts'
        ]
      },
      {
        name: 'Backend Configuration & Docs',
        recursive: true,
        priority: 3,
        maxConcurrency: 2,
        fileTypeFilter: ['md', 'json', 'yml', 'yaml'],
        ignoreFiles: [
          'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 'temp/**',
          '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store', '*.min.js', '*.min.css',
          'client/**', 'tools/**', // Focus only on backend
          'package-lock.json', 'yarn.lock'
        ]
      }
    ];

    const allDocuments = [];
    let batchNumber = 1;
    
    for (const batch of processingBatches) {
      try {
        console.log(`[${new Date().toISOString()}] 🔄 BATCH ${batchNumber}/${processingBatches.length}: Processing ${batch.name}`);
        
        const batchDocuments = await this.processBatch(repoUrl, branch, batch);
        
        if (batchDocuments.length > 0) {
          allDocuments.push(...batchDocuments);
          console.log(`[${new Date().toISOString()}] ✅ BATCH ${batchNumber}: Loaded ${batchDocuments.length} documents from ${batch.name}`);
        } else {
          console.log(`[${new Date().toISOString()}] ⚠️ BATCH ${batchNumber}: No documents found in ${batch.name}`);
        }
        
        // Small delay between batches to prevent rate limiting
        if (batchNumber < processingBatches.length) {
          console.log(`[${new Date().toISOString()}] ⏱️ Waiting 2 seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        batchNumber++;
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ BATCH ${batchNumber} FAILED: ${batch.name} - ${error.message}`);
        // Continue with next batch even if one fails
        batchNumber++;
        continue;
      }
    }

    console.log(`[${new Date().toISOString()}] 🎉 BATCHED PROCESSING COMPLETE: Loaded ${allDocuments.length} total documents`);
    
    // Enrich with commit information - safely handle null commitInfo
    const enrichedDocuments = allDocuments.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        githubOwner,
        repoName,
        branch,
        ...(commitInfo && {
          commitHash: commitInfo?.hash ?? null,
          commitTimestamp: commitInfo?.timestamp ?? null,
          commitAuthor: commitInfo?.author ?? null,
          commitSubject: commitInfo?.subject ?? null,
          commitDate: commitInfo?.date ?? null,
        }),
        file_type: this.repoManager.getFileType(doc.metadata.source || ''),
        repository_url: repoUrl,
        loaded_at: new Date().toISOString(),
        loading_method: 'batched_github_loader'
      }
    }));

    console.log(`[${new Date().toISOString()}] ✅ BATCHED LOADER: Enriched ${enrichedDocuments.length} documents with commit metadata`);
    return enrichedDocuments;
  }

  /**
   * Process a single batch of repository content
   */
  async processBatch(repoUrl, branch, batchConfig) {
    console.log(`[${new Date().toISOString()}] 🔧 Processing batch: ${batchConfig.name}`);
    console.log(`[${new Date().toISOString()}] 📝 Config: recursive=${batchConfig.recursive}, concurrency=${batchConfig.maxConcurrency}`);
    if (batchConfig.fileTypeFilter) {
      console.log(`[${new Date().toISOString()}] 📁 File types: ${batchConfig.fileTypeFilter.join(', ')}`);
    }
    
    const loaderOptions = {
      branch: branch,
      recursive: batchConfig.recursive,
      maxConcurrency: batchConfig.maxConcurrency,
      ignorePaths: batchConfig.ignoreFiles  // GithubRepoLoader expects ignorePaths, not ignoreFiles
    };

    // Add path filtering if specified
    if (batchConfig.pathFilter) {
      console.log(`[${new Date().toISOString()}] 🎯 Focusing on path: ${batchConfig.pathFilter}`);
      // Note: GithubRepoLoader doesn't have built-in path filtering,
      // so we'll filter after loading and use ignorePaths to exclude other paths
    }

    // Configure GitHub authentication
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    
    if (githubToken) {
      loaderOptions.accessToken = githubToken;
      console.log(`[${new Date().toISOString()}] 🔑 BATCH AUTH: Using authenticated requests`);
    } else {
      console.log(`[${new Date().toISOString()}] 🔓 BATCH AUTH: Using unauthenticated requests`);
    }

    try {
      // Add timeout to prevent hanging
      const loadPromise = new Promise(async (resolve, reject) => {
        try {
          const loader = new GithubRepoLoader(repoUrl, loaderOptions);
          const documents = await loader.load();
          resolve(documents);
        } catch (error) {
          reject(error);
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Batch timeout after 30 seconds: ${batchConfig.name}`));
        }, 30000);
      });

      const documents = await Promise.race([loadPromise, timeoutPromise]);
      
      // Filter documents by path if specified
      let filteredDocuments = documents;
      if (batchConfig.pathFilter) {
        filteredDocuments = documents.filter(doc => 
          doc.metadata.source && doc.metadata.source.startsWith(batchConfig.pathFilter)
        );
        console.log(`[${new Date().toISOString()}] 🔍 Path filtering: ${documents.length} → ${filteredDocuments.length} documents`);
      }
      
      // Filter documents by file type if specified
      if (batchConfig.fileTypeFilter && batchConfig.fileTypeFilter.length > 0) {
        const beforeCount = filteredDocuments.length;
        filteredDocuments = filteredDocuments.filter(doc => {
          if (!doc.metadata.source) return false;
          const src = doc.metadata.source || '';
          const fileExtension = src.includes('.') ? src.split('.').pop().toLowerCase() : '';
          return batchConfig.fileTypeFilter.includes(fileExtension);
        });
        console.log(`[${new Date().toISOString()}] 🔍 File type filtering (${batchConfig.fileTypeFilter.join(', ')}): ${beforeCount} → ${filteredDocuments.length} documents`);
      }
      
      // Add batch metadata
      const batchDocuments = filteredDocuments.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          batch_name: batchConfig.name,
          batch_priority: batchConfig.priority,
          batch_processed_at: new Date().toISOString()
        }
      }));

      return batchDocuments;

    } catch (error) {
      if (error.message.includes('timeout')) {
        console.warn(`[${new Date().toISOString()}] ⏰ TIMEOUT: ${batchConfig.name} - trying with reduced scope`);
        
        // Retry with non-recursive for timeout cases
        if (batchConfig.recursive) {
          const fallbackConfig = {
            ...batchConfig,
            recursive: false,
            maxConcurrency: 1,
            name: batchConfig.name + ' (fallback)'
          };
          return await this.processBatch(repoUrl, branch, fallbackConfig);
        }
      }
      
      console.error(`[${new Date().toISOString()}] ❌ Batch processing failed for ${batchConfig.name}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get commit info from GitHub API using Octokit
   */
  async getCommitInfoFromGitHubAPI(owner, repo, branch) {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 Fetching commit info from GitHub API for ${owner}/${repo}@${branch}`);
      
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        console.warn(`[${new Date().toISOString()}] ⚠️ No GitHub token available, using fallback`);
        return null;
      }

      // Simple fetch to GitHub API to get latest commit
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'eventstorm-rag-processor'
        }
      });

      if (!response.ok) {
        console.warn(`[${new Date().toISOString()}] ⚠️ GitHub API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const branchData = await response.json();
      const commit = branchData.commit;

      if (!commit) {
        console.warn(`[${new Date().toISOString()}] ⚠️ No commit data found in GitHub API response`);
        return null;
      }

      const commitInfo = {
        hash: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date,
        url: commit.html_url
      };

      console.log(`[${new Date().toISOString()}] ✅ Got commit info: ${commitInfo.hash.substring(0, 8)} by ${commitInfo.author}`);
      return commitInfo;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching commit info from GitHub API:`, error);
      return null;
    }
  }

  /**
   * Get changed files from GitHub API (STUB - NOT IMPLEMENTED)
   * TODO: Implement actual GitHub API integration for diff detection
   */
  async getChangedFilesFromGitHubAPI(owner, repo, fromCommit, toCommit) {
    // STUB: This method is not implemented and should not be called
    console.warn(`[${new Date().toISOString()}] ⚠️ STUB: getChangedFilesFromGitHubAPI called but not implemented`);
    throw new Error('GitHub API integration not implemented - use local git instead');
  }

  /**
   * Check if GitHub API can be used for this repository (ALWAYS FALSE - STUBS NOT IMPLEMENTED)
   * TODO: Implement proper GitHub API availability detection
   */
  async canUseGitHubAPIForChangeDetection(owner, repo) {
    // GitHub API methods are stubbed and not functional
    return false;
  }

  /**
   * Parse repository URL to extract owner and name
   */
  parseRepoUrl(repoUrl) {
    const urlParts = repoUrl.replace('.git', '').split('/');
    return {
      githubOwner: urlParts[urlParts.length - 2],
      repoName: urlParts[urlParts.length - 1]
    };
  }

  /**
   * Check existing repository processing (same as before)
   */
  async checkExistingRepo(githubOwner, repoName, currentCommitHash) {
    return await this.repoManager.findExistingRepo(
      null, null, githubOwner, repoName, currentCommitHash, this.pinecone, this.embeddings
    );
  }

  /**
   * Process filtered documents (incremental or full)
   */
  async processFilteredDocuments(documents, namespace, commitInfo, isIncremental) {
    if (documents.length === 0) {
      return { success: true, documentsProcessed: 0, chunksGenerated: 0, isIncremental };
    }

    // Apply semantic and AST processing
    const processedDocuments = await this.intelligentProcessDocuments(documents);
    
    // Split with AST intelligence
    const splitDocuments = await this.intelligentSplitDocuments(processedDocuments);
    
    // Store in Pinecone
    await this.storeRepositoryDocuments(splitDocuments, namespace);

    return {
      success: true,
      documentsProcessed: documents.length,
      chunksGenerated: splitDocuments.length,
      commitInfo,
      namespace,
      isIncremental,
      processedAt: new Date().toISOString()
    };
  }

  // ... (rest of methods remain the same as in original RepositoryProcessor)
  
  async intelligentProcessDocuments(documents) {
    // Same implementation as original
    return documents;
  }

  async intelligentSplitDocuments(documents) {
    console.log(`[${new Date().toISOString()}] 🎯 INTELLIGENT SPLITTING: Processing ${documents.length} documents with centralized routing`);
    
    // Use centralized routing from contextPipeline if available
    if (this.routingProvider && typeof this.routingProvider.routeDocumentsToProcessors === 'function') {
      console.log(`[${new Date().toISOString()}] 🚦 Using centralized content-aware routing for document processing`);
      return await this.routingProvider.routeDocumentsToProcessors(documents);
    }
    
    // Fallback: Use basic AST splitter for code files, semantic preprocessor for others
    console.log(`[${new Date().toISOString()}] ⚠️ Centralized routing not available, using fallback processing`);
    
    const allChunks = [];
    for (const document of documents) {
      try {
        const source = document.metadata?.source || '';
        const extension = this.getFileExtension(source).toLowerCase();
        
        if (this.isCodeFile(extension) && this.astBasedSplitter) {
          console.log(`[${new Date().toISOString()}] 💻 FALLBACK: Processing code file ${source} with AST splitter`);
          const chunks = await this.astBasedSplitter.splitDocument(document);
          allChunks.push(...chunks);
        } else if (this.semanticPreprocessor) {
          console.log(`[${new Date().toISOString()}] 📄 FALLBACK: Processing ${source} with semantic preprocessor`);
          const processed = await this.semanticPreprocessor.preprocessChunk(document);
          allChunks.push(processed);
        } else {
          console.log(`[${new Date().toISOString()}] 📝 FALLBACK: No processors available, returning document as-is`);
          allChunks.push(document);
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ FALLBACK ERROR: ${document.metadata?.source}:`, error.message);
        allChunks.push(document); // Add document as-is if processing fails
      }
    }
    
    console.log(`[${new Date().toISOString()}] ✅ INTELLIGENT SPLITTING COMPLETE: ${documents.length} documents → ${allChunks.length} chunks`);
    return allChunks;
  }

  /**
   * Helper methods for fallback processing
   */
  isCodeFile(extension) {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
      '.py', '.pyx', '.pyi',
      '.java', '.kt', '.scala',
      '.go', '.rs', '.cpp', '.c', '.h', '.hpp',
      '.cs', '.vb', '.fs',
      '.php', '.rb', '.swift', '.dart'
    ];
    return codeExtensions.includes(extension);
  }

  getFileExtension(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  async storeRepositoryDocuments(documents, namespace) {
    if (!documents || documents.length === 0) {
      console.log(`[${new Date().toISOString()}] ℹ️ No documents to store`);
      return { success: true, chunksStored: 0, namespace };
    }

    console.log(`[${new Date().toISOString()}] 📋 REPOSITORY STORAGE: Storing ${documents.length} processed document chunks`);
    
    // Log chunk breakdown for repository documents
    documents.forEach((doc, index) => {
      const preview = doc.pageContent.substring(0, 100).replace(/\n/g, ' ').trim();
      const semanticInfo = doc.metadata.enhanced ? 
        `${doc.metadata.semantic_role || 'unknown'}|${doc.metadata.layer || 'unknown'}|${doc.metadata.eventstorm_module || 'unknown'}` : 
        'not-enhanced';
      const astInfo = doc.metadata.chunk_type || 'regular';
      const astDetails = doc.metadata.semantic_unit ? 
        `${doc.metadata.semantic_unit}(${doc.metadata.function_name || 'unknown'})` : 
        'n/a';
      
      console.log(`[${new Date().toISOString()}] 📄 [CHUNK ${index + 1}/${documents.length}] ${doc.metadata.source || 'unknown'} (${doc.pageContent.length} chars)`);
      console.log(`[${new Date().toISOString()}] 📝 Preview: ${preview}${doc.pageContent.length > 100 ? '...' : ''}`);
      console.log(`[${new Date().toISOString()}] 🏷️  FileType: ${doc.metadata.file_type || 'unknown'}, Loading: ${doc.metadata.loading_method || 'unknown'}`);
      console.log(`[${new Date().toISOString()}] 🧠 Semantic: ${semanticInfo}, EntryPoint: ${doc.metadata.is_entrypoint || false}, Complexity: ${doc.metadata.complexity || 'unknown'}`);
      console.log(`[${new Date().toISOString()}] 🌳 AST: ${astInfo}, Unit: ${astDetails}, Lines: ${doc.metadata.start_line || '?'}-${doc.metadata.end_line || '?'}`);
    });

    // Generate unique IDs for each chunk
    const documentIds = documents.map((doc, index) => {
      const sourceFile = doc.metadata.source || 'unknown';
      const sanitizedSource = sourceFile.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
      const timestamp = Date.now();
      return `${namespace}_${sanitizedSource}_chunk_${index}_${timestamp}`;
    });

    console.log(`[${new Date().toISOString()}] 🚀 PINECONE STORAGE: Storing ${documents.length} vector embeddings in namespace '${namespace}'`);

    try {
      // Get Pinecone client - try service first, then fallback to direct client
      let pineconeClient = null;
      
      if (this.pineconeService) {
        await this.pineconeService.connect();
        pineconeClient = this.pineconeService.client;
      } else if (this.pineconeManager?.getPineconeClient) {
        pineconeClient = await this.pineconeManager.getPineconeClient();
      } else {
        throw new Error('No Pinecone client available');
      }

      if (!pineconeClient) {
        throw new Error('Failed to get Pinecone client');
      }

      const index = pineconeClient.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      const vectorStore = new PineconeStore(this.embeddings, {
        pineconeIndex: index,
        namespace: namespace
      });

      // Use bottleneck limiter for Pinecone operations if available
      if (this.pineconeLimiter) {
        await this.pineconeLimiter.schedule(async () => {
          await vectorStore.addDocuments(documents, { ids: documentIds });
        });
      } else {
        await vectorStore.addDocuments(documents, { ids: documentIds });
      }

      console.log(`[${new Date().toISOString()}] ✅ REPOSITORY STORAGE: Successfully indexed ${documents.length} document chunks to Pinecone`);

      return {
        success: true,
        chunksStored: documents.length,
        namespace: namespace,
        documentIds
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPOSITORY STORAGE: Error storing in Pinecone:`, error.message);
      throw error;
    }
  }
}

module.exports = RepoProcessorUtils;
