// FileFilteringUtils.js
"use strict";

const fs = require('fs');
const path = require('path');

/**
 * Enhanced file filtering utilities for vector database indexing
 * 
 * 🚨 CRITICAL: This is the SINGLE SOURCE OF TRUTH for all file filtering/exclusion logic 🚨
 * 
 * All other components MUST use methods from this class instead of defining their own patterns:
 * - repoProcessor.js ✅ (now uses getRepositoryIgnorePatterns())
 * - cloudNativeRepoLoader.js ✅ (already uses this class)
 * - analyze_documents.js ✅ (now uses getRepositoryIgnorePatterns())
 * - explore_repository.js ✅ (now uses getRepositoryIgnorePatterns())
 * - Any new loaders/processors MUST use this class
 * 
 * DO NOT CREATE LOCAL ignorePaths ARRAYS - use this centralized filtering!
 * 
 * Purpose: Prevents vector database pollution from debug files, traces, and irrelevant content
 */
class FileFilteringUtils {
  
  /**
   * SINGLE SOURCE OF TRUTH: Complete ignore patterns for repository processing
   * Used by: repoProcessor.js, cloudNativeRepoLoader.js, and other loaders
   */
  static getRepositoryIgnorePatterns() {
    return [
      // Dependencies and modules
      'node_modules/**', 
      '.git/**', 
      'dist/**', 
      'build/**', 
      'coverage/**',
      'temp/**', 
      '*.log', 
      '*.lock', 
      '*.tmp', 
      '.DS_Store', 
      '**/.DS_Store',
      
      // Configuration files that don't help with code understanding
      '.gitignore',
      '.gitattributes',
      '.dockerignore',
      '.eslintignore',
      '.prettierignore',
      
      // Client/frontend code (exclude from backend RAG)
      'client/**', 
      'frontend/**',
      '.github/**', 
      '.vscode/**',
      
      // Helper and documentation files for development
      'copilot_helpers/**',
      '**/copilot_helpers/**',
      
      // Debug and analysis files that cause vector pollution
      'chunking_reports/**', 
      '**/chunking_reports/**',
      'chunking_*/**',  // Added pattern for chunking directories
      '**/chunking_*/**',
      'debug_*.js', 
      '**/debug_*.js', 
      'test_*.js', 
      '**/test_*.js',
      'chunking_*.js',
      '**/chunking_*.js',
      
      // LangSmith trace files that contain hallucinated content
      '**/langsmith/**', 
      '**/langsmith-archive/**',
      'trace-*.md', 
      '**/trace-*.md', 
      '*-trace-analysis*.md', 
      '**/*-trace-analysis*.md',
      'latest-trace-analysis.md',
      
      // Test directories and files - MORE COMPREHENSIVE
      'test/**',
      'tests/**',
      '__tests__/**',
      '_tests_/**',      // Your specific test directory pattern
      'spec/**',
      'specs/**',
      '*.test.js',
      '*.spec.js',
      '*.test.ts',
      '*.spec.ts',
      '**/test/**',      // Any nested test directories
      '**/tests/**',
      '**/__tests__/**', 
      '**/_tests_/**',   // Your nested test directories
      'backend/_tests_/**', // Explicitly exclude your test directory
      
      // Temporary and cache files
      '.nyc_output/**',
      'jest_cache/**',
      '__pycache__/**',
      'pytest_cache/**',
      
      // Large lock and bundle files
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '*.bundle.js',
      '*.min.js',
      '*.min.css',
      
      // Binary and media files
      '*.exe', 
      '*.dll', 
      '*.so', 
      '*.dylib',
      '*.jpg', 
      '*.jpeg', 
      '*.png', 
      '*.gif',
      '*.mp3', 
      '*.mp4', 
      '*.pdf', 
      '*.doc', 
      '*.docx',
      '*.zip', 
      '*.tar', 
      '*.gz'
    ];
  }
  
  /**
   * SINGLE SOURCE OF TRUTH: Root level file exceptions
   * Files that should be included even if they match some ignore patterns
   */
  static getRootLevelFileExceptions() {
    return [
      '*.md',           // Root documentation files
      'ROOT_DOCUMENTATION.md',
      'ARCHITECTURE.md',
      'README.md',
      'CHANGELOG.md'
    ];
  }

