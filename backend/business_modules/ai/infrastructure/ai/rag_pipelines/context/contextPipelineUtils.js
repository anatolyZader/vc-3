// contextPipelineUtils.js - Utility functions for ContextPipeline operations
"use strict";

/**
 * =====================================================================================
 * CONTEXT PIPELINE UTILITIES - Shared utility functions for repository processing
 * =====================================================================================
 * 
 * This module contains utility functions that support the ContextPipeline operations
 * including file type detection, content type analysis, URL parsing, and data formatting.
 * 
 * Extracted from ContextPipeline to improve modularity and testability.
 * 
 * ==================================================================================
 * UTILITY CATEGORIES
 * ==================================================================================
 * 
 * 1. FILE TYPE DETECTION
 *    - Content type classification based on file extensions and patterns
 *    - Code file identification for AST processing
 *    - Documentation file detection for specialized handling
 * 
 * 2. CONTENT ANALYSIS
 *    - OpenAPI/Swagger specification detection
 *    - JSON Schema file identification
 *    - Configuration file recognition
 * 
 * 3. DATA PROCESSING
 *    - Repository URL parsing (GitHub HTTPS/SSH formats)
 *    - Sensitive data scrubbing for secure logging
 *    - Standardized result object creation
 * 
 * 4. SCALING ANALYSIS
 *    - File processability detection for scaling decisions
 *    - Repository size estimation helpers
 * 
 * ==================================================================================
 */

class ContextPipelineUtils {
  
  // ==================================================================================
  // FILE TYPE DETECTION UTILITIES
  // ==================================================================================

  /**
   * Get file extension from filename
   * @param {string} filename - The filename to extract extension from
   * @returns {string} File extension with dot (e.g., '.js') or empty string
   */
  static getFileExtension(filename) {
    if (!filename) return '';
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  /**
   * Get basename (filename without extension) from filepath
   * @param {string} filepath - The file path to extract basename from
   * @returns {string} Basename without extension
   */
  static getBasename(filepath) {
    if (!filepath) return '';
    const lastSlash = Math.max(filepath.lastIndexOf('/'), filepath.lastIndexOf('\\'));
    const filename = lastSlash === -1 ? filepath : filepath.substring(lastSlash + 1);
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? filename : filename.substring(0, lastDot);
  }

  /**
   * Check if file extension indicates a code file
   * @param {string} extension - File extension (with dot)
   * @returns {boolean} True if it's a code file
   */
  static isCodeFile(extension) {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',  // JavaScript/TypeScript
      '.py', '.pyx', '.pyi',                        // Python
      '.java', '.kt', '.scala',                     // JVM languages
      '.go', '.rs', '.cpp', '.c', '.h', '.hpp',     // Systems languages
      '.cs', '.vb', '.fs',                          // .NET languages
      '.php', '.rb', '.swift', '.dart'              // Other languages
    ];
    return codeExtensions.includes(extension);
  }

  /**
   * Check if file is a documentation file
   * @param {string} extension - File extension
   * @param {string} basename - Base filename without extension
   * @returns {boolean} True if it's a documentation file
   */
  static isDocumentationFile(extension, basename) {
    const docExtensions = ['.txt', '.rst', '.adoc', '.org'];
    const docFilenames = ['readme', 'changelog', 'license', 'contributing'];
    
    return docExtensions.includes(extension) || 
           docFilenames.some(name => basename.includes(name));
  }

  // ==================================================================================
  // CONTENT ANALYSIS UTILITIES
  // ==================================================================================

  /**
   * Check if file is an OpenAPI/Swagger specification
   * @param {string} source - File path/source
   * @param {string} content - File content
   * @returns {boolean} True if it's an OpenAPI file
   */
  static isOpenAPIFile(source, content) {
    const filename = this.getBasename(source).toLowerCase();
    
    // Check filename patterns
    if (filename.includes('openapi') || 
        filename.includes('swagger') ||
        filename.includes('api-spec') ||
        filename.includes('apispec')) {
      return true;
    }

    // Check content for OpenAPI indicators
    if (content.includes('openapi:') || 
        content.includes('"openapi"') ||
        content.includes('swagger:') ||
        content.includes('"swagger"') ||
        content.includes('/paths/') ||
        content.includes('"paths"')) {
      return true;
    }

    return false;
  }

  /**
   * Check if file is a JSON Schema file
   * @param {string} source - File path/source
   * @param {string} content - File content
   * @returns {boolean} True if it's a JSON Schema file
   */
  static isJSONSchemaFile(source, content) {
    const filename = this.getBasename(source).toLowerCase();
    
    // Check filename patterns
    if (filename.includes('schema') || filename.endsWith('.schema.json')) {
      return true;
    }

    // Check content for JSON Schema indicators
    if (content.includes('"$schema"') ||
        content.includes('"type"') && content.includes('"properties"') ||
        content.includes('json-schema.org')) {
      return true;
    }

    return false;
  }

