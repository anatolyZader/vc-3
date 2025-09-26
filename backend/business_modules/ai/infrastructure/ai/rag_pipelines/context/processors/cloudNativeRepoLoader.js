// CloudNativeRepoLoader.js - Direct GitHub API document loader for cloud environments
"use strict";

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
   * Load documents from GitHub repository using direct API calls
   */
  async load() {
    console.log(`[${new Date().toISOString()}] 🌐 CLOUD LOADER: Loading ${this.owner}/${this.repo}/${this.focusPath || 'all'} via direct API`);
    
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
        console.log(`[${new Date().toISOString()}] 🎯 FILTERED: ${targetFiles.length} files in ${this.focusPath} from ${tree.length} total`);
      }

      // Limit to prevent overload
      if (targetFiles.length > this.maxFiles) {
        console.log(`[${new Date().toISOString()}] ⚠️ LIMITING: Reducing from ${targetFiles.length} to ${this.maxFiles} files`);
        targetFiles = targetFiles.slice(0, this.maxFiles);
      }

      // Load file contents in batches
      const documents = await this.loadFileContents(targetFiles);
      
      console.log(`[${new Date().toISOString()}] ✅ CLOUD LOADER: Successfully loaded ${documents.length} documents`);
      return documents;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ CLOUD LOADER FAILED:`, error.message);
      return [];
    }
  }

  /**
   * Get repository tree using GitHub API
   */
  async getRepositoryTree() {
    try {
      // Use public API endpoint
      const url = `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${this.branch}?recursive=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'eventstorm-cloud-loader'
        },
        timeout: this.timeout
      });

      if (!response.ok) {
        throw new Error(`GitHub tree API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.tree || !Array.isArray(data.tree)) {
        throw new Error('Invalid tree response from GitHub API');
      }

      console.log(`[${new Date().toISOString()}] 📂 TREE: Found ${data.tree.length} items in repository`);
      return data.tree;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Failed to get repository tree:`, error.message);
      throw error;
    }
  }

  /**
   * Load file contents for multiple files
   */
  async loadFileContents(files) {
    const documents = [];
    const batchSize = 5; // Process in small batches to avoid rate limits
    
    console.log(`[${new Date().toISOString()}] 📥 LOADING: Processing ${files.length} files in batches of ${batchSize}`);

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      try {
        const batchPromises = batch.map(file => this.loadSingleFile(file));
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            documents.push(result.value);
          } else if (result.status === 'rejected') {
            console.warn(`[${new Date().toISOString()}] ⚠️ Failed to load ${batch[index].path}:`, result.reason?.message);
          }
        });
        
        // Small delay between batches
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        console.error(`[${new Date().toISOString()}] ❌ Batch ${i}-${i+batchSize} failed:`, batchError.message);
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
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'eventstorm-cloud-loader'
        },
        timeout: 10000
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[${new Date().toISOString()}] ⚠️ File not found: ${fileInfo.path}`);
          return null;
        }
        throw new Error(`GitHub contents API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.type !== 'file' || !data.content) {
        console.warn(`[${new Date().toISOString()}] ⚠️ Invalid file data for ${fileInfo.path}`);
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
      console.error(`[${new Date().toISOString()}] ❌ Failed to load ${fileInfo.path}:`, error.message);
      return null;
    }
  }

  /**
   * Check if file is a source file we want to index
   */
  isSourceFile(path) {
    // Skip non-source files
    const excludePatterns = [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.tmp$/,
      /\.log$/,
      /\.lock$/,
      /package-lock\.json$/,
      /\.DS_Store$/,
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i
    ];

    const includePatterns = [
      /\.(js|jsx|ts|tsx|mjs|cjs)$/,
      /\.(py|pyx|pyi)$/,
      /\.(java|kt|scala)$/,
      /\.(md|txt|json|yaml|yml)$/,
      /\.(html|css|scss|sass)$/,
      /^[^.]*$/ // Files without extension (like README, Dockerfile, etc.)
    ];

    // Check excludes first
    if (excludePatterns.some(pattern => pattern.test(path))) {
      return false;
    }

    // Check includes
    if (includePatterns.some(pattern => pattern.test(path))) {
      return true;
    }

    // Default to include if unsure
    return true;
  }
}

module.exports = CloudNativeRepoLoader;