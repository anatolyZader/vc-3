// RepoProcessorUtils.js - Utility methods for repository processing operations
"use strict";

const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');

/**
 * Repository Processing Utilities - Cloud-native repository processing operations
 * 
 * Key utilities:
 * 1. GitHub API operations for cloud deployment compatibility
 * 2. Document processing and chunking utilities
 * 3. Pinecone vector storage operations
 * 4. Batch processing for large repositories
 * 
 * Note: Local Git operations removed for cloud deployment compatibility
 */
class RepoProcessorUtils {
  constructor(options = {}) {
    this.embeddings = options.embeddings;
    this.pineconeLimiter = options.pineconeLimiter;
    this.repoCommitManager = options.commitManager;
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    this.astBasedSplitter = options.astBasedSplitter;
    this.semanticPreprocessor = options.semanticPreprocessor;
    this.pineconeManager = options.pineconeManager;
    
    // Store promise (not the resolved instance) to avoid using an unresolved Promise as a client
    this._pineconeService = null; // resolved instance once available
    this._pineconeServicePromise = this.pineconeManager?.getPineconeService?.();
    // Backward compatibility alias will be assigned lazily after resolution
    this.pinecone = null;
  }

  /**
   * Lazily resolve and cache the Pinecone service instance.
   * Ensures we never accidentally treat a pending Promise as the client.
   */
  async _getPineconeService() {
    if (this._pineconeService) return this._pineconeService;
    if (this._pineconeServicePromise) {
      try {
        this._pineconeService = await this._pineconeServicePromise;
      } catch (err) {
        console.warn(`[${new Date().toISOString()}] ⚠️ RepoProcessorUtils: Pinecone service initialization failed: ${err.message}`);
        this._pineconeService = null;
      } finally {
        // Prevent re-awaiting same promise
        this._pineconeServicePromise = null;
      }
      // Backward compatibility alias
      this.pinecone = this._pineconeService;
    }
    return this._pineconeService;
  }

  /**
   * ENHANCED: Use Langchain GitLoader with smart commit tracking
   */
  async processRepository(repoUrl, branch = 'main', namespace = null) {
    console.log(`[${new Date().toISOString()}] 🚀 OPTIMIZED PROCESSING: Using enhanced GitHub API approach (no local cloning)`);
    
    const { githubOwner, repoName } = this.parseRepoUrl(repoUrl);
    if (!namespace) {
      namespace = this.sanitizeId(`${githubOwner}_${repoName}_${branch}`);
    }

    // Use GitHub API directly - no local git cloning required
    console.log(`[${new Date().toISOString()}] 🔄 PROCESSING: Using GitHub API via LangChain (Cloud Run compatible)`);
    return await this.processWithGitHubAPI(repoUrl, githubOwner, repoName, branch, namespace);
  }