  /**
   * MARKDOWN FILE FILTERING RULES
   * Only include specific important documentation files, exclude all analysis/debug/trace .md files
   * 
   * Allowed:
   * - ROOT_DOCUMENTATION.md, README.md (root level)
   * - backend/ARCHITECTURE.md
   * - Module documentation: business_modules/MODULE_NAME/MODULE_NAME.md (e.g., ai.md, chat.md, git.md)
   * 
   * Excluded:
   * - All trace analysis files (trace-PATTERN.md, NAME-trace-analysis.md, latest-trace-analysis.md)
   * - All debug/test files (debug_PATTERN.md, test_PATTERN.md, processing_report_PATTERN.md)
   * - All copilot_helpers/ markdown files
   * - All analysis files in copilot_helpers/analysis/
   * - All other .md files not explicitly allowed
   */
  static shouldIncludeMarkdownFile(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();
    
    // EXCLUDE: LangSmith trace and analysis files
    if (fileName.startsWith('trace-') || 
        fileName.includes('-trace-analysis') || 
        fileName === 'latest-trace-analysis.md' ||
        fileName === 'complete-langsmith-analysis.md' ||
        fileName === 'system-status.md' ||
        normalizedPath.includes('/langsmith/') ||
        normalizedPath.includes('/langsmith-archive/')) {
      return false;
    }
    
    // EXCLUDE: Debug, test, and processing report files
    // CRITICAL: These are internal analysis artifacts, NOT documentation
    if (fileName.startsWith('debug_') || 
        fileName.startsWith('test_') ||
        fileName.startsWith('processing_report_') ||
        fileName.startsWith('forced_method_analysis_') ||
        fileName.startsWith('method_level_analysis_') ||
        fileName.includes('_analysis_') ||  // Catches foo_analysis_bar.md
        fileName.endsWith('_analysis.md') ||  // Catches foo_analysis.md
        fileName.includes('_chunks') ||
        fileName.includes('_trace') ||  // Catches trace files
        fileName.includes('_report') ||  // Catches any report files
        normalizedPath.includes('/_tests_/') ||  // All test directory files
        normalizedPath.includes('/tests/') ||
        normalizedPath.includes('/__tests__/')) {
      console.log(`[FileFilter] EXCLUDED analysis/test file: ${fileName}`);
      return false;
    }
    
    // EXCLUDE: All copilot_helpers directory
    if (normalizedPath.includes('copilot_helpers/')) {
      console.log(`[FileFilter] EXCLUDED copilot_helpers file: ${fileName}`);
      return false;
    }
    
    // INCLUDE: Root level documentation
    if (fileName === 'readme.md' || 
        fileName === 'root_documentation.md' ||
        fileName === 'changelog.md') {
      // Only if truly at root (no slashes before filename except for backend/)
      const pathParts = normalizedPath.split('/');
      const depth = pathParts.length - 1; // Subtract filename
      if (depth === 0 || (depth === 1 && pathParts[0] === 'backend')) {
        return true;
      }
    }
    
    // INCLUDE: backend/ARCHITECTURE.md
    if (fileName === 'architecture.md' && normalizedPath.includes('backend/')) {
      // Must be directly in backend/, not nested
      const archRegex = /backend\/architecture\.md$/i;
      if (archRegex.test(normalizedPath)) {
        return true;
      }
    }
    
    // INCLUDE: Module documentation files (business_modules/*/modulename.md)
    // Pattern: business_modules/MODULE_NAME/MODULE_NAME.md
    // Examples: business_modules/ai/ai.md, business_modules/chat/chat.md, business_modules/git/git.md
    const moduleDocRegex = /business_modules\/([^\/]+)\/\1\.md$/i;
    const match = normalizedPath.match(moduleDocRegex);
    if (match) {
      const moduleName = match[1];
      console.log(`[FILTER] ✅ MARKDOWN: Including module documentation: ${moduleName}.md`);
      return true;
    }
    
    // EXCLUDE: All other .md files
    console.log(`[FILTER] ❌ MARKDOWN: Excluding non-essential documentation: ${filePath}`);
    return false;
  }
  
  /**
   * Comprehensive file extension filtering
   */
  static getIndexableExtensions() {
    return new Set([
      // Source code
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift',
      'kt', 'scala', 'clj', 'cljs', 'hs', 'elm', 'dart', 'lua', 'perl', 'r', 'matlab',
      
      // Web technologies
      'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
      
      // Configuration & data
      'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'config', 'env', 'properties',
      'xml', 'csv', 'tsv',
      
      // Documentation
      'md', 'txt', 'rst', 'adoc', 'org',
      
      // Database & queries
      'sql', 'graphql', 'gql',
      
      // Infrastructure as code
      'dockerfile', 'dockerignore', 'tf', 'hcl',
      
      // Package management
      'package', 'lock', 'requirements', 'pipfile', 'gemfile', 'cargo', 'pubspec',
      
      // Version control & CI/CD
      'gitignore', 'gitattributes', 'editorconfig', 'eslintrc', 'prettierrc',
      
      // Shell scripts (text-based)
      'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd'
    ]);
  }