  // ==================================================================================
  // SCALING ANALYSIS UTILITIES
  // ==================================================================================

  /**
   * Check if file should be processed (for scaling analysis)
   * @param {string} filePath - Path to the file
   * @returns {boolean} True if file should be processed
   */
  static isProcessableFileForScaling(filePath) {
    const excludePatterns = [
      /node_modules\//,
      /\.git\//,
      /dist\//,
      /build\//,
      /coverage\//,
      /\.log$/,
      /\.(png|jpg|jpeg|gif|ico|svg)$/i,
      /\.DS_Store$/
    ];
    
    for (const pattern of excludePatterns) {
      if (pattern.test(filePath)) return false;
    }
    
    // Focus on backend files for EventStorm
    if (filePath.includes('backend/')) {
      const sourceExtensions = /\.(js|ts|jsx|tsx|json|md|sql|yaml|yml|txt|env)$/i;
      return sourceExtensions.test(filePath);
    }
    
    return false;
  }

  // ==================================================================================
  // DATA PROCESSING UTILITIES
  // ==================================================================================

  /**
   * Parse repository URL supporting both HTTPS and SSH formats
   * @param {string} url - Repository URL
   * @returns {Object} Object with githubOwner and repoName properties
   */
  static parseRepositoryUrl(url) {
    try {
      // SSH format: git@github.com:owner/repo.git
      const sshMatch = url.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
      if (sshMatch) {
        return { githubOwner: sshMatch[1], repoName: sshMatch[2] };
      }

      // HTTPS format: https://github.com/owner/repo or https://github.com/owner/repo.git
      const httpsMatch = url.match(/github\.com\/([^/]+)\/(.+?)(?:\.git)?(?:\/)?$/);
      if (httpsMatch) {
        return { githubOwner: httpsMatch[1], repoName: httpsMatch[2] };
      }

      // Fallback to old naive parsing for other formats
      const urlParts = url.replace(/\.git$/, '').split('/');
      if (urlParts.length >= 2) {
        return { 
          githubOwner: urlParts[urlParts.length - 2], 
          repoName: urlParts[urlParts.length - 1] 
        };
      }

      return { githubOwner: null, repoName: null };
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ URL parsing error:`, error.message);
      return { githubOwner: null, repoName: null };
    }
  }

  /**
   * Scrub sensitive data from repository data for secure logging
   * @param {Object} data - Data object to scrub
   * @returns {Object} Scrubbed data object
   */
  static scrubSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const scrubbed = { ...data };
    const sensitiveFields = ['token', 'password', 'secret', 'key', 'auth'];
    
    for (const field of sensitiveFields) {
      if (scrubbed[field]) {
        scrubbed[field] = '[REDACTED]';
      }
    }
    
    // Scrub URLs that might contain tokens
    if (scrubbed.url && typeof scrubbed.url === 'string') {
      scrubbed.url = scrubbed.url.replace(/([?&]token=)[^&]+/, '$1[REDACTED]');
      scrubbed.url = scrubbed.url.replace(/(\/\/)[^@]+(@)/, '$1[REDACTED]$2');
    }
    
    return scrubbed;
  }

  /**
   * Create standardized result object for consistent API responses
   * @param {Object} params - Result parameters
   * @param {boolean} params.success - Whether operation succeeded
   * @param {string} params.mode - Processing mode (skip, incremental, full, error, etc.)
   * @param {string} [params.reason] - Reason for the processing decision
   * @param {Object} [params.details] - Additional details about the operation
   * @param {string} [params.commitHash] - Git commit hash
   * @param {string} params.repoId - Repository ID
   * @param {string} params.userId - User ID
   * @param {string} [params.message] - Human-readable message
   * @returns {Object} Standardized result object
   */
  static createStandardResult({ success, mode, reason = null, details = null, commitHash = null, repoId, userId, message = null }) {
    return {
      success,
      mode,
      ...(reason && { reason }),
      ...(details && { details }),
      ...(commitHash && { commitHash }),
      ...(message && { message }),
      repoId,
      userId,
      timestamp: new Date().toISOString()
    };
  }

  // ==================================================================================
  // CONTENT TYPE DETECTION (MAIN ORCHESTRATION)
  // ==================================================================================

  /**
   * Detect content type for routing decisions
   * @param {Object} document - LangChain document object
   * @returns {string} Content type (code, markdown, openapi, yaml_config, json_config, json_schema, generic)
   */
  static detectContentType(document) {
    const source = document.metadata?.source || '';
    const extension = this.getFileExtension(source).toLowerCase();
    const basename = this.getBasename(source).toLowerCase();
    const content = document.pageContent ?? '';

    // OpenAPI/Swagger files - check content and filename patterns
    if (this.isOpenAPIFile(source, content)) {
      return 'openapi';
    }

    // JSON Schema files - check content and filename patterns  
    if (this.isJSONSchemaFile(source, content)) {
      return 'json_schema';
    }

    // YAML configuration files
    if (extension === '.yml' || extension === '.yaml') {
      return 'yaml_config';
    }

    // JSON configuration files (but not OpenAPI/schema which are handled above)
    if (extension === '.json') {
      return 'json_config';
    }

    // Code files - use AST splitter
    if (this.isCodeFile(extension)) {
      return 'code';
    }

    // Markdown and Documentation files - consolidated handling
    if (extension === '.md' || extension === '.markdown' || this.isDocumentationFile(extension, basename)) {
      return 'markdown';
    }

    return 'generic';
  }

  // ==================================================================================
  // VALIDATION UTILITIES
  // ==================================================================================

  /**
   * Validate repository data structure
   * @param {Object} repoData - Repository data to validate
   * @returns {Object} Validation result with success flag and missing fields
   */
  static validateRepositoryData(repoData) {
    const missingFields = {};
    
    if (!repoData?.url) missingFields.url = true;
    if (!repoData?.branch) missingFields.branch = true;
    
    return {
      isValid: Object.keys(missingFields).length === 0,
      missingFields
    };
  }

  // ==================================================================================
  // LOGGING UTILITIES
  // ==================================================================================

  /**
   * Create timestamped log message
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
   * @param {string} component - Component name
   * @param {string} message - Log message
   * @returns {string} Formatted log message
   */
  static createLogMessage(level, component, message) {
    return `[${new Date().toISOString()}] [${level}] ${component}: ${message}`;
  }
  /**
   * Determine if horizontal scaling should be used based on repository characteristics
   */
  static async shouldUseHorizontalScaling(githubOwner, repoName, branch) {
    try {
      console.log(`[${new Date().toISOString()}] 📊 ANALYZING: Repository size for ${githubOwner}/${repoName}`);
      
      // Get repository statistics from GitHub API
      const headers = {};
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        headers['User-Agent'] = 'eventstorm-context-pipeline';
      }
      
      // Get repository info
      const repoResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${repoName}`, {
        headers
      });
      
      if (!repoResponse.ok) {
        console.warn(`[${new Date().toISOString()}] ⚠️  Failed to get repo info, using standard processing`);
        return { useWorkers: false, estimatedFiles: 'unknown', reason: 'api_error' };
      }
      
      const repoData = await repoResponse.json();
      const repoSize = repoData.size; // Size in KB
      
      // Get file tree to count processable files
      const treeResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${repoName}/git/trees/${branch}?recursive=1`, {
        headers
      });
      
      if (!treeResponse.ok) {
        console.warn(`[${new Date().toISOString()}] ⚠️  Failed to get file tree, using repo size for estimation`);
        // Estimate based on repository size
        const estimatedFiles = Math.floor(repoSize / 10); // Rough estimation: 10KB per file
        return {
          useWorkers: estimatedFiles > 100, // Use workers for repos with >100 estimated files
          estimatedFiles: estimatedFiles,
          repoSize: repoSize,
          reason: 'size_estimation'
        };
      }
      
      const treeData = await treeResponse.json();
      
      // Count processable files
      const processableFiles = treeData.tree?.filter(item => 
        item.type === 'blob' && 
        ContextPipelineUtils.isProcessableFileForScaling(item.path)
      ) || [];
      
      const fileCount = processableFiles.length;
      const shouldScale = fileCount > 50; // Threshold: 50+ files
      
      console.log(`[${new Date().toISOString()}] 📊 REPOSITORY ANALYSIS: ${fileCount} processable files, size: ${repoSize}KB`);
      console.log(`[${new Date().toISOString()}] 📊 SCALING DECISION: ${shouldScale ? 'USE WORKERS' : 'STANDARD PROCESSING'}`);
      
      return {
        useWorkers: shouldScale,
        estimatedFiles: fileCount,
        repoSize: repoSize,
        reason: shouldScale ? 'file_count_threshold' : 'below_threshold',
        threshold: 50
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error analyzing repository size:`, error.message);
      // Default to standard processing on error
      return { useWorkers: false, estimatedFiles: 'error', reason: 'analysis_error' };
    }
  }

  /**
   * Remove vectors for changed files from Pinecone
   */
  static async removeChangedFilesFromPinecone(changedFiles, namespace, githubOwner, repoName, pineconeClient) {
    if (!pineconeClient) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Cannot remove changed files: Pinecone client not available`);
      return;
    }

    try {
      // Note: Pinecone doesn't support wildcard deletion directly
      // We'll need to query first to find matching vectors, then delete them
      // For now, we'll log this limitation
      console.log(`[${new Date().toISOString()}] 🗑️ CLEANUP: Would remove vectors for ${changedFiles.length} changed files from namespace ${namespace}`);
      console.log(`[${new Date().toISOString()}] 📝 TODO: Implement precise vector deletion for changed files`);
      console.log(`[${new Date().toISOString()}] 💡 Current approach will overwrite existing vectors when new ones are added`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error removing changed files from Pinecone:`, error.message);
    }
  }

  /**
   * Make intelligent processing decision using ChangeAnalyzer
   */
  static async makeSmartProcessingDecision(params, contextPipeline) {
    const {
      userId,
      repoId,
      repoUrl,
      branch,
      githubOwner,
      repoName,
      oldCommitHash,
      newCommitInfo
    } = params;

    console.log(`[${new Date().toISOString()}] 🧠 SMART DECISION: Analyzing changes between ${oldCommitHash.substring(0, 8)} → ${newCommitInfo?.hash?.substring(0, 8) ?? 'unknown'}`);
    
    try {
      // Step 1: Get changed files between commits
      const changedFiles = await contextPipeline.githubOperations.getChangedFilesOptimized(
        repoUrl, branch, githubOwner, repoName, oldCommitHash, newCommitInfo?.hash ?? null
      );
      
      if (changedFiles === 'FULL_RELOAD_REQUIRED') {
        console.log(`[${new Date().toISOString()}] 🔄 CHANGE ANALYSIS FALLBACK: Cannot determine specific changes, defaulting to full processing`);
        return await contextPipeline.processFullRepo({
          userId, repoId, repoUrl, branch, githubOwner, repoName, commitInfo: newCommitInfo
        });
      }

      // Step 2: Get repository characteristics for context
      const repoCharacteristics = await contextPipeline.githubOperations.getRepositoryCharacteristics(githubOwner, repoName, branch);

      // Step 3: Use ChangeAnalyzer to make intelligent decision
      const recommendation = await contextPipeline.changeAnalyzer.analyzeChangesAndRecommendStrategy({
        oldCommitHash,
        newCommitHash: newCommitInfo?.hash,
        changedFiles,
        githubOwner,
        repoName,
        repoCharacteristics
      });

      console.log(`[${new Date().toISOString()}] 📊 ANALYSIS RESULT: ${recommendation.strategy.toUpperCase()} processing recommended`);
      console.log(`[${new Date().toISOString()}] 🎯 CONFIDENCE: ${(recommendation.confidence * 100).toFixed(1)}%`);
      console.log(`[${new Date().toISOString()}] 💭 REASONING: ${recommendation.reasoning}`);

      // Step 4: Execute the recommended strategy
      switch (recommendation.strategy) {
        case 'skip':
          console.log(`[${new Date().toISOString()}] ⏭️ SMART SKIP: Changes don't require processing`);
          contextPipeline.eventManager.emitProcessingSkipped(userId, repoId, recommendation.reasoning, newCommitInfo?.hash ?? null);
          
          return ContextPipelineUtils.createStandardResult({
            success: true,
            mode: 'skipped',
            reason: 'smart_skip',
            message: `Smart analysis determined processing unnecessary: ${recommendation.reasoning}`,
            commitHash: newCommitInfo?.hash ?? null,
            details: {
              analysisRecommendation: recommendation,
              changedFiles,
              oldCommitHash,
              githubOwner,
              repoName
            },
            repoId,
            userId
          });

        case 'incremental':
          console.log(`[${new Date().toISOString()}] 🔄 SMART INCREMENTAL: Processing ${changedFiles.length} changed files`);
          return await contextPipeline.changeAnalyzer.processRepoChanges({
            userId, repoId, repoUrl, branch, githubOwner, repoName,
            oldCommitHash, newCommitInfo, 
            analysisRecommendation: recommendation // Pass recommendation for logging
          }, contextPipeline); // Pass contextPipeline reference

        case 'full':
        default:
          console.log(`[${new Date().toISOString()}] 🔄 SMART FULL: Change analysis indicates full processing needed`);
          return await contextPipeline.processFullRepo({
            userId, repoId, repoUrl, branch, githubOwner, repoName, commitInfo: newCommitInfo,
            analysisRecommendation: recommendation // Pass recommendation for logging
          });
      }

    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ SMART DECISION ERROR:`, error.message);
      
      // Fallback to full processing when analysis fails
      console.log(`[${new Date().toISOString()}] 🛡️ SAFE FALLBACK: Using full processing due to analysis error`);
      return await contextPipeline.processFullRepo({
        userId, repoId, repoUrl, branch, githubOwner, repoName, commitInfo: newCommitInfo
      });
    }
  }
}

module.exports = ContextPipelineUtils;