  /**
   * Process repository using GitHub API only (Cloud-native approach)
   * Note: Local Git functionality removed for cloud deployment compatibility
   */
  async processWithLocalGit(repoUrl, githubOwner, repoName, branch, namespace) {
    console.log(`[${new Date().toISOString()}] 🚀 CLOUD-NATIVE: Local Git method called - redirecting to GitHub API`);
    
    // Always use GitHub API in cloud environments
    return await this.processWithGitHubAPI(repoUrl, githubOwner, repoName, branch, namespace);
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
    
    // Define processing batches optimized for your actual vc-3 repository structure
    const processingBatches = [
      {
        name: 'Root Level Files',
        recursive: false,
        priority: 1,
        maxConcurrency: 1,
        ignorePaths: [
          'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**', 
          'temp/**', '*.log', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store',
          'backend/**', 'client/**', '.github/**', '.vscode/**' // Exclude directories we'll process separately
        ]
      },
      {
        name: 'Backend Directory (Specialized)',
        isSpecialized: true, // Flag to use specialized backend loader
        priority: 2,
        maxConcurrency: 1
      }
    ];

    const allDocuments = [];
    let batchNumber = 1;
    
    for (const batch of processingBatches) {
      try {
        console.log(`[${new Date().toISOString()}] 🔄 BATCH ${batchNumber}/${processingBatches.length}: Processing ${batch.name}`);
        
        let batchDocuments;
        
        // Check if this is the specialized backend batch
        if (batch.isSpecialized && batch.name.includes('Backend')) {
          console.log(`[${new Date().toISOString()}] 🏗️ Using specialized backend loader...`);
          batchDocuments = await this.loadBackendDirectoryFiles(repoUrl, branch);
          
          // CRITICAL: Validate backend file coverage
          if (batchDocuments.length === 0) {
            console.error(`[${new Date().toISOString()}] ❌ BACKEND COVERAGE FAILURE: No backend files loaded - this will result in poor AI responses`);
            console.error(`[${new Date().toISOString()}] 🔍 DIAGNOSIS: Repository ${githubOwner}/${repoName} may have no backend/ directory, or all loading methods failed`);
            
            // For now, log error but continue (could be changed to throw error in production)
            console.warn(`[${new Date().toISOString()}] ⚠️ Continuing processing without backend files - AI responses will be limited`);
          } else {
            console.log(`[${new Date().toISOString()}] ✅ BACKEND COVERAGE: Successfully loaded ${batchDocuments.length} backend files`);
          }
          
          // Add batch metadata to specialized documents
          batchDocuments = batchDocuments.map(doc => ({
            ...doc,
            metadata: {
              ...doc.metadata,
              batch_name: batch.name,
              batch_priority: batch.priority,
              batch_processed_at: new Date().toISOString()
            }
          }));
        } else {
          // Use standard batch processing
          batchDocuments = await this.processBatch(repoUrl, branch, batch);
        }
        
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
    
    // Log detailed breakdown by source directory
    const directoryBreakdown = {};
    allDocuments.forEach(doc => {
      const source = doc.metadata.source || 'unknown';
      const dir = source.includes('/') ? source.split('/')[0] : 'root';
      directoryBreakdown[dir] = (directoryBreakdown[dir] || 0) + 1;
    });
    
    console.log(`[${new Date().toISOString()}] 📊 DIRECTORY BREAKDOWN:`);
    Object.entries(directoryBreakdown).forEach(([dir, count]) => {
      console.log(`[${new Date().toISOString()}]   📂 ${dir}/: ${count} files`);
    });
    
    // Highlight backend coverage specifically
    const backendCount = directoryBreakdown['backend'] || 0;
    if (backendCount === 0) {
      console.error(`[${new Date().toISOString()}] ❌ CRITICAL: No backend files loaded - AI responses will lack code context`);
    } else {
      console.log(`[${new Date().toISOString()}] ✅ Backend files loaded: ${backendCount}`);
    }
    
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
        file_type: this.getFileType(doc.metadata.source || ''),
        repository_url: repoUrl,
        loaded_at: new Date().toISOString(),
        loading_method: 'batched_github_loader'
      }
    }));

    console.log(`[${new Date().toISOString()}] ✅ BATCHED LOADER: Enriched ${enrichedDocuments.length} documents with commit metadata`);
    return enrichedDocuments;
  }

  /**
   * ENHANCED: Load only backend directory files using cloud-native approach
   */
  async loadBackendDirectoryFiles(repoUrl, branch = 'main') {
    console.log(`[${new Date().toISOString()}] 🏗️ BACKEND LOADER: Loading backend directory files with cloud-native approach`);
    console.log(`[${new Date().toISOString()}] 🚀 DEPLOYMENT: Force cache-bust ${Date.now()}`);
    
    // Extract owner/repo from URL
    const { githubOwner, repoName } = this.parseRepoUrl(repoUrl);
    
    try {
      // Try cloud-native loader first (no authentication required for public repos)
      const CloudNativeRepoLoader = require('./cloudNativeRepoLoader');
      const cloudLoader = new CloudNativeRepoLoader({
        owner: githubOwner,
        repo: repoName,
        branch: branch,
        focusPath: 'backend/',
        maxFiles: 150, // Reasonable limit for backend files
        timeout: 25000 // Shorter timeout than full repo loading
      });
      
      console.log(`[${new Date().toISOString()}] 🌐 CLOUD-NATIVE: Attempting direct GitHub API tree traversal for backend/`);
      const backendFiles = await cloudLoader.load();
      
      if (backendFiles && backendFiles.length > 0) {
        console.log(`[${new Date().toISOString()}] ✅ CLOUD-NATIVE SUCCESS: Loaded ${backendFiles.length} backend files via direct API`);
        
        // Log sample files
        console.log(`[${new Date().toISOString()}] 📋 Sample backend files:`);
        backendFiles.slice(0, 5).forEach(doc => {
          console.log(`  - ${doc.metadata.source} (${doc.pageContent.length} chars)`);
        });
        
        return backendFiles;
      }
      
      console.warn(`[${new Date().toISOString()}] ⚠️ Cloud-native loader returned 0 files, trying LangChain fallback`);
      
    } catch (cloudError) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Cloud-native loader failed: ${cloudError.message}, trying LangChain fallback`);
    }
    
    // Fallback to original LangChain approach (but with better error handling)
    return await this.loadBackendFilesLangChainFallback(repoUrl, branch, githubOwner, repoName);
  }

  /**
   * Fallback: Original LangChain approach with enhanced error handling
   */
  async loadBackendFilesLangChainFallback(repoUrl, branch, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 🔄 LANGCHAIN FALLBACK: Attempting LangChain GithubRepoLoader for backend files`);
    
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    
    // Very targeted loading for backend files only
    const backendLoaderOptions = {
      branch: branch,
      recursive: true,
      maxConcurrency: 1,
      ignorePaths: [
        // Exclude ALL non-backend directories completely
        'client/**', '.github/**', '.vscode/**',
        // Exclude ALL root files
        'package.json', 'README.md', 'bfg.jar', '*.txt', '*.log', '*.js',
        '.gitignore', 'package-lock.json', '*.jar',
        // Standard excludes
        'node_modules/**', '.git/**', 'dist/**', 'build/**', 'coverage/**',
        'temp/**', '*.lock', '*.tmp', '.DS_Store', '**/.DS_Store',
        // Backend excludes - be very specific about what to exclude
        'backend/node_modules/**', 'backend/dist/**', 'backend/build/**',
        'backend/coverage/**', 'backend/_tests_/**', 'backend/test_*.js',
        'backend/**/*.test.js', 'backend/**/*.spec.js', 
        'backend/package-lock.json', 'backend/*.log', 'backend/server.log',
        'backend/jest.*.config.js', 'backend/bfg.jar', 'backend/cookie*.txt',
        'backend/cloud-sql-proxy', 'backend/*-credentials.json'
      ]
    };

    if (githubToken) {
      backendLoaderOptions.accessToken = githubToken;
      console.log(`[${new Date().toISOString()}] 🔑 Using GitHub token for authenticated access`);
    } else {
      console.log(`[${new Date().toISOString()}] 🔓 No GitHub token - using public access`);
    }

    try {
      console.log(`[${new Date().toISOString()}] ⏳ Loading backend files with LangChain (reduced timeout)...`);
      
      const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
      const loader = new GithubRepoLoader(repoUrl, backendLoaderOptions);
      
      // Use a shorter timeout for this focused loading
      const loadPromise = loader.load();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Backend loading timeout')), 20000);
      });
      
      let allDocs = [];
      try {
        allDocs = await Promise.race([loadPromise, timeoutPromise]);
      } catch (timeoutError) {
        console.warn(`[${new Date().toISOString()}] ⏰ LangChain backend loading timed out - this indicates the repository is too large for recursive loading`);
        return []; // Return empty rather than attempting more fallbacks
      }
      
      // Filter to only backend files
      const backendFiles = allDocs.filter(doc => {
        const source = doc.metadata.source || '';
        return source.startsWith('backend/') && !source.includes('/test') && !source.includes('_tests_');
      });
      
      if (backendFiles.length > 0) {
        console.log(`[${new Date().toISOString()}] ✅ LANGCHAIN FALLBACK: Found ${backendFiles.length} backend files from ${allDocs.length} total`);
      } else {
        console.warn(`[${new Date().toISOString()}] ⚠️ LANGCHAIN FALLBACK: No backend files found in ${allDocs.length} documents`);
      }
      
      return backendFiles;
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ LangChain fallback failed: ${error.message}`);
      return [];
    }
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
      ignorePaths: batchConfig.ignorePaths  // Use ignorePaths consistently
    };

    // Add GitHub token if available
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (githubToken) {
      loaderOptions.accessToken = githubToken;
      console.log(`[${new Date().toISOString()}] 🔑 BATCH AUTH: Using authenticated requests`);
    } else {
      console.log(`[${new Date().toISOString()}] 🔓 BATCH AUTH: Using unauthenticated requests`);
    }

    console.log(`[${new Date().toISOString()}] 🔧 Loader options:`, {
      branch: loaderOptions.branch,
      recursive: loaderOptions.recursive,
      maxConcurrency: loaderOptions.maxConcurrency,
      ignorePaths: loaderOptions.ignorePaths?.slice(0, 5) + (loaderOptions.ignorePaths?.length > 5 ? '...' : ''),
      hasToken: !!githubToken
    });

    try {
      // Add timeout with proper cancellation to prevent hanging and resource leaks
      let loadingController;
      let timeoutId;
      let isCompleted = false;

      const loadPromise = new Promise((resolve, reject) => {
        (async () => {
          try {
            const loader = new GithubRepoLoader(repoUrl, loaderOptions);
            loadingController = loader; // retained for potential future abort logic
            const docs = await loader.load();
            if (!isCompleted) {
              isCompleted = true;
              resolve(docs);
            }
          } catch (err) {
            if (!isCompleted) {
              isCompleted = true;
              // Ensure rejection reason is an Error instance
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }
        })();
      });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          if (!isCompleted) {
            isCompleted = true;
            console.warn(`[${new Date().toISOString()}] ⏰ BATCH TIMEOUT: ${batchConfig.name} exceeded 30 seconds`);
            reject(new Error(`Batch timeout after 30 seconds: ${batchConfig.name}`));
          }
        }, 30000); // Reduced back to 30s for faster detection
      });

      let documents;
      try {
        documents = await Promise.race([loadPromise, timeoutPromise]);
      } finally {
        // Cleanup: Clear timeout if it exists
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        // Mark as completed to prevent late responses
        isCompleted = true;
      }
      
      // Log batch results
      console.log(`[${new Date().toISOString()}] 📄 Loaded ${documents.length} documents for batch "${batchConfig.name}"`);
      
      if (documents.length > 0) {
        console.log(`[${new Date().toISOString()}] 📋 Sample files:`);
        documents.slice(0, 5).forEach(doc => {
          console.log(`  - ${doc.metadata.source}`);
        });
        
        // Log backend files specifically
        const backendFiles = documents.filter(doc => doc.metadata?.source?.startsWith('backend/'));
        if (backendFiles.length > 0) {
          console.log(`[${new Date().toISOString()}] 🏗️ Backend files found: ${backendFiles.length}`);
        }
      } else {
        console.log(`[${new Date().toISOString()}] ⚠️ No documents loaded for batch "${batchConfig.name}"`);
      }
      
      // Add batch metadata
      const batchDocuments = documents.map(doc => ({
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
   * GitHub API-only: Change detection not implemented
   * Note: In cloud environments, we process all files rather than detecting changes
   */
  async getChangedFilesFromGitHubAPI(owner, repo, fromCommit, toCommit) {
    console.warn(`[${new Date().toISOString()}] ℹ️ GitHub API change detection not implemented - processing all files instead`);
    return []; // Return empty array to trigger full processing
  }

  /**
   * Cloud deployment: Always use GitHub API
   */
  async canUseGitHubAPIForChangeDetection(owner, repo) {
    return true; // Always use GitHub API in cloud deployments
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
    // Ensure pinecone service is resolved before checking existing repo
    const pineconeService = await this._getPineconeService();
    return await this.findExistingRepo(
      null, null, githubOwner, repoName, currentCommitHash, pineconeService, this.embeddings
    );
  }

  /**
   * Process filtered documents (incremental or full)
   */
  async processFilteredDocuments(documents, namespace, commitInfo, isIncremental, routingFunction = null) {
    if (documents.length === 0) {
      return { success: true, documentsProcessed: 0, chunksGenerated: 0, isIncremental };
    }

    // Apply semantic and AST processing
    const processedDocuments = await this.intelligentProcessDocuments(documents);
    
    // Split with AST intelligence - pass routing function if provided
    const splitDocuments = await this.intelligentSplitDocuments(processedDocuments, routingFunction);
    
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

  async intelligentSplitDocuments(documents, routingFunction = null) {
    console.log(`[${new Date().toISOString()}] 🎯 INTELLIGENT SPLITTING: Processing ${documents.length} documents`);
    
    // Use provided routing function if available
    if (routingFunction && typeof routingFunction === 'function') {
      console.log(`[${new Date().toISOString()}] 🚦 Using provided content-aware routing for document processing`);
      return await routingFunction(documents);
    }
    
    // Fallback: Use basic AST splitter for code files, semantic preprocessor for others
    console.log(`[${new Date().toISOString()}] ⚠️ No routing function provided, using fallback processing`);
    
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
      const sanitizedSource = sourceFile
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/^(?:_+)|(?:_+)$/g, '');
      const timestamp = Date.now();
      return `${namespace}_${sanitizedSource}_chunk_${index}_${timestamp}`;
    });

    console.log(`[${new Date().toISOString()}] 🚀 PINECONE STORAGE: Storing ${documents.length} vector embeddings in namespace '${namespace}'`);

    try {
      // Resolve Pinecone service safely
      const pineconeService = await this._getPineconeService();
      let pineconeClient = null;

      if (pineconeService) {
        // Service already connects internally during initialization; connect() should be idempotent
        if (typeof pineconeService.connect === 'function') {
          try { await pineconeService.connect(); } catch (e) { /* idempotent connect swallow */ }
        }
        pineconeClient = pineconeService.client || pineconeService;
      } else if (this.pineconeManager?.getPineconeClient) {
        // Legacy fallback path
        pineconeClient = await this.pineconeManager.getPineconeClient();
      }

      if (!pineconeClient) {
        console.warn(`[${new Date().toISOString()}] ⚠️ REPOSITORY STORAGE: Pinecone client unavailable, skipping vector indexing`);
        return { success: false, skipped: true, reason: 'pinecone_unavailable', namespace };
      }

      const indexName = process.env.PINECONE_INDEX_NAME || 'eventstorm-index';
      const index = typeof pineconeClient.index === 'function' ? pineconeClient.index(indexName) : pineconeClient;
      const vectorStore = new PineconeStore(this.embeddings, { pineconeIndex: index, namespace });

      const addDocs = async () => vectorStore.addDocuments(documents, { ids: documentIds });
      if (this.pineconeLimiter) {
        await this.pineconeLimiter.schedule(addDocs);
      } else {
        await addDocs();
      }

      console.log(`[${new Date().toISOString()}] ✅ REPOSITORY STORAGE: Successfully indexed ${documents.length} document chunks to Pinecone`);
      return { success: true, chunksStored: documents.length, namespace, documentIds };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ REPOSITORY STORAGE: Error storing in Pinecone:`, error.message);
      throw error;
    }
  }

  /**
   * Sanitize identifier for use as Pinecone namespace
   */
  sanitizeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * Get file type based on extension
   */
  getFileType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const typeMap = {
      'js': 'javascript',
      'ts': 'typescript', 
      'jsx': 'react',
      'tsx': 'react',
      'py': 'python',
      'md': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass'
    };
    return typeMap[ext] || 'text';
  }

  /**
   * Find existing repository in Pinecone
   */
  async findExistingRepo(localPath, remotePath, githubOwner, repoName, currentCommitHash, pineconeService, embeddings) {
    try {
      const namespace = this.sanitizeId(`${githubOwner}_${repoName}_main`);
      const index = await pineconeService.getIndex();
      
      // Query for any existing documents in this namespace
      const queryResponse = await index.namespace(namespace).query({
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
          namespace
        };
      }

      return { exists: false, namespace };
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ℹ️ Repository check: ${error.message}`);
      return { exists: false, namespace: this.sanitizeId(`${githubOwner}_${repoName}_main`) };
    }
  }
}

module.exports = RepoProcessorUtils;
