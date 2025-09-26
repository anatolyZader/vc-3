// CommitSelectionManager.js - Handles all commit-related operations
"use strict";

const { exec } = require('child_process');
const { promisify } = require('util');

/**
 * CommitSelectionManager - Manages commit information retrieval and change detection
 * 
 * This module handles:
 * - Commit information retrieval (GitHub API + local git fallback)
 * - Changed files detection between commits
 * - Commit-based processing optimization
 */
class CommitSelectionManager {
  constructor(options = {}) {
    this.repositoryManager = options.repositoryManager;
    this.execAsync = promisify(exec);
    this.processingStrategy = {
      preferGitHubAPI: true,
      fallbackToLocalGit: true
    };
  }

  /**
   * OPTIMIZED: Get commit info with smart strategy (GitHub API first, local git fallback)
   */
  async getCommitInfoOptimized(repoUrl, branch, githubOwner, repoName) {
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
        tempDir = await this.repositoryManager.cloneRepository(repoUrl, branch);
        
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
            await this.repositoryManager.cleanupTempDir(tempDir);
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
   * Check if git binary is available in the environment
   */
  async checkGitAvailability() {
    try {
      await this.execAsync('git --version', { timeout: 5000 });
      return true;
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ℹ️ Git not available in environment (cloud deployment): ${error.message}`);
      return false;
    }
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
    
    // Strategy 2: Fallback to local git
    let tempDir = null;
    try {
      console.log(`[${new Date().toISOString()}] 🔄 FALLBACK: Using local git for changed files detection`);
      // Pass additional commits needed for diff operation
      const additionalCommits = [oldCommitHash];
      if (newCommitHash && newCommitHash !== 'HEAD') {
        additionalCommits.push(newCommitHash);
      }
      tempDir = await this.repositoryManager.cloneRepository(repoUrl, branch, { additionalCommits });
      const changedFiles = await this.getChangedFilesFromLocalGit(tempDir, oldCommitHash, newCommitHash);
      console.log(`[${new Date().toISOString()}] ✅ LOCAL GIT: Found ${changedFiles.length} changed files via local git`);
      return changedFiles;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Local git changed files failed:`, error.message);
      return []; // Return empty array as fallback
    } finally {
      if (tempDir) {
        try {
          await this.repositoryManager.cleanupTempDir(tempDir);
        } catch (cleanupError) {
          console.warn(`[${new Date().toISOString()}] ⚠️ Failed to cleanup temp directory:`, cleanupError.message);
        }
      }
    }
  }

  /**
   * ENHANCED: Get commit info from GitHub API with robust error handling
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
        const { data: branchData } = await octokit.rest.repos.getBranch({
          owner,
          repo,
          branch
        });

        const commit = branchData.commit;

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
        console.error(`[${new Date().toISOString()}] � GitHub API rate limit exceeded or insufficient permissions`);
      } else if (error.status === 404) {
        console.error(`[${new Date().toISOString()}] � Repository not found - check owner/repo/branch names`);
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
   * Placeholder: Get changed files from GitHub API (to be implemented)
   */
  async getChangedFilesFromGitHubAPI(owner, repo, fromCommit, toCommit) {
    console.log(`[${new Date().toISOString()}] 🌐 TODO: Implement GitHub API changed files for ${owner}/${repo} ${fromCommit}...${toCommit}`);
    // TODO: Implement actual GitHub API call using Octokit
    return null; // Fallback to local git
  }

  /**
   * Get commit hash from local git repository
   */
  async getCommitHashFromLocalGit(repoPath, branch = 'HEAD') {
    try {
      const command = `cd "${repoPath}" && git rev-parse ${branch}`;
      const { stdout } = await this.execAsync(command);
      const commitHash = stdout.trim();
      console.log(`[${new Date().toISOString()}] 🔑 LOCAL GIT COMMIT HASH: Retrieved ${commitHash} for branch ${branch}`);
      return commitHash;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to get commit hash from local git:`, error.message);
      return null;
    }
  }

  /**
   * Get detailed commit information from local git repository
   */
  async getCommitInfoFromLocalGit(repoPath, commitHash = 'HEAD') {
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
      
      console.log(`[${new Date().toISOString()}] 📝 LOCAL GIT COMMIT INFO: ${hash.substring(0, 8)} by ${author} on ${commitInfo?.date ?? 'unknown date'}`);
      return commitInfo;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to get commit info from local git:`, error.message);
      return null;
    }
  }

  /**
   * Get list of changed files between commits from local git repository
   */
  async getChangedFilesFromLocalGit(repoPath, fromCommit, toCommit = 'HEAD') {
    try {
      // First, verify that both commits exist in the repository
      try {
        await this.execAsync(`cd "${repoPath}" && git cat-file -e ${fromCommit}`);
      } catch (commitError) {
        console.warn(`[${new Date().toISOString()}] ⚠️ COMMIT NOT FOUND: ${fromCommit.substring(0, 8)} not in shallow clone, attempting fetch...`);
        
        // Try to fetch the missing commit
        try {
          await this.execAsync(`git -C "${repoPath}" fetch origin ${fromCommit}`, { timeout: 30000 });
          console.log(`[${new Date().toISOString()}] ✅ COMMIT FETCH: Successfully fetched missing commit ${fromCommit.substring(0, 8)}`);
        } catch (fetchError) {
          // Fallback: fetch more history
          console.log(`[${new Date().toISOString()}] 🔄 FALLBACK: Fetching extended history to find commit`);
          try {
            await this.execAsync(`git -C "${repoPath}" fetch --depth=50 origin`, { timeout: 45000 });
            console.log(`[${new Date().toISOString()}] ✅ EXTENDED FETCH: Successfully fetched more history`);
            
            // Verify commit is now available
            await this.execAsync(`cd "${repoPath}" && git cat-file -e ${fromCommit}`);
          } catch (extendedError) {
            console.error(`[${new Date().toISOString()}] ❌ COMMIT UNAVAILABLE: Cannot access commit ${fromCommit.substring(0, 8)} even after extended fetch`);
            throw new Error(`Commit ${fromCommit.substring(0, 8)} not accessible for diff operation`);
          }
        }
      }
      
      const command = `cd "${repoPath}" && git diff --name-only ${fromCommit} ${toCommit}`;
      const { stdout } = await this.execAsync(command);
      const changedFiles = stdout.trim().split('\n').filter(file => file.length > 0);
      console.log(`[${new Date().toISOString()}] 📋 LOCAL GIT CHANGED FILES: ${changedFiles.length} files modified between ${fromCommit.substring(0, 8)} and ${toCommit}`);
      return changedFiles;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to get changed files from local git:`, error.message);
      return [];
    }
  }
}

module.exports = CommitSelectionManager;
