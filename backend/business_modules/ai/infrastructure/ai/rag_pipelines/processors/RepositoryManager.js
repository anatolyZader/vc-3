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
   * Check if repository already exists to avoid duplicate processing
   */
  async findExistingRepo(userId, repoId, githubOwner, repoName) {
    console.log(`[${new Date().toISOString()}] 🔍 DUPLICATE CHECK EXPLANATION: Querying for existing repository data to prevent unnecessary reprocessing`);
    console.log(`[${new Date().toISOString()}] 🎯 This optimization saves time and resources by checking if user ${userId} has already processed repo ${githubOwner}/${repoName}. We search in Pinecone vector metadata or database records to verify if vector embeddings already exist for this repository`);
    
    console.log(`[${new Date().toISOString()}] 📥 DATA-PREP: Checking for existing repo: ${githubOwner}/${repoName}`);
    
    // For now, we'll assume repositories are not duplicate processed
    // This could be enhanced to check Pinecone metadata or a database
    console.log(`[${new Date().toISOString()}] 📝 NOTE: Duplicate checking not yet fully implemented - defaulting to process (safe mode)`);
    console.log(`[${new Date().toISOString()}] 🎯 Future implementation will query Pinecone metadata with filters: userId=${userId}, githubOwner=${githubOwner}, repoName=${repoName}`);
    
    // TODO: Implement actual duplicate detection
    // This could query Pinecone metadata or check a database
    return false;
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