  /**
   * File patterns to always exclude
   */
  static getExcludePatterns() {
    return [
      // Dependencies
      'node_modules',
      'vendor',
      'bower_components',
      '.pnp',
      
      // Build outputs
      'dist',
      'build',
      'out',
      'target',
      'bin',
      'obj',
      '.next',
      '.nuxt',
      
      // Version control
      '.git',
      '.svn',
      '.hg',
      
      // IDE & editors
      '.vscode',
      '.idea',
      '.DS_Store',
      'Thumbs.db',
      
      // Temporary files
      'temp',
      'tmp',
      'coverage',
      '.nyc_output',
      
      // Test directories and files
      'test',
      'tests', 
      '_tests_',
      '__tests__',
      'spec',
      'specs',
      '__pycache__',
      'pytest_cache',
      'jest_cache',
      
      // Debug and trace files that cause hallucination
      'debug_',
      'test_',
      'trace-',
      'langsmith',
      'langsmith-archive',
      
      // Specific problematic files
      'cloud-sql-proxy',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'composer.lock',
      'Pipfile.lock',
      
      // File extensions to exclude
      '.min.js',
      '.min.css',
      '.bundle.js',
      '.chunk.js',
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.class',
      '.jar',
      '.pyc',
      '.o',
      '.obj',
      '.zip',
      '.tar',
      '.gz',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.mp3',
      '.mp4',
      '.pdf',
      '.doc',
      '.docx',
      '.log',
      '.tmp',
      '.temp',
      '.pid',
      '.swp',
      '.swo',
      
      // Test file patterns
      '.test.js',
      '.spec.js', 
      '.test.ts',
      '.spec.ts',
      '.test.jsx',
      '.spec.jsx',
      '.test.tsx',
      '.spec.tsx',
      '.test.py',
      '.spec.py',
      
      // Debug and trace file patterns that cause vector pollution
      'debug_*.js',
      'test_*.js', 
      'trace-*.md',
      '*-trace-analysis*.md',
      'latest-trace-analysis.md'
    ];
  }

  /**
   * Check if a file should be indexed based on extension and size
   */
  static shouldIndexFile(filePath, fileStats = null) {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).slice(1).toLowerCase();
    const filePathLower = filePath.toLowerCase();
    
    // MARKDOWN FILE FILTERING - Apply strict rules for .md files FIRST
    if (extension === 'md') {
      const shouldInclude = this.shouldIncludeMarkdownFile(filePath);
      if (!shouldInclude) {
        console.log(`[FILTER] ❌ MARKDOWN: Excluded by markdown rules: ${filePath}`);
        return false;
      }
      // If we reach here, markdown file passed the whitelist check
      console.log(`[FILTER] ✅ MARKDOWN: Included essential documentation: ${filePath}`);
      return true;
    }
    
    // File filtering - removed per-file logging for performance    
    // COPILOT HELPERS EXCLUSION - Exclude all helper files from root and backend
    if (filePathLower.includes('copilot_helpers/')) {
      console.log(`[FILTER] ❌ COPILOT HELPERS: Excluded development helper file: ${filePath}`);
      return false;
    }
    
    // CLIENT CODE EXCLUSION - Check for client directories first
    const clientDirectories = ['client/', 'frontend/', 'web/', 'www/', 'static/', 'public/', 'assets/'];
    for (const clientDir of clientDirectories) {
      if (filePathLower.includes(clientDir)) {
        console.log(`[FILTER] ❌ CLIENT EXCLUSION: Excluded client code: ${filePath}`);
        return false;
      }
    }
    
    // CLIENT CODE EXCLUSION - Frontend file types that shouldn't be in backend RAG
    const frontendExtensions = ['html', 'css', 'scss', 'sass', 'less'];
    if (frontendExtensions.includes(extension)) {
      console.log(`[FILTER] ❌ CLIENT EXCLUSION: Excluded frontend file (.${extension}): ${filePath}`);
      return false;
    }
    
