// CloudNativeRepoLoader.js - Direct GitHub API document loader for cloud environments
"use strict";

const FileFilteringUtils = require('../embedding/FileFilteringUtils');

/**
 * CloudNativeRepoLoader - Loads repository documents directly via GitHub API
 * 
 * This loader bypasses git operations and authentication issues by:
 * - Using public GitHub API when possible
 * - Implementing direct tree traversal
 * - Focusing on specific directories (like backend/)
 * - Providing robust fallback mechanisms
 */
class CloudNativeRepoLoader {
  constructor(options = {}) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.branch = options.branch || 'main';
    this.focusPath = options.focusPath; // e.g., 'backend/'
    this.maxFiles = options.maxFiles || 100;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Load documents from GitHub repository using direct API calls with priority-based loading
   */
  async load() {
    console.log(`Loading ${this.owner}/${this.repo}${this.focusPath ? '/' + this.focusPath : ''}`);
    
    try {
      // Get repository tree
      const tree = await this.getRepositoryTree();
      
      // Filter to target path if specified
      let targetFiles = tree;
      if (this.focusPath) {
        targetFiles = tree.filter(item => 
          item.path.startsWith(this.focusPath) && 
          item.type === 'blob' &&
          this.isSourceFile(item.path)
        );
      }

      // Prioritize files by importance
      targetFiles = this.prioritizeFiles(targetFiles);
      
      // Limit to prevent overload, but keep the most important files
      if (targetFiles.length > this.maxFiles) {
        targetFiles = targetFiles.slice(0, this.maxFiles);
      }

      // Load file contents with enhanced rate limiting
      const documents = await this.loadFileContents(targetFiles);
      
      console.log(`Loaded ${documents.length}/${targetFiles.length} files from ${this.owner}/${this.repo}`);
      return documents;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ CLOUD LOADER FAILED:`, error.message);
      return [];
    }
  }

  /**
   * Get repository tree using GitHub API with retry logic
   */
  async getRepositoryTree() {
    const maxRetries = 3;
    const retryDelay = 3000; // 3 seconds
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Use public API endpoint with authentication fallback
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=1`;
        
        // Try with authentication first if available, then fall back to public API
        const headers = {};
        if (process.env.GITHUB_TOKEN) {
          headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
          headers['User-Agent'] = 'eventstorm-cloud-native-loader';
        }
        
        const response = await fetch(url, {
          headers,
          timeout: this.timeout
        });

        if (response.ok) {
          const data = await response.json();
          
          if (!data.tree || !Array.isArray(data.tree)) {
            throw new Error('Invalid tree response from GitHub API');
          }

          return data.tree;
        }
        
        // Handle rate limiting
        if (response.status === 403 || response.status === 429) {
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }
        
        // Other errors
        throw new Error(`GitHub tree API failed: ${response.status} ${response.statusText}`);
        
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`Failed to get repository tree:`, error.message);
          throw error;
        }
        
        if (error.message.includes('rate limit') || error.message.includes('403') || error.message.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        // Non-rate-limit errors should be thrown immediately
        throw error;
      }
    }
  }

  /**
   * Load file contents for multiple files with enhanced rate limiting and retry logic
   */
  async loadFileContents(files) {
    const documents = [];
    const batchSize = 3; // Smaller batches to avoid rate limits
    const delayBetweenBatches = 1000; // Longer delay between batches
    const retryDelay = 2000; // Delay for rate limit retries

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      try {
        // Process batch sequentially to avoid overwhelming the API
        for (const file of batch) {
          let retries = 0;
          const maxRetries = 3;
          
          while (retries <= maxRetries) {
            try {
              const document = await this.loadSingleFile(file);
              if (document) {
                documents.push(document);
              }
              break; // Success, exit retry loop
              
            } catch (error) {
              if (error.message.includes('rate limit') || error.message.includes('429') || error.message.includes('403')) {
                retries++;
                if (retries <= maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                  continue;
                }
              }
              console.warn(`Failed to load ${file.path}:`, error.message);
              break; // Exit retry loop
            }
          }
          
          // Small delay between individual file requests
          await new Promise(resolve => setTimeout(resolve, 150));
        }
        
        // Rate limiting - wait between batches
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
        
      } catch (batchError) {
        console.error(`Batch processing failed:`, batchError.message);
      }
    }

    return documents;
  }

  /**
   * Load content for a single file
   */
  async loadSingleFile(fileInfo) {
    try {
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${fileInfo.path}?ref=${this.branch}`;
      
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'eventstorm-cloud-loader'
      };
      
      // Add GitHub token if available
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }
      
      const response = await fetch(url, {
        headers,
        timeout: 10000
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`GitHub contents API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.type !== 'file' || !data.content) {
        return null;
      }

      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      
      // Create LangChain-compatible document
      const document = {
        pageContent: content,
        metadata: {
          source: fileInfo.path,
          type: 'github-file',
          size: data.size,
          sha: data.sha,
          repository: `${this.owner}/${this.repo}`,
          branch: this.branch,
          loaded_at: new Date().toISOString(),
          loading_method: 'cloud_native_api'
        }
      };

      return document;

    } catch (error) {
      return null;
    }
  }

    /**
   * Check if file is a source file we want to index with priority scoring
   * Now uses centralized FileFilteringUtils for consistent exclusion logic
   */
  isSourceFile(path) {
    // Use centralized filtering logic that includes test exclusions
    return FileFilteringUtils.shouldIndexFile(path);
  }

  /**
   * Get priority score for file (higher = more important)
   */
  getFilePriority(path) {
    // High priority files (core application files)
    if (/\/(diPlugin|app|server|index)\.(js|ts)$/.test(path)) return 100;
    if (/ARCHITECTURE\.md$/.test(path)) return 95;
    if (/ROOT_DOCUMENTATION\.md$/.test(path)) return 90;
    
    // Medium-high priority (services and controllers)
    if (/Service\.(js|ts)$/.test(path)) return 80;
    if (/Controller\.(js|ts)$/.test(path)) return 75;
    if (/Adapter\.(js|ts)$/.test(path)) return 70;
    
    // Medium priority (domain and infrastructure)
    if (/\/domain\//.test(path)) return 60;
    if (/\/infrastructure\//.test(path)) return 55;
    if (/\/application\//.test(path)) return 50;
    
    // Lower priority (configs, docs - tests are now filtered out)
    if (/\.config\.(js|ts|json)$/.test(path)) return 25;
    if (/\.md$/.test(path)) return 20;
    
    // Default priority
    return 10;
  }

  /**
   * Sort files by priority (most important first)
   */
  prioritizeFiles(files) {
    return files.sort((a, b) => {
      const priorityA = this.getFilePriority(a.path);
      const priorityB = this.getFilePriority(b.path);
      return priorityB - priorityA; // Higher priority first
    });
  }
}

module.exports = CloudNativeRepoLoader;