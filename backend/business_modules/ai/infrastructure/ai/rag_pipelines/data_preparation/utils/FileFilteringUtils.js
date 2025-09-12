// FileFilteringUtils.js
"use strict";

const fs = require('fs');
const path = require('path');

/**
 * Enhanced file filtering utilities for vector database indexing
 * Prevents binary files, executables, and other non-indexable content from being processed
 */
class FileFilteringUtils {
  
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
      '.swo'
    ];
  }

  /**
   * Check if a file should be indexed based on extension and size
   */
  static shouldIndexFile(filePath, fileStats = null) {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).slice(1).toLowerCase();
    const filePathLower = filePath.toLowerCase();
    
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
      '**/*.chunk.js'
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
      
      // Check if content looks like binary
      if (await this.isBinaryContent(source) || this.looksLikeBinaryContent(doc.pageContent)) {
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
