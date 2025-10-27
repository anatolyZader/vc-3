/**
 * FileTypeClassifier - Determines specific GitHub file types
 * Replaces generic 'github-file' with semantic types for better retrieval
 */

class FileTypeClassifier {
  /**
   * Determine specific GitHub file type based on path and content
   * @param {string} filePath - File path
   * @param {string} content - File content (optional)
   * @returns {string} File type classification
   */
  static determineGitHubFileType(filePath, content = '') {
    const path = filePath.toLowerCase();
    const fileName = path.split('/').pop();
    
    // Catalog/data files - JSON files that are data catalogs
    if (path.includes('catalog.json') || 
        path.includes('schema.json') || 
        path.includes('ul_dictionary.json') ||
        path.includes('architecture.json')) {
      return 'github-catalog';
    }
    
    // Test files - check before config since some test files might be in config-like paths
    if (path.includes('/test/') || 
        path.includes('/tests/') || 
        path.includes('/__tests__/') ||
        path.includes('/spec/') ||
        path.startsWith('test/') ||
        path.startsWith('tests/') ||
        path.startsWith('spec/') ||
        path.endsWith('.test.js') ||
        path.endsWith('.test.ts') ||
        path.endsWith('.test.jsx') ||
        path.endsWith('.test.tsx') ||
        path.endsWith('.spec.js') ||
        path.endsWith('.spec.ts') ||
        path.endsWith('.spec.jsx') ||
        path.endsWith('.spec.tsx') ||
        fileName.startsWith('test_') ||
        fileName.startsWith('test-')) {
      return 'github-test';
    }
    
    // Configuration files
    if (fileName === 'package.json' || 
        fileName === 'package-lock.json' ||
        fileName === '.env' ||
        fileName === '.env.example' ||
        fileName === 'tsconfig.json' ||
        fileName === 'jsconfig.json' ||
        fileName === '.eslintrc' ||
        fileName === '.eslintrc.js' ||
        fileName === '.eslintrc.json' ||
        fileName === '.prettierrc' ||
        fileName === 'jest.config.js' ||
        fileName === 'webpack.config.js' ||
        fileName === 'vite.config.js' ||
        path.endsWith('.config.js') ||
        path.endsWith('.config.json') ||
        path.endsWith('.config.ts') ||
        path.endsWith('.yml') ||
        path.endsWith('.yaml') ||
        fileName === 'dockerfile' ||
        fileName === '.dockerignore' ||
        fileName === '.gitignore') {
      return 'github-config';
    }
    
    // Check for config directory (but not if it's a test file)
    if ((path.includes('/config/') || path.startsWith('config/')) && !path.includes('/test/') && !path.startsWith('test/')) {
      return 'github-config';
    }
    
    // Documentation files
    if (path.endsWith('.md') || 
        path.endsWith('.mdx') ||
        path.endsWith('.txt') && path.includes('readme') ||
        fileName === 'readme' ||
        fileName === 'readme.md' ||
        fileName === 'changelog.md' ||
        fileName === 'contributing.md' ||
        fileName === 'license' ||
        fileName === 'license.md' ||
        path.includes('/docs/') ||
        path.includes('/documentation/')) {
      return 'github-docs';
    }
    
    // Default to code for all other files (JS, TS, Python, Java, etc.)
    return 'github-code';
  }

  /**
   * Get human-readable description of file type
   * @param {string} fileType - File type classification
   * @returns {string} Human-readable description
   */
  static getFileTypeDescription(fileType) {
    const descriptions = {
      'github-code': 'Implementation Code',
      'github-docs': 'Documentation',
      'github-test': 'Test File',
      'github-config': 'Configuration',
      'github-catalog': 'Data Catalog'
    };
    
    return descriptions[fileType] || 'GitHub File';
  }

  /**
   * Check if file type should be included in default searches
   * @param {string} fileType - File type classification
   * @returns {boolean} Whether to include in default searches
   */
  static shouldIncludeInDefaultSearch(fileType) {
    // Exclude catalogs and configs by default
    return !['github-catalog', 'github-config'].includes(fileType);
  }

  /**
   * Get priority order for file types (higher = more important)
   * @param {string} fileType - File type classification
   * @returns {number} Priority (1-5)
   */
  static getFileTypePriority(fileType) {
    const priorities = {
      'github-code': 5,      // Highest priority
      'github-docs': 4,
      'github-test': 3,
      'github-config': 2,
      'github-catalog': 1    // Lowest priority
    };
    
    return priorities[fileType] || 3;
  }
}

module.exports = FileTypeClassifier;
