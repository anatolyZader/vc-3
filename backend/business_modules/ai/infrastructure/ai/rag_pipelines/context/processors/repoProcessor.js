// RepoProcessor.js - Repository processing operations (consolidated)
"use strict";

const { GithubRepoLoader } = require('@langchain/community/document_loaders/web/github');
const FileFilteringUtils = require('../embedding/FileFilteringUtils');

/**
 * Repository Processor - Pure document processing operations
 * 
 * Focused functionality:
 * 1. Document loading from GitHub repositories  
 * 2. Document processing and enhancement
 * 3. Intelligent chunking with AST and semantic analysis
 * 4. Batch processing for large repositories
 * 
 * Note: This is a pure processor - orchestration is handled by ContextPipeline
 */
class RepoProcessor {
  constructor(options = {}) {
    // Core processing dependencies
    this.astBasedSplitter = options.astBasedSplitter;
    this.semanticPreprocessor = options.semanticPreprocessor;
    this.ubiquitousLanguageProcessor = options.ubiquitousLanguageProcessor;
    
    // Note: Storage, orchestration, and external APIs are handled by other components
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
          'backend/**', 'client/**', '.github/**', '.vscode/**', // Exclude directories we'll process separately
          // Allow root-level markdown documentation files
          '!*.md', '!ROOT_DOCUMENTATION.md', '!ARCHITECTURE.md'
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
    
    // Process batches efficiently with minimal logging
    for (const batch of processingBatches) {
      try {
        let batchDocuments;
        
        if (batch.isSpecialized && batch.name.includes('Backend')) {
          batchDocuments = await this.loadBackendDirectoryFiles(repoUrl, branch);
          
          if (batchDocuments.length === 0) {
            console.warn(`[${new Date().toISOString()}] ⚠️ No backend files loaded - AI responses will be limited`);
          } else {
            console.log(`[${new Date().toISOString()}] ✅ Loaded ${batchDocuments.length} backend files`);
          }
          
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
          batchDocuments = await this.processBatch(repoUrl, branch, batch);
        }
        
        if (batchDocuments.length > 0) {
          allDocuments.push(...batchDocuments);
        }
        
        // Brief pause between batches
        if (batchNumber < processingBatches.length) {
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
    
    // Quick summary (reduced verbosity)
    const backendCount = allDocuments.filter(doc => doc.metadata.source?.includes('backend')).length;
    
    if (backendCount === 0) {
      console.warn(`[${new Date().toISOString()}] ⚠️ No backend files loaded - AI responses may lack code context`);
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
      const CloudNativeRepoLoader = require('../loading/cloudNativeRepoLoader');
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
        // Exclude root files EXCEPT markdown documentation
        'package.json', 'bfg.jar', '*.txt', '*.log', '*.js',
        '.gitignore', 'package-lock.json', '*.jar',
        // Allow root-level markdown documentation files
        '!*.md', '!ROOT_DOCUMENTATION.md', '!ARCHITECTURE.md', '!README.md',
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
      
      // Filter to only backend files using comprehensive filtering
      const backendFiles = allDocs.filter(doc => {
        const source = doc.metadata.source || '';
        return source.startsWith('backend/') && FileFilteringUtils.shouldIndexFile(source);
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




}

module.exports = RepoProcessor;