    // Check against exclude patterns first
    const excludePatterns = this.getExcludePatterns();
    for (const pattern of excludePatterns) {
      // Handle different pattern types
      if (pattern.startsWith('.') && pattern.length <= 5) {
        // File extension pattern
        if (filePathLower.endsWith(pattern)) {
          console.log(`[FILTER] ❌ Excluded by extension '${pattern}': ${filePath}`);
          return false;
        }
      } else if (pattern.includes('/')) {
        // Path pattern
        if (filePathLower.includes(pattern.toLowerCase())) {
          console.log(`[FILTER] ❌ Excluded by path pattern '${pattern}': ${filePath}`);
          return false;
        }
      } else {
        // Directory or filename pattern
        const pathParts = filePath.split('/');
        if (pathParts.some(part => part.toLowerCase() === pattern.toLowerCase()) || 
            fileName.toLowerCase() === pattern.toLowerCase()) {
          console.log(`[FILTER] ❌ Excluded by pattern '${pattern}': ${filePath}`);
          return false;
        }
      }
    }
    
    // ENHANCED: Specific exclusions for problematic files that cause hallucination
    if (fileName.startsWith('debug_') || fileName.startsWith('test_') || fileName.startsWith('chunking_')) {
      console.log(`[FILTER] ❌ HALLUCINATION PREVENTION: Excluded debug/test/chunking file: ${filePath}`);
      return false;
    }
    
    if (fileName.startsWith('trace-') || fileName.includes('-trace-analysis') || fileName === 'latest-trace-analysis.md') {
      console.log(`[FILTER] ❌ HALLUCINATION PREVENTION: Excluded trace analysis file: ${filePath}`);
      return false;
    }
    
    if (filePathLower.includes('/langsmith/') || filePathLower.includes('/langsmith-archive/')) {
      console.log(`[FILTER] ❌ HALLUCINATION PREVENTION: Excluded LangSmith directory: ${filePath}`);
      return false;
    }
    
    // Skip files without extensions (often binaries) unless known text files
    if (!extension && !this.isKnownTextFileWithoutExtension(fileName)) {
      console.log(`[FILTER] ❌ Skipping file without extension: ${filePath}`);
      return false;
    }
    
    // Check if extension is indexable
    if (extension && !this.getIndexableExtensions().has(extension)) {
      console.log(`[FILTER] ❌ Skipping non-indexable extension .${extension}: ${filePath}`);
      return false;
    }
    
    // Check file size (skip very large files)
    if (fileStats && fileStats.size > 1024 * 1024) { // 1MB limit
      console.log(`[FILTER] ❌ Skipping large file (${Math.round(fileStats.size / 1024)}KB): ${filePath}`);
      return false;
    }
    
    // Check if it's an executable binary
    if (fileStats && this.isExecutableFile(filePath, fileStats)) {
      console.log(`[FILTER] ❌ Skipping executable binary: ${filePath}`);
      return false;
    }
    
