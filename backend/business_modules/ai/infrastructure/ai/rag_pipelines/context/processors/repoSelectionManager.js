// RepoSelectionManager.js
"use strict";

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

/**
 * Handles repository operations including cloning, cleanup, and file management
 */
class RepoSelectionManager {
  constructor() {
    this.execAsync = promisify(exec);
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
      const namespace = this.sanitizeId(`${githubOwner}_${repoName}_main`);
      
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
}

module.exports = RepoSelectionManager;
