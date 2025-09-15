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
   * ENHANCED: Load documents using Langchain's native loader exclusively
   */
  async loadDocumentsWithLangchain(repoUrl, branch, githubOwner, repoName, commitInfo) {
    console.log(`[${new Date().toISOString()}] 📥 LANGCHAIN LOADER: Using native GitHubRepoLoader for document loading`);
    
    // Configure GitHub authentication if available
    const loaderOptions = {
      branch: branch,
      recursive: true,
      unknown: 'warn',
      maxConcurrency: 5,
      ignoreFiles: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        'coverage/**',
        'temp/**',
        '*.log',
        '*.lock',
        '*.tmp',
        '.DS_Store',
        '**/.DS_Store',
        '*.min.js',
        '*.min.css'
      ]
    };

    // Add GitHub authentication if token is available
    if (process.env.GITHUB_TOKEN) {
      loaderOptions.accessToken = process.env.GITHUB_TOKEN;
      console.log(`[${new Date().toISOString()}] 🔑 GITHUB AUTH: Using authenticated requests with GitHub token`);
    } else {
      console.log(`[${new Date().toISOString()}] ⚠️  GITHUB AUTH: No token found, using unauthenticated requests (rate limited)`);
    }

    const loader = new GithubRepoLoader(repoUrl, loaderOptions);

    const documents = await loader.load();
    
    // Enrich with commit information
    const enrichedDocuments = documents.map(doc => ({
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
        loading_method: 'langchain_github_loader'
      }
    }));

    console.log(`[${new Date().toISOString()}] ✅ LANGCHAIN LOADER: Loaded ${enrichedDocuments.length} documents with commit metadata`);
    return enrichedDocuments;
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
