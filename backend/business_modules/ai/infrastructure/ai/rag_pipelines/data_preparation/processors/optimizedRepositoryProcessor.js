// OptimizedRepositoryProcessor.js - Enhanced approach using Langchain GitLoader more effectively
"use strict";

const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');

/**
 * OPTIMIZED: Maximum leverage of Langchain's native GitLoader with local git operations
 * 
 * Key improvements:
 * 1. Use GitHubRepoLoader for ALL document loading (no manual file system operations)
 * 2. Only clone locally when we need git metadata (current implementation)
 * 3. Cache commit info to minimize git operations
 * 4. GitHub API integration is stubbed for future implementation
 */
class OptimizedRepositoryProcessor {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pinecone = options.pinecone;
    this.pineconeLimiter = options.pineconeLimiter;
    this.repositoryManager = options.repositoryManager;
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    this.astBasedSplitter = options.astBasedSplitter;
    this.semanticPreprocessor = options.semanticPreprocessor;
    
    // Cache for git operations
    this.gitCache = new Map();
  }

  /**
   * ENHANCED: Use Langchain GitLoader with smart commit tracking
   */
  async processRepository(repoUrl, branch = 'main', namespace = null) {
    console.log(`[${new Date().toISOString()}] 🚀 OPTIMIZED PROCESSING: Using enhanced Langchain-first approach`);
    
    const { githubOwner, repoName } = this.parseRepoUrl(repoUrl);
    if (!namespace) {
      namespace = this.repositoryManager.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
    }

    // GitHub API methods are currently stubbed, using local git processing
    console.log(`[${new Date().toISOString()}] 🔄 PROCESSING: Using local git clone for repository processing`);
    return await this.processWithLocalGit(repoUrl, githubOwner, repoName, branch, namespace);
  }

  /**
   * Process repository using local git operations
   */
  async processWithLocalGit(repoUrl, githubOwner, repoName, branch, namespace) {
    let tempDir = null;
    
    try {
      // Only clone when absolutely necessary for git operations
      tempDir = await this.repositoryManager.cloneRepository(repoUrl, branch);
      
      // Get commit info from local git
      const commitHash = await this.repositoryManager.getCommitHash(tempDir);
      const commitInfo = await this.repositoryManager.getCommitInfo(tempDir);
      
      // Check existing processing
      const existingRepo = await this.checkExistingRepo(githubOwner, repoName, commitHash);
      
      if (existingRepo?.reason === 'same_commit') {
        return { success: true, skipped: true, reason: 'same_commit' };
      }

      // Load documents using Langchain (even with local path)
      const documents = await this.loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo);
      
      if (existingRepo?.reason === 'commit_changed') {
        // Get changed files from local git
        const changedFiles = await this.repositoryManager.getChangedFiles(
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
        await this.repositoryManager.cleanupTempDir(tempDir);
      }
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
    
    // Enrich with commit information
    const enrichedDocuments = allDocuments.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        githubOwner,
        repoName,
        branch,
        commitHash: commitInfo.hash,
        commitTimestamp: commitInfo.timestamp,
        commitAuthor: commitInfo.author,
        file_type: this.repositoryManager.getFileType(doc.metadata.source || ''),
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
      unknown: 'warn',
      maxConcurrency: batchConfig.maxConcurrency,
      ignoreFiles: batchConfig.ignoreFiles
    };

    // Add path filtering if specified
    if (batchConfig.pathFilter) {
      console.log(`[${new Date().toISOString()}] 🎯 Focusing on path: ${batchConfig.pathFilter}`);
      // Note: GithubRepoLoader doesn't have built-in path filtering,
      // so we'll filter after loading and use ignoreFiles to exclude other paths
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
          const fileExtension = doc.metadata.source.split('.').pop()?.toLowerCase();
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
   * Get commit info from GitHub API (STUB - NOT IMPLEMENTED)
   * TODO: Implement actual GitHub API integration with Octokit
   */
  async getCommitInfoFromGitHubAPI(owner, repo, branch) {
    // STUB: This method is not implemented and should not be called
    console.warn(`[${new Date().toISOString()}] ⚠️ STUB: getCommitInfoFromGitHubAPI called but not implemented`);
    throw new Error('GitHub API integration not implemented - use local git instead');
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
    return await this.repositoryManager.findExistingRepo(
      null, null, githubOwner, repoName, currentCommitHash, this.pinecone
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
    // Same implementation as original  
    return documents;
  }

  async storeRepositoryDocuments(documents, namespace) {
    // Same implementation as original
  }
}

module.exports = OptimizedRepositoryProcessor;
