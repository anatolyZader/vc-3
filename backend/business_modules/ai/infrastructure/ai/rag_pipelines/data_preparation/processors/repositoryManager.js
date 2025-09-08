// RepositoryManager.js
"use strict";

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

/**
 * Handles repository operations including cloning, cleanup, and file management
 */
class RepositoryManager {
  constructor() {
    this.execAsync = promisify(exec);
  }

  /**
   * Clone repository to temporary directory
   */
  async cloneRepository(url, branch) {
    console.log(`[${new Date().toISOString()}] 🎯 CLONING EXPLANATION: Creating isolated temporary workspace for safe repository analysis`);
    console.log(`[${new Date().toISOString()}] 🎯 We use 'git clone --depth 1' for efficiency (only latest commit) and create a unique temporary directory to avoid conflicts with concurrent processing`);
    
    // Create temp directory
    const tempDir = path.join(__dirname, '../../../../../../../temp', `repo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      console.log(`[${new Date().toISOString()}] 📁 TEMP WORKSPACE: Created isolated directory: ${tempDir}`);
      
      // Clone the repository
      const cloneCommand = `git clone --depth 1 --branch ${branch} ${url} ${tempDir}`;
      console.log(`[${new Date().toISOString()}] 📥 GIT OPERATION: Executing shallow clone - ${cloneCommand}`);
      console.log(`[${new Date().toISOString()}] 🎯 This downloads only the latest commit from branch '${branch}' to minimize transfer time and storage`);
      
      await this.execAsync(cloneCommand, { timeout: 60000 }); // 60 second timeout
      console.log(`[${new Date().toISOString()}] ✅ CLONE SUCCESS: Repository cloned successfully to temporary workspace`);
      console.log(`[${new Date().toISOString()}] 📂 Ready to analyze source files from ${url}`);
      
      return tempDir;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ DATA-PREP: Error cloning repository:`, error.message);
      
      // Cleanup on failure
      try {
        await fs.rmdir(tempDir, { recursive: true });
      } catch (cleanupError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ DATA-PREP: Could not cleanup temp directory:`, cleanupError.message);
      }
      
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Clean up temporary directory
   */
  async cleanupTempDir(tempDir) {
    console.log(`[${new Date().toISOString()}] 🧹 CLEANUP EXPLANATION: Removing temporary repository clone to free disk space`);
    console.log(`[${new Date().toISOString()}] 🎯 Since all source files have been processed and stored as vector embeddings in Pinecone, the local copy is no longer needed. This prevents disk space accumulation from multiple repository processings`);
    
    try {
      await fs.rmdir(tempDir, { recursive: true });
      console.log(`[${new Date().toISOString()}] ✅ CLEANUP SUCCESS: Removed temporary directory: ${tempDir}`);
      console.log(`[${new Date().toISOString()}] 💾 Disk space preserved - only vector embeddings retained for fast retrieval`);
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ CLEANUP WARNING: Could not remove temp directory ${tempDir}:`, error.message);
      console.log(`[${new Date().toISOString()}] 🎯 This may require manual cleanup, but doesn't affect the processing success`);
    }
  }

  /**
   * Get commit hash from a cloned repository
   */
  async getCommitHash(repoPath, branch = 'HEAD') {
    try {
      const command = `cd "${repoPath}" && git rev-parse ${branch}`;
      const { stdout } = await this.execAsync(command);
      const commitHash = stdout.trim();
      console.log(`[${new Date().toISOString()}] 🔑 COMMIT HASH: Retrieved ${commitHash} for branch ${branch}`);
      return commitHash;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to get commit hash:`, error.message);
      return null;
    }
  }

  /**
   * Get detailed commit information including timestamp and author
   */
  async getCommitInfo(repoPath, commitHash = 'HEAD') {
    try {
      const command = `cd "${repoPath}" && git show --format="%H|%ct|%an|%s" -s ${commitHash}`;
      const { stdout } = await this.execAsync(command);
      const [hash, timestamp, author, subject] = stdout.trim().split('|');
      
      const commitInfo = {
        hash,
        timestamp: parseInt(timestamp),
        author,
        subject,
        date: new Date(parseInt(timestamp) * 1000).toISOString()
      };
      
      console.log(`[${new Date().toISOString()}] 📝 COMMIT INFO: ${hash.substring(0, 8)} by ${author} on ${commitInfo.date}`);
      return commitInfo;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to get commit info:`, error.message);
      return null;
    }
  }

  /**
   * Get list of changed files between commits
   */
  async getChangedFiles(repoPath, fromCommit, toCommit = 'HEAD') {
    try {
      const command = `cd "${repoPath}" && git diff --name-only ${fromCommit} ${toCommit}`;
      const { stdout } = await this.execAsync(command);
      const changedFiles = stdout.trim().split('\n').filter(file => file.length > 0);
      console.log(`[${new Date().toISOString()}] 📋 CHANGED FILES: ${changedFiles.length} files modified between ${fromCommit.substring(0, 8)} and ${toCommit}`);
      return changedFiles;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to get changed files:`, error.message);
      return [];
    }
  }

  /**
   * Check if repository already exists and compare commit hashes
   */
  async findExistingRepo(userId, repoId, githubOwner, repoName, currentCommitHash = null, pinecone = null) {
    console.log(`[${new Date().toISOString()}] 🔍 ENHANCED DUPLICATE CHECK: Querying for existing repository data with commit hash comparison`);
    console.log(`[${new Date().toISOString()}] 🎯 This optimization now checks both repository identity AND commit hashes to detect actual changes`);
    
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Checking for existing repo: ${githubOwner}/${repoName} with commit: ${currentCommitHash?.substring(0, 8) || 'unknown'}`);
    
    if (!pinecone || !currentCommitHash) {
      console.log(`[${new Date().toISOString()}] ⚠️ FALLBACK: Missing pinecone client or commit hash - defaulting to safe mode (always process)`);
      return false;
    }

    try {
      const namespace = this.sanitizeId(`${githubOwner}_${repoName}_main`);
      const index = pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      
      // Query for repository metadata with this specific repo
      const queryResponse = await index.namespace(namespace).query({
        vector: new Array(1536).fill(0), // Dummy vector for metadata-only search
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
  async storeRepositoryTrackingInfo(userId, repoId, githubOwner, repoName, commitInfo, namespace, pinecone, embeddings) {
    if (!pinecone || !embeddings) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Cannot store repository tracking: missing pinecone or embeddings`);
      return;
    }

    try {
      const index = pinecone.Index(process.env.PINECONE_INDEX_NAME || 'eventstorm-index');
      
      // Create a dummy embedding for the tracking record
      const trackingText = `Repository tracking for ${githubOwner}/${repoName} at commit ${commitInfo.hash}`;
      const embedding = await embeddings.embedQuery(trackingText);

      const trackingRecord = {
        id: `${namespace}_tracking_${Date.now()}`,
        values: embedding,
        metadata: {
          userId: userId,
          repoId: repoId,
          githubOwner: githubOwner,
          repoName: repoName,
          commitHash: commitInfo.hash,
          commitTimestamp: commitInfo.timestamp,
          commitAuthor: commitInfo.author,
          commitSubject: commitInfo.subject,
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
    const extension = filePath.split('.').pop().toLowerCase();
    
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

module.exports = RepositoryManager;