    console.log(`[FILTER] ✅ Will index: ${filePath}`);
    return true;
  }

  /**
   * Files without extensions that are typically text-based
   */
  static isKnownTextFileWithoutExtension(fileName) {
    const knownTextFiles = new Set([
      'README', 'LICENSE', 'CHANGELOG', 'CONTRIBUTING', 'AUTHORS', 'COPYING',
      'Dockerfile', 'Makefile', 'Rakefile', 'Gemfile', 'Pipfile', 'Procfile',
      'requirements', 'setup', 'configure', 'install'
    ]);
    
    return knownTextFiles.has(fileName.toUpperCase()) || 
           knownTextFiles.has(fileName);
  }

  /**
   * Check if a file is an executable binary
   */
  static isExecutableFile(filePath, fileStats) {
    // Check if file is executable
    if (!(fileStats.mode & parseInt('111', 8))) {
      return false; // Not executable
    }
    
    // If executable and no extension, likely binary
    const extension = path.extname(filePath);
    if (!extension) {
      return true;
    }
    
    // Known script extensions that are executable but text-based
    const scriptExtensions = new Set(['sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'py', 'rb', 'pl', 'js']);
    const ext = extension.slice(1).toLowerCase();
    
    // If executable with script extension, it's a text script
    if (scriptExtensions.has(ext)) {
      return false;
    }
    
    // Otherwise, if executable with unknown extension, treat as binary
    return true;
  }

  /**
   * Check if file content is binary by examining first few bytes
   */
  static async isBinaryContent(filePath) {
    try {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(512);
      const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
      fs.closeSync(fd);
      
      // Check for null bytes (common in binary files)
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }
      
      // Check for high ratio of non-printable characters
      let nonPrintable = 0;
      for (let i = 0; i < bytesRead; i++) {
        const byte = buffer[i];
        if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
          nonPrintable++;
        }
      }
      
      // If more than 30% non-printable, likely binary
      return (nonPrintable / bytesRead) > 0.3;
      
    } catch (error) {
      console.warn(`[FILTER] Could not read file for binary check: ${filePath}`);
      return false;
    }
  }

  /**
   * Enhanced filtering for LangChain GithubRepoLoader
   */
  static getEnhancedIgnorePatterns() {
    return [
      // Original patterns
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.log',
      '*.lock',
      '*.tmp',
      '.DS_Store',
      'temp/**',
      
      // Enhanced binary/executable exclusions
      '**/cloud-sql-proxy',
      '**/bin/**',
      '**/sbin/**',
      '**/*.exe',
      '**/*.dll',
      '**/*.so',
      '**/*.dylib',
      '**/*.a',
      '**/*.lib',
      '**/*.class',
      '**/*.jar',
      '**/*.war',
      '**/*.ear',
      '**/*.pyc',
      '**/*.pyo',
      '**/*.pyd',
      '**/*.o',
      '**/*.obj',
      
      // Package managers
      '**/node_modules/**',
      '**/vendor/**',
      '**/bower_components/**',
      
      // Archives
      '**/*.zip',
      '**/*.tar',
      '**/*.gz',
      '**/*.bz2',
      '**/*.7z',
      '**/*.rar',
      
      // Media
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.png',
      '**/*.gif',
      '**/*.bmp',
      '**/*.ico',
      '**/*.svg',
      '**/*.mp3',
      '**/*.mp4',
      '**/*.avi',
      '**/*.mov',
      
      // Documents
      '**/*.pdf',
      '**/*.doc',
      '**/*.docx',
      '**/*.xls',
      '**/*.xlsx',
      
      // Large lock files
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
      '**/composer.lock',
      '**/Pipfile.lock',
      
      // Minified files
      '**/*.min.js',
      '**/*.min.css',
      '**/*.bundle.js',
      '**/*.chunk.js',
      
      // CLIENT CODE EXCLUSION - Only exclude actual client/frontend directories, not all subdirs
      'client/**',
      'frontend/**',
      'web/**',
      'www/**',
      'static/**',
      'public/**',
      'assets/**',
      
      // Frontend build outputs
      '.next/**',
      '.nuxt/**',
      'public/build/**',
      
      // Frontend files (HTML/CSS should not be in backend RAG)
      '**/*.html',
      '**/*.css',
      '**/*.scss',
      '**/*.sass',
      '**/*.less',
      
      // Frontend framework files (be more specific - only in actual frontend dirs)
      'client/**/*.js',
      'client/**/*.jsx',
      'frontend/**/*.js',
      'frontend/**/*.jsx',
      'web/**/*.js',
      'web/**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      
      // Frontend entry points (only specific ones, not broad patterns)
      'client/index.js',
      'frontend/index.js',
      'web/index.js'
    ];
  }

  /**
   * Filter documents after loading to remove any that slipped through
   */
  static async filterDocuments(documents) {
    const filtered = [];
    
    for (const doc of documents) {
      const source = doc.metadata?.source;
      if (!source) {
        console.log(`[FILTER] ❌ Document without source, skipping`);
        continue;
      }
      
      // Only check content for binary patterns (source might be virtual GitHub path)
      if (this.looksLikeBinaryContent(doc.pageContent)) {
        console.log(`[FILTER] ❌ Binary content detected, skipping: ${source}`);
        continue;
      }
      
      // Check file size in content
      if (doc.pageContent.length > 100000) { // 100KB content limit
        console.log(`[FILTER] ❌ Content too large (${doc.pageContent.length} chars), skipping: ${source}`);
        continue;
      }
      
      filtered.push(doc);
    }
    
    console.log(`[FILTER] ✅ Filtered ${documents.length} → ${filtered.length} documents`);
    return filtered;
  }

  /**
   * Quick check if content looks like binary data
   */
  static looksLikeBinaryContent(content) {
    if (!content || typeof content !== 'string') {
      return true;
    }
    
    // Check for excessive non-printable characters
    const nonPrintableCount = (content.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g) || []).length;
    const ratio = nonPrintableCount / content.length;
    
    // If more than 10% non-printable, likely binary
    if (ratio > 0.1) {
      return true;
    }
    
    // Check for patterns common in binary files
    const binaryPatterns = [
      /\x00{4,}/, // Multiple null bytes
      /[\x80-\xFF]{20,}/, // Extended ASCII sequences
      /ELF/, // ELF header
      /%PDF/, // PDF header
      /\x7FELF/, // ELF magic number
      /\x89PNG/, // PNG header
    ];
    
    return binaryPatterns.some(pattern => pattern.test(content));
  }
}

module.exports = FileFilteringUtils;
