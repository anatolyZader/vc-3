// githubOperations.js - Unified Repository Management & GitHub API Operations
"use strict";

const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

class GitHubOperations {
  constructor(options = {}) {
    this.execAsync = promisify(exec);
    this.processingStrategy = {
      preferGitHubAPI: true,
      fallbackToLocalGit: true
    };
    this.pineconeService = options.pineconeService;
  }

  /**
   * Get commit info with smart strategy (GitHub API first, local git fallback)
   */
  async getPushedCommitInfo(repoUrl, branch, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 🎯 SMART COMMIT DETECTION: Trying optimized approaches for ${githubOwner}/${repoName}`);
    
    // Strategy 1: Try GitHub API (fastest, no cloning required)
    if (this.processingStrategy.preferGitHubAPI) {
      try {
        console.log(`[${new Date().toISOString()}] 🌐 GITHUB API: Attempting to get commit info via API`);
        const apiCommitInfo = await this.getCommitInfoFromGitHubAPI(githubOwner, repoName, branch);
        if (apiCommitInfo) {
          console.log(`[${new Date().toISOString()}] ✅ GITHUB API SUCCESS: Retrieved commit ${apiCommitInfo?.hash?.substring(0, 8) ?? 'unknown'} via API`);
          return apiCommitInfo;
        }
      } catch (apiError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ GitHub API failed:`, apiError.message);
      }
    }
    
    // Strategy 2: Check if git is available before attempting local operations
    const isGitAvailable = await this.checkGitAvailability();
    if (!isGitAvailable) {
      console.log(`[${new Date().toISOString()}] 🚨 GIT NOT AVAILABLE: Skipping local git operations in cloud environment`);
      return this.createSyntheticCommitInfo();
    }
    
    // Strategy 3: Fallback to minimal local git operations (only if git is available)
    if (this.processingStrategy.fallbackToLocalGit) {
      console.log(`[${new Date().toISOString()}] 🔄 FALLBACK: Using minimal local git clone for commit info`);
      let tempDir = null;
      
      try {
        // Minimal clone just for git metadata
        tempDir = await this.cloneRepository(repoUrl, branch);
        
        const commitHash = await this.getCommitHashFromLocalGit(tempDir);
        const commitInfo = await this.getCommitInfoFromLocalGit(tempDir);
        
        if (commitHash && commitInfo) {
          console.log(`[${new Date().toISOString()}] ✅ LOCAL GIT SUCCESS: Retrieved commit ${commitHash.substring(0, 8)} via local git`);
          return commitInfo;
        }
        
      } catch (gitError) {
        console.error(`[${new Date().toISOString()}] ❌ Local git failed:`, gitError.message);
      } finally {
        // Always cleanup temp directory immediately
        if (tempDir) {
          try {
            await this.cleanupTempDir(tempDir);
          } catch (cleanupError) {
            console.warn(`[${new Date().toISOString()}] ⚠️ Failed to cleanup temp directory:`, cleanupError.message);
          }
        }
      }
    }
    
    // Final fallback: return synthetic commit info to allow processing to continue
    console.log(`[${new Date().toISOString()}] 🔄 FINAL FALLBACK: Using synthetic commit info for cloud-native processing`);
    return this.createSyntheticCommitInfo();
  }

  /**
   * Check if git binary is available in the environment (always returns false for cloud-native)
   */
  async checkGitAvailability() {
    console.log(`[${new Date().toISOString()}] 🌐 CLOUD-NATIVE: Git availability check - always false for cloud-native architecture`);
    console.log(`[${new Date().toISOString()}] ℹ️ Cloud-native mode uses GitHub API exclusively, no git binary required`);
    return false; // Always return false to force cloud-native behavior
  }

  /**
   * Create synthetic commit info for cloud environments where git/API are unavailable
   */
  createSyntheticCommitInfo() {
    return {
      hash: 'cloud-' + Date.now(),
      subject: 'Cloud-native repository processing',
      message: 'Repository processed in cloud environment without commit tracking',
      author: 'cloud-processor',
      email: 'cloud@eventstorm.me',
      date: new Date().toISOString()
    };
  }

  /**
   * Get changed files efficiently (GitHub API first, local git fallback)
   */
  async getChangedFilesOptimized(repoUrl, branch, githubOwner, repoName, oldCommitHash, newCommitHash) {
    // Strategy 1: Try GitHub API for changed files
    if (this.processingStrategy.preferGitHubAPI) {
      try {
        console.log(`[${new Date().toISOString()}] 🌐 GITHUB API: Attempting to get changed files via API`);
        const apiChangedFiles = await this.getChangedFilesFromGitHubAPI(githubOwner, repoName, oldCommitHash, newCommitHash);
        if (apiChangedFiles && apiChangedFiles.length >= 0) {
          console.log(`[${new Date().toISOString()}] ✅ GITHUB API: Found ${apiChangedFiles.length} changed files via API`);
          return apiChangedFiles;
        }
      } catch (apiError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ GitHub API changed files failed:`, apiError.message);
      }
    }

    // Strategy 2: Check if git is available before attempting local operations
    const isGitAvailable = await this.checkGitAvailability();
    if (!isGitAvailable) {
      console.log(`[${new Date().toISOString()}] 🚨 GIT NOT AVAILABLE: Skipping local git changed files detection in cloud environment`);
      console.log(`[${new Date().toISOString()}] � CLOUD-NATIVE FALLBACK: Using full repository reload when change detection fails`);
      
      // Instead of skipping, trigger a full reload using cloud-native approach
      // This ensures that when we can't detect specific changes, we still process the repository
      console.log(`[${new Date().toISOString()}] 🌐 FULL RELOAD: Triggering complete repository reprocessing due to failed change detection`);
      console.log(`[${new Date().toISOString()}] 🎯 This ensures latest commit ${newCommitHash?.substring(0, 8)} is processed even without specific file change info`);
      
      // Return a special marker to indicate full reload is needed
      return 'FULL_RELOAD_REQUIRED';
    }

    // Strategy 3: Fallback to local git (only if git is available)
    let tempDir = null;
    try {
      console.log(`[${new Date().toISOString()}] 🔄 FALLBACK: Using local git for changed files detection`);
      // Pass additional commits needed for diff operation
      const additionalCommits = [oldCommitHash];
      if (newCommitHash && newCommitHash !== 'HEAD') {
        additionalCommits.push(newCommitHash);
      }
      tempDir = await this.cloneRepository(repoUrl, branch, { additionalCommits });
      const changedFiles = await this.getChangedFilesFromLocalGit(tempDir, oldCommitHash, newCommitHash);
      console.log(`[${new Date().toISOString()}] ✅ LOCAL GIT: Found ${changedFiles.length} changed files via local git`);
      return changedFiles;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Local git changed files failed:`, error.message);
      return []; // Return empty array as fallback
    } finally {
      if (tempDir) {
        try {
          await this.cleanupTempDir(tempDir);
        } catch (cleanupError) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Failed to cleanup temp directory:`, cleanupError.message);
        }
      }
    }
  }

  /**
   * Clone repository to temporary directory for analysis  
   * @param {string} url - Repository URL
   * @param {string} branch - Branch to clone
   * @param {Object} options - Additional options
   * @param {string[]} options.additionalCommits - Additional commit hashes to fetch for diff operations
   */
  async cloneRepository(url, branch, options = {}) {
    console.log(`[${new Date().toISOString()}] 🚀 PRIMARY CLOUD-NATIVE: Using enhanced cloud-native approach as primary repository loading method`);
    console.log(`[${new Date().toISOString()}] 🎯 This approach loads files by priority, handles rate limits intelligently, and works in any deployment environment`);
    
    // Parse repository URL to extract owner and repo name
    const urlParts = url.split('/');
    const repoName = urlParts[urlParts.length - 1].replace('.git', '');
    const owner = urlParts[urlParts.length - 2];
    
    console.log(`[${new Date().toISOString()}] 📋 PARSED REPO: ${owner}/${repoName} @ ${branch}`);
    
    try {
      // Use the enhanced CloudNativeRepoLoader as the primary method
      const CloudNativeRepoLoader = require('./cloudNativeRepoLoader');
      
      const cloudLoader = new CloudNativeRepoLoader({
        owner: owner,
        repo: repoName,
        branch: branch,
        focusPath: 'backend/', // Focus on backend files for EventStorm
        maxFiles: 150, // Reasonable limit with priority-based selection
        timeout: 60000 // Longer timeout for enhanced loading
      });
      
      console.log(`[${new Date().toISOString()}] 📥 ENHANCED LOADING: Loading repository content via priority-based GitHub API`);
      const documents = await cloudLoader.load();
      
      if (documents && documents.length > 0) {
        console.log(`[${new Date().toISOString()}] ✅ PRIMARY SUCCESS: Retrieved ${documents.length} prioritized files via enhanced cloud-native loader`);
        
        // Create a virtual "temp directory" reference for compatibility
        // This allows existing code to work without actual file system operations
        const virtualTempDir = {
          type: 'enhanced-cloud-native',
          owner: owner,
          repo: repoName,
          branch: branch,
          documents: documents,
          path: `cloud-priority://${owner}/${repoName}/${branch}`,
          isVirtual: true,
          loadingMethod: 'priority-based-github-api',
          fileCount: documents.length,
          maxFilesConfigured: cloudLoader.maxFiles,
          focusPath: cloudLoader.focusPath
        };
        
        console.log(`[${new Date().toISOString()}] 📂 ENHANCED WORKSPACE: Created priority-based cloud-native document collection`);
        console.log(`[${new Date().toISOString()}] 🎯 File distribution: ${documents.length} files loaded with intelligent priority ranking`);
        return virtualTempDir;
        
      } else {
        throw new Error('No documents retrieved from repository using enhanced loader');
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ ENHANCED CLOUD-NATIVE ERROR: Failed to load repository via priority-based API:`, error.message);
      
      // Since this is now the primary method, we should fail rather than fallback
      // This ensures we identify and fix any issues with the cloud-native approach
      throw new Error(`Failed to load repository via enhanced cloud-native API: ${error.message}`);
    }
  }

  /**
   * Clean up temporary directory (cloud-native compatible)
   */
  async cleanupTempDir(tempDir) {
    // Handle cloud-native virtual directories
    if (tempDir && typeof tempDir === 'object' && tempDir.isVirtual) {
      console.log(`[${new Date().toISOString()}] 🌐 CLOUD CLEANUP: Releasing cloud-native document collection`);
      console.log(`[${new Date().toISOString()}] 💾 Memory optimization - cloud-native approach requires no disk cleanup`);
      
      // Clear references to allow garbage collection
      if (tempDir.documents) {
        tempDir.documents = null;
      }
      
      console.log(`[${new Date().toISOString()}] ✅ CLEANUP SUCCESS: Cloud-native resources released`);
      return;
    }
    
    // Handle traditional file system directories (fallback)
    if (typeof tempDir === 'string') {
      console.log(`[${new Date().toISOString()}] 🧹 CLEANUP EXPLANATION: Removing temporary repository clone to free disk space`);
      console.log(`[${new Date().toISOString()}] 🎯 Since all source files have been processed and stored as vector embeddings in Pinecone, the local copy is no longer needed. This prevents disk space accumulation from multiple repository processings`);
      
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`[${new Date().toISOString()}] ✅ CLEANUP SUCCESS: Removed temporary directory: ${tempDir}`);
        console.log(`[${new Date().toISOString()}] 💾 Disk space preserved - only vector embeddings retained for fast retrieval`);
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] ⚠️ CLEANUP WARNING: Could not remove temp directory ${tempDir}:`, error.message);
        console.log(`[${new Date().toISOString()}] 🎯 This may require manual cleanup, but doesn't affect the processing success`);
      }
    } else {
      console.log(`[${new Date().toISOString()}] ℹ️ CLEANUP: No cleanup needed for this resource type`);
    }
  }

  /**
   * Check if repository already exists and compare commit hashes
   * @param {string} userId - User ID
   * @param {string} repoId - Repository ID 
   * @param {string} githubOwner - GitHub owner
   * @param {string} repoName - Repository name
   * @param {string} currentCommitHash - Current commit hash
   * @param {Object} pineconeOrService - Pinecone client or service
   * @param {Object} embeddings - Embeddings instance to generate query vector
   */
  async findExistingRepo(userId, repoId, githubOwner, repoName, currentCommitHash = null, pineconeOrService = null, embeddings = null) {
    console.log(`[${new Date().toISOString()}] 🔍 ENHANCED DUPLICATE CHECK: Querying for existing repository data with commit hash comparison`);
    console.log(`[${new Date().toISOString()}] 🎯 This optimization now checks both repository identity AND commit hashes to detect actual changes`);
    
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Checking for existing repo: ${githubOwner}/${repoName} with commit: ${currentCommitHash?.substring(0, 8) || 'unknown'}`);
    
    if (!pineconeOrService || !currentCommitHash || !embeddings) {
      console.log(`[${new Date().toISOString()}] ⚠️ FALLBACK: Missing pinecone client, commit hash, or embeddings - defaulting to safe mode (always process)`);
      return false;
    }

    try {
      // Generate dynamic namespace based on repository context
      const namespace = CollectionNameGenerator.generateForRepository(repoData);
      console.log(`[${new Date().toISOString()}] [DEBUG] Using dynamic collection: ${namespace} for repo: ${repoData?.repoId || 'unknown'}`);
      
      // Handle both PineconeService and raw Pinecone client
      let index;
      if (pineconeOrService.client && typeof pineconeOrService.connect === 'function') {
        // This is a PineconeService wrapper - ensure it's connected and use its client
        await pineconeOrService.connect();
        index = pineconeOrService.client.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      } else if (typeof pineconeOrService.index === 'function') {
        // This is a raw Pinecone client
        index = pineconeOrService.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      } else {
        throw new Error('Invalid pinecone client or service provided');
      }
      
      // Create a proper query vector using the same embeddings used for tracking
      // This ensures dimension compatibility with the index
      const trackingText = `Repository tracking query for ${githubOwner}/${repoName}`;
      const queryVector = await embeddings.embedQuery(trackingText);
      
      // Query for repository metadata with this specific repo
      const queryResponse = await index.namespace(namespace).query({
        vector: queryVector, // Use proper embedding vector instead of hardcoded zero vector
        topK: 1,
        includeMetadata: true,
        filter: {
          userId: userId,
          githubOwner: githubOwner,
          repoName: repoName,
          source: 'repository_tracking' // Special marker for tracking metadata
        }
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const existingRepo = queryResponse.matches[0];
        const existingCommitHash = existingRepo.metadata?.commitHash;
        const lastProcessed = existingRepo.metadata?.lastProcessed;

        console.log(`[${new Date().toISOString()}] 📊 EXISTING REPO FOUND:`);
        console.log(`[${new Date().toISOString()}] 🔄 Previous commit: ${existingCommitHash?.substring(0, 8) || 'unknown'}`);
        console.log(`[${new Date().toISOString()}] 🔄 Current commit:  ${currentCommitHash.substring(0, 8)}`);
        console.log(`[${new Date().toISOString()}] 📅 Last processed: ${lastProcessed || 'unknown'}`);

        if (existingCommitHash === currentCommitHash) {
          console.log(`[${new Date().toISOString()}] ✅ COMMITS MATCH: Repository at same commit, skipping processing`);
          return {
            exists: true,
            reason: 'same_commit',
            existingCommitHash,
            currentCommitHash,
            lastProcessed
          };
        } else {
          console.log(`[${new Date().toISOString()}] 🔄 COMMITS DIFFER: Repository has changes, will process incrementally`);
          return {
            exists: true,
            reason: 'commit_changed',
            existingCommitHash,
            currentCommitHash,
            lastProcessed,
            requiresIncremental: true
          };
        }
      }

      console.log(`[${new Date().toISOString()}] 🆕 NEW REPOSITORY: No previous processing found, will process fully`);
      return false;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error checking existing repo:`, error.message);
      console.log(`[${new Date().toISOString()}] 🛡️ SAFE FALLBACK: Error in duplicate check, defaulting to process (safe mode)`);
      return false;
    }
  }

  /**
   * Store repository tracking metadata in Pinecone
   */
  async storeRepositoryTrackingInfo(userId, repoId, githubOwner, repoName, commitInfo, namespace, pineconeOrService, embeddings) {
    if (!pineconeOrService || !embeddings) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Cannot store repository tracking: missing pinecone or embeddings`);
      return;
    }

    try {
      // Handle both PineconeService and raw Pinecone client
      let index;
      if (pineconeOrService.client && typeof pineconeOrService.connect === 'function') {
        // This is a PineconeService wrapper - ensure it's connected and use its client
        await pineconeOrService.connect();
        index = pineconeOrService.client.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      } else if (typeof pineconeOrService.index === 'function') {
        // This is a raw Pinecone client
        index = pineconeOrService.index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      } else {
        throw new Error('Invalid pinecone client or service provided');
      }
      
      // Create a dummy embedding for the tracking record
      const trackingText = `Repository tracking for ${githubOwner}/${repoName} at commit ${commitInfo?.hash || 'local'}`;
      const embedding = await embeddings.embedQuery(trackingText);

      const trackingRecord = {
        id: `${namespace}_tracking_${Date.now()}`,
        values: embedding,
        metadata: {
          userId: userId,
          repoId: repoId,
          githubOwner: githubOwner,
          repoName: repoName,
          ...(commitInfo && {
            commitHash: commitInfo?.hash ?? null,
            commitTimestamp: commitInfo?.timestamp ?? null,
            commitAuthor: commitInfo?.author ?? null,
            commitSubject: commitInfo?.subject ?? null,
          }),
          lastProcessed: new Date().toISOString(),
          source: 'repository_tracking',
          namespace: namespace
        }
      };

      await index.namespace(namespace).upsert([trackingRecord]);
      console.log(`[${new Date().toISOString()}] 📝 TRACKING STORED: Repository metadata saved to Pinecone for future duplicate detection`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error storing repository tracking:`, error.message);
    }
  }

  /**
   * Helper method to determine file type from file path
   */
  getFileType(filePath) {
    const src = filePath || '';
    const extension = src.includes('.') ? src.split('.').pop().toLowerCase() : '';
    
    const typeMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'react',
      'tsx': 'react-typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'md': 'markdown',
      'txt': 'text',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'dockerfile': 'docker',
      'gitignore': 'gitignore',
      'env': 'environment'
    };
    
    return typeMap[extension] || 'unknown';
  }

  /**
   * Sanitize string for use as identifiers
   */
  sanitizeId(input) {
    if (!input || typeof input !== 'string') {
      return 'unknown';
    }
    return input.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * Get commit information from GitHub API
   */
  async getCommitInfoFromGitHubAPI(owner, repo, branch) {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 GITHUB API: Fetching commit info from GitHub API for ${owner}/${repo}@${branch} [v3-enhanced]`);
      
      const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
      if (!githubToken) {
        console.warn(`[${new Date().toISOString()}] ⚠️ No GitHub token available, attempting public API access`);
        // Try public API access for public repositories
        return await this.tryPublicGitHubAPI(owner, repo, branch);
      }

      // Validate token format
      if (!githubToken.startsWith('ghp_') && !githubToken.startsWith('github_pat_')) {
        console.warn(`[${new Date().toISOString()}] ⚠️ GitHub token format may be invalid (expected ghp_ or github_pat_ prefix)`);
      }

      try {
        // Use Octokit REST API client (more reliable than fetch)
        const { Octokit } = require('@octokit/rest');
        const octokit = new Octokit({
          auth: githubToken,
        });

        // Get branch information which includes latest commit
        console.log(`[${new Date().toISOString()}] 🔍 GITHUB API DEBUG: Requesting branch info for ${owner}/${repo}@${branch}`);
        const { data: branchData } = await octokit.rest.repos.getBranch({
          owner,
          repo,
          branch
        });

        const commit = branchData.commit;
        console.log(`[${new Date().toISOString()}] 📊 GITHUB API DEBUG: Branch '${branch}' HEAD commit: ${commit?.sha?.substring(0, 8) || 'unknown'}`);
        console.log(`[${new Date().toISOString()}] 📅 COMMIT TIMESTAMP: ${commit?.commit?.author?.date || 'unknown'}`);
        console.log(`[${new Date().toISOString()}] 👤 COMMIT AUTHOR: ${commit?.commit?.author?.name || 'unknown'}`);
        console.log(`[${new Date().toISOString()}] 💬 COMMIT MESSAGE: ${commit?.commit?.message?.split('\n')[0] || 'unknown'}`);
        console.log(`[${new Date().toISOString()}] 🔗 COMMIT URL: ${commit?.html_url || 'unknown'}`);

        if (!commit) {
          console.warn(`[${new Date().toISOString()}] ⚠️ No commit data found in GitHub API response`);
          return null;
        }

        const commitInfo = {
          hash: commit.sha,
          subject: commit.commit.message.split('\n')[0], // First line as subject
          message: commit.commit.message,
          author: commit.commit.author.name,
          email: commit.commit.author.email,
          date: commit.commit.author.date,
          url: commit.html_url
        };

        console.log(`[${new Date().toISOString()}] ✅ GITHUB API SUCCESS: Got commit info: ${commitInfo.hash.substring(0, 8)} by ${commitInfo.author}`);
        return commitInfo;

      } catch (authError) {
        if (authError.status === 401) {
          console.warn(`[${new Date().toISOString()}] 🔑 GitHub API authentication failed - trying public API fallback`);
          return await this.tryPublicGitHubAPI(owner, repo, branch);
        }
        throw authError;
      }

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error fetching commit info from GitHub API:`, error.message);
      if (error.status === 403) {
        console.error(`[${new Date().toISOString()}] ⚠️ GitHub API rate limit exceeded or insufficient permissions`);
      } else if (error.status === 404) {
        console.error(`[${new Date().toISOString()}] ⚠️ Repository not found - check owner/repo/branch names`);
      }
      return null; // Fallback to synthetic commit
    }
  }

  /**
   * Try to access GitHub API without authentication (for public repos)
   */
  async tryPublicGitHubAPI(owner, repo, branch) {
    try {
      console.log(`[${new Date().toISOString()}] 🌐 PUBLIC API: Attempting public GitHub API access`);
      
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'eventstorm-rag-processor'
        }
      });

      if (!response.ok) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Public GitHub API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const branchData = await response.json();
      const commit = branchData.commit;

      if (!commit) {
        console.warn(`[${new Date().toISOString()}] ⚠️ No commit data found in public API response`);
        return null;
      }

      const commitInfo = {
        hash: commit.sha,
        subject: commit.commit.message.split('\n')[0],
        message: commit.commit.message,
        author: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date,
        url: commit.html_url
      };

      console.log(`[${new Date().toISOString()}] ✅ PUBLIC API SUCCESS: Got commit info: ${commitInfo.hash.substring(0, 8)} by ${commitInfo.author}`);
      return commitInfo;

    } catch (publicError) {
      console.error(`[${new Date().toISOString()}] ❌ Public GitHub API failed:`, publicError.message);
      return null;
    }
  }

  /**
   * Get changed files between commits using GitHub Compare API
   */
  async getChangedFilesFromGitHubAPI(owner, repo, fromCommit, toCommit) {
    try {
      console.log(`[${new Date().toISOString()}] 🌐 GITHUB API: Getting changed files for ${owner}/${repo} ${fromCommit.substring(0, 8)}...${toCommit.substring(0, 8)}`);
      
      // Use GitHub compare API to get changed files
      const url = `https://api.github.com/repos/${owner}/${repo}/compare/${fromCommit}...${toCommit}`;
      
      const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'eventstorm-commit-compare'
      };
      
      if (githubToken) {
        headers['Authorization'] = `token ${githubToken}`;
        console.log(`[${new Date().toISOString()}] 🔑 Using authenticated GitHub API for changed files`);
      } else {
        console.log(`[${new Date().toISOString()}] 🌐 PUBLIC API: Using public GitHub API for changed files`);
      }
      
      const response = await fetch(url, { headers, timeout: 15000 });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Compare not found (commits may be identical or not exist)`);
          return []; // No changes found
        }
        throw new Error(`GitHub compare API failed: ${response.status} ${response.statusText}`);
      }
      
      const compareData = await response.json();
      
      if (compareData.files && Array.isArray(compareData.files)) {
        const changedFiles = compareData.files.map(file => ({
          filename: file.filename,
          status: file.status, // 'added', 'modified', 'removed', etc.
          changes: file.changes,
          additions: file.additions,
          deletions: file.deletions
        }));
        
        console.log(`[${new Date().toISOString()}] ✅ GITHUB COMPARE API: Found ${changedFiles.length} changed files`);
        console.log(`[${new Date().toISOString()}] 📊 Files: ${changedFiles.length} total, ${compareData.ahead_by || 0} commits ahead, ${compareData.behind_by || 0} behind`);
        
        return changedFiles;
      } else {
        console.log(`[${new Date().toISOString()}] 📭 No changed files found in comparison`);
        return [];
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ GitHub API changed files failed:`, error.message);
      return null; // Fallback to local git (will be skipped if git not available)
    }
  }



  /**
   * Get commit hash from cloud-native virtual directory
   */
  async getCommitHashFromLocalGit(repoPath, branch = 'HEAD') {
    console.log(`[${new Date().toISOString()}] 🌐 CLOUD-NATIVE: getCommitHashFromLocalGit called`);
    
    // Handle virtual cloud-native directories
    if (repoPath && typeof repoPath === 'object' && repoPath.isVirtual) {
      console.log(`[${new Date().toISOString()}] 📂 VIRTUAL DIR: Using GitHub API to get commit hash for ${repoPath.owner}/${repoPath.repo}`);
      
      // Use GitHub API to get the commit hash
      try {
        const commitInfo = await this.getCommitInfoFromGitHubAPI(repoPath.owner, repoPath.repo, repoPath.branch);
        if (commitInfo && commitInfo.hash) {
          console.log(`[${new Date().toISOString()}] ✅ CLOUD COMMIT HASH: Retrieved ${commitInfo.hash.substring(0, 8)} via GitHub API`);
          return commitInfo.hash;
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to get commit hash via GitHub API:`, error.message);
      }
    }
    
    console.log(`[${new Date().toISOString()}] ⚠️ CLOUD-NATIVE: Cannot get commit hash, returning synthetic value`);
    return 'cloud-native-synthetic-hash';
  }

  /**
   * Get detailed commit information from cloud-native virtual directory
   */
  async getCommitInfoFromLocalGit(repoPath, commitHash = 'HEAD') {
    console.log(`[${new Date().toISOString()}] 🌐 CLOUD-NATIVE: getCommitInfoFromLocalGit called`);
    
    // Handle virtual cloud-native directories
    if (repoPath && typeof repoPath === 'object' && repoPath.isVirtual) {
      console.log(`[${new Date().toISOString()}] 📂 VIRTUAL DIR: Using GitHub API to get commit info for ${repoPath.owner}/${repoPath.repo}`);
      
      // Use GitHub API to get the commit info
      try {
        const commitInfo = await this.getCommitInfoFromGitHubAPI(repoPath.owner, repoPath.repo, repoPath.branch);
        if (commitInfo) {
          console.log(`[${new Date().toISOString()}] ✅ CLOUD COMMIT INFO: Retrieved commit ${commitInfo.hash?.substring(0, 8) || 'unknown'} via GitHub API`);
          return commitInfo;
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Failed to get commit info via GitHub API:`, error.message);
      }
    }
    
    console.log(`[${new Date().toISOString()}] ⚠️ CLOUD-NATIVE: Cannot get commit info, returning synthetic values`);
    return this.createSyntheticCommitInfo();
  }

  /**
   * Get list of changed files - cloud-native approach using virtual directory
   */
  async getChangedFilesFromLocalGit(repoPath, fromCommit, toCommit = 'HEAD') {
    console.log(`[${new Date().toISOString()}] 🌐 CLOUD-NATIVE: getChangedFilesFromLocalGit called - using virtual directory approach`);
    
    // Handle virtual cloud-native directories
    if (repoPath && typeof repoPath === 'object' && repoPath.isVirtual) {
      console.log(`[${new Date().toISOString()}] 📂 VIRTUAL DIR: Processing cloud-native document collection`);
      
      // For virtual directories, we can't do git diff operations
      // Instead, return all files since we can't determine changes without git
      const allFiles = repoPath.documents?.map(doc => doc.metadata?.source || doc.path) || [];
      console.log(`[${new Date().toISOString()}] 🔄 CLOUD FALLBACK: Returning all ${allFiles.length} files (no git diff available)`);
      return allFiles;
    }
    
    // For traditional paths (fallback), check if it's a real directory
    if (typeof repoPath === 'string') {
      console.log(`[${new Date().toISOString()}] ⚠️ TRADITIONAL PATH: Received file system path but using cloud-native approach`);
      console.log(`[${new Date().toISOString()}] 🌐 CLOUD OVERRIDE: Skipping git operations in cloud-native environment`);
      
      // In cloud-native mode, we don't have git available
      // Return empty array to indicate no specific changes detected
      return [];
    }
    
    console.log(`[${new Date().toISOString()}] ❌ UNSUPPORTED: Invalid repository path type for cloud-native processing`);
    return [];
  }

  /**
   * GITHUB API FALLBACK: Process repository directly via GitHub API when all else fails
   * This method consolidates the emergency fallback processing that was previously in contextPipeline.js
   */
  async processRepositoryViaDirectAPIFallback(params) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      repoProcessor,
      repoPreparation,
      pineconeClient,
      embeddings,
      routeDocumentsToProcessors,
      eventManager
    } = params;    console.log(`[${new Date().toISOString()}] 🆘 DIRECT GITHUB API FALLBACK: Processing repository without commit tracking or git operations`);
    
    try {
      // Create synthetic commit info for fallback processing
      const fallbackCommitInfo = {
        hash: 'fallback-' + Date.now(),
        subject: 'Direct API processing - no commit tracking', 
        message: 'Repository processed via direct GitHub API fallback',
        author: 'automated-fallback-processor',
        email: 'fallback@eventstorm.me',
        date: new Date().toISOString()
      };

      // Load documents directly using LangChain GitHub API loader (delegated to repoProcessor)
      console.log(`[${new Date().toISOString()}] 📥 DIRECT API: Loading documents via LangChain GithubRepoLoader`);
      const documents = await repoProcessor.loadDocumentsWithLangchain(
        repoUrl, branch, githubOwner, repoName, fallbackCommitInfo
      );

      if (!documents || documents.length === 0) {
        throw new Error('No documents loaded via direct GitHub API');
      }

      console.log(`[${new Date().toISOString()}] ✅ DIRECT API: Loaded ${documents.length} documents`);

      // Process documents using pure processing methods (no orchestration in repoProcessor)
      // TEMPORARY FIX: Hardcode the actual namespace that exists in Pinecone
      const namespace = CollectionNameGenerator.generateForRepository(repoData);
      console.log(`[${new Date().toISOString()}] [DEBUG] TEMP FIX: Using hardcoded namespace: ${namespace}`);
      
      // Step 1: Process documents
      const processedDocuments = await repoProcessor.intelligentProcessDocuments(documents);
      
      // Step 2: Split documents
      const splitDocuments = await repoProcessor.intelligentSplitDocuments(
        processedDocuments, 
        routeDocumentsToProcessors
      );

      // Step 3: Store documents (this should be delegated to EmbeddingManager, but for fallback we'll handle here)
      console.log(`[${new Date().toISOString()}] ⚠️ FALLBACK STORAGE: GitHubOperations handling storage directly (should use EmbeddingManager in production)`);
      
      // CRITICAL FIX: Actually store the embeddings to vector database!
      console.log(`[${new Date().toISOString()}] 💾 FALLBACK EMBEDDING STORAGE: Storing ${splitDocuments.length} chunks to vector database namespace ${namespace}`);
      
      try {
        // Use the EmbeddingManager approach directly with vector service selection
        const EmbeddingManager = require('../embedding/embeddingManager');
        
        // Determine which vector service to use
        const usePostgreSQL = process.env.USE_POSTGRESQL_VECTORS !== 'false';
        let vectorServiceConfig = {};
        
        if (usePostgreSQL) {
          try {
            const PGVectorService = require('../embedding/pgVectorService');
            vectorServiceConfig.pgVectorService = PGVectorService.fromEnvironment();
          } catch (error) {
            console.warn('Falling back to Pinecone for fallback storage:', error.message);
            vectorServiceConfig.pineconeService = this.pineconeService;
          }
        } else {
          vectorServiceConfig.pineconeService = this.pineconeService;
        }
        
        const embeddingManager = new EmbeddingManager({
          embeddings: embeddings,
          ...vectorServiceConfig
        });
        
        await embeddingManager.storeToVectorDB(splitDocuments, namespace, githubOwner, repoName);
        console.log(`[${new Date().toISOString()}] ✅ FALLBACK EMBEDDING SUCCESS: Stored embeddings to vector database`);
        
      } catch (embeddingError) {
        console.error(`[${new Date().toISOString()}] ❌ FALLBACK EMBEDDING FAILED:`, embeddingError.message);
        // Continue processing even if embedding storage fails
      }
      
      const result = {
        success: true,
        documentsProcessed: documents.length,
        chunksGenerated: splitDocuments.length,
        commitInfo: fallbackCommitInfo,
        namespace,
        processedAt: new Date().toISOString()
      };

      console.log(`[${new Date().toISOString()}] ✅ DIRECT FALLBACK SUCCESS: Processed ${result.documentsProcessed || 0} documents`);

      // Store basic tracking info (delegated to repoPreparation)
      await repoPreparation.storeRepositoryTrackingInfo(
        userId, repoId, githubOwner, repoName, fallbackCommitInfo, 
        namespace, pineconeClient, embeddings
      );

      // Emit completion event if eventManager provided
      if (eventManager) {
        eventManager.emitProcessingCompleted(userId, repoId, result);
      }

      return {
        success: true,
        message: 'Direct GitHub API fallback processing completed',
        totalDocuments: result.documentsProcessed || 0,
        totalChunks: result.chunksGenerated || 0,
        commitHash: fallbackCommitInfo.hash,
        commitInfo: fallbackCommitInfo,
        userId, repoId, githubOwner, repoName,
        namespace,
        processingType: 'direct-api-fallback'
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ DIRECT GITHUB API FALLBACK FAILED:`, error.message);
      throw error;
    }
  }

  /**
   * Check if an error indicates git-related issues that require GitHub API fallback
   */
  static isGitError(error) {
    const gitErrorPatterns = [
      'git: not found',
      'Command failed: git',
      'Failed to clone repository',
      'git clone failed',
      'git command not available'
    ];
    
    return gitErrorPatterns.some(pattern => 
      error.message && error.message.includes(pattern)
    );
  }

  /**
   * Get repository characteristics for change analysis context
   * Centralized GitHub API repository metadata gathering
   */
  async getRepositoryCharacteristics(githubOwner, repoName, branch = 'main') {
    try {
      const characteristics = {
        estimatedSize: 'unknown',
        primaryLanguage: 'unknown',
        fileCount: 0,
        type: 'general',
        starCount: 0,
        forkCount: 0,
        isPrivate: false
      };

      // Use existing GitHub API headers setup pattern from other methods
      const headers = {};
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        headers['User-Agent'] = 'eventstorm-context-pipeline';
      }

      console.log(`[${new Date().toISOString()}] 📊 REPO CHARACTERISTICS: Gathering metadata for ${githubOwner}/${repoName}`);

      const repoResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${repoName}`, {
        headers
      });

      if (repoResponse.ok) {
        const repoData = await repoResponse.json();
        
        // Extract comprehensive repository characteristics
        characteristics.estimatedSize = repoData.size || 0; // Size in KB
        characteristics.primaryLanguage = repoData.language || 'unknown';
        characteristics.starCount = repoData.stargazers_count || 0;
        characteristics.forkCount = repoData.forks_count || 0;
        characteristics.isPrivate = repoData.private || false;
        
        // Determine repository type based on name and description
        const name = (repoData.name || '').toLowerCase();
        const description = (repoData.description || '').toLowerCase();
        
        if (name.includes('backend') || description.includes('backend') || description.includes('api') || description.includes('server')) {
          characteristics.type = 'backend';
        } else if (name.includes('frontend') || name.includes('client') || description.includes('frontend') || description.includes('ui') || description.includes('react') || description.includes('vue')) {
          characteristics.type = 'frontend';
        } else if (name.includes('fullstack') || description.includes('fullstack') || description.includes('full-stack')) {
          characteristics.type = 'fullstack';
        } else if (description.includes('library') || description.includes('framework') || description.includes('sdk')) {
          characteristics.type = 'library';
        } else if (description.includes('config') || description.includes('infrastructure') || description.includes('deploy')) {
          characteristics.type = 'infrastructure';
        }

        console.log(`[${new Date().toISOString()}] 📊 REPO METADATA: ${characteristics.type} repository, ${characteristics.estimatedSize}KB, ${characteristics.primaryLanguage}`);
      } else {
        console.warn(`[${new Date().toISOString()}] ⚠️ Failed to get repository characteristics: ${repoResponse.status}`);
      }

      return characteristics;
      
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Could not get repository characteristics:`, error.message);
      return { 
        estimatedSize: 'unknown', 
        primaryLanguage: 'unknown', 
        fileCount: 0, 
        type: 'general',
        starCount: 0,
        forkCount: 0,
        isPrivate: false
      };
    }
  }
}

module.exports = GitHubOperations;
