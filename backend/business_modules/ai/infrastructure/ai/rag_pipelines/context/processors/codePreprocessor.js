/**
 * CodePreprocessor - Advanced preprocessing for code files before RAG pipeline
 * Handles syntax cleaning, comment enhancement, and structural normalization
 */
class CodePreprocessor {
  constructor() {
    this.supportedLanguages = new Set([
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'
    ]);
  }

  /**
   * Main preprocessing entry point for code files
   */
  async preprocessCodeFile(content, filePath, metadata = {}, options = {}) {
    const fileExtension = this.getFileExtension(filePath);
    
    // 1. Normalize line endings and encoding
    let processedContent = this.normalizeContent(content);
    
    // 2. Handle imports strategically (your key insight!)
    const { contentWithoutImports, extractedImports } = this.separateImportsFromContent(processedContent, fileExtension);
    
    // Choose content based on options
    if (options.excludeImportsFromChunking !== false) { // Default: exclude imports
      console.log(`[${new Date().toISOString()}] 🗂️ IMPORT HANDLING: Excluding ${extractedImports.length} imports from chunking`);
      processedContent = contentWithoutImports;
    } else {
      console.log(`[${new Date().toISOString()}] 🗂️ IMPORT HANDLING: Including imports in content`);
      // Keep original content but still process it
    }
    
    // 3. Remove or enhance comments based on context
    processedContent = this.processComments(processedContent, fileExtension);
    
    // 4. Normalize whitespace and indentation
    processedContent = this.normalizeWhitespace(processedContent, fileExtension);
    
    // 5. Extract structural information (safe alternative to code markers)
    const structuralInfo = this.extractStructuralInfo(processedContent, fileExtension);
    
    // 6. Add structural markers ONLY if explicitly requested (unsafe for code execution)
    if (options.addStructuralMarkers === true) {
      console.warn(`[${new Date().toISOString()}] ⚠️ WARNING: Adding structural markers to code content - unsafe for execution/testing`);
      processedContent = this.addStructuralMarkers(processedContent, fileExtension);
    }
    
    // 7. Extract and enhance metadata
    const enhancedMetadata = await this.extractCodeMetadata(processedContent, filePath, metadata, extractedImports);
    
    return {
      content: processedContent,
      metadata: enhancedMetadata,
      structuralInfo, // Safe structural information without code modification
      extractedImports, // Available for context if needed
      preprocessingApplied: {
        normalization: true,
        importSeparation: true,
        commentProcessing: true,
        structuralAnalysis: true,
        structuralMarkers: options.addStructuralMarkers === true,
        metadataExtraction: true
      }
    };
  }

  /**
   * NEW: Separate imports from actual content to avoid noise chunks
   * This solves the "chunks with just imports and blank lines" problem
   */
  separateImportsFromContent(content, fileExtension) {
    const lines = content.split('\n');
    const imports = [];
    const contentLines = [];
    let foundFirstNonImport = false;
    let importSection = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip initial blank lines and comments before imports
      if (!foundFirstNonImport && (trimmed === '' || this.isComment(trimmed, fileExtension))) {
        continue; // Skip leading whitespace/comments
      }

      // Check if this line is an import
      if (this.isImportStatement(trimmed, fileExtension)) {
        imports.push(line);
        foundFirstNonImport = true;
        continue;
      }

      // Check if we're still in the import section (blank lines between imports are ok)
      if (importSection && trimmed === '') {
        // Only skip blank lines if we haven't hit content yet
        const nextNonEmptyLine = this.findNextNonEmptyLine(lines, i);
        if (nextNonEmptyLine && this.isImportStatement(nextNonEmptyLine.trim(), fileExtension)) {
          continue; // Skip blank line between imports
        }
      }

      // We've hit actual content - no more import section
      importSection = false;
      foundFirstNonImport = true;
      contentLines.push(line);
    }

    return {
      contentWithoutImports: contentLines.join('\n').trim(),
      extractedImports: imports
    };
  }

  /**
   * Helper: Check if line is a comment
   */
  isComment(line, fileExtension) {
    const commentPatterns = {
      'js': /^\s*(\/\/|\/\*|\*)/,
      'jsx': /^\s*(\/\/|\/\*|\*)/,
      'ts': /^\s*(\/\/|\/\*|\*)/,
      'tsx': /^\s*(\/\/|\/\*|\*)/,
      'py': /^\s*#/,
      'java': /^\s*(\/\/|\/\*|\*)/,
      'cpp': /^\s*(\/\/|\/\*|\*)/,
      'c': /^\s*(\/\/|\/\*|\*)/,
      'cs': /^\s*(\/\/|\/\*|\*)/
    };

    return commentPatterns[fileExtension]?.test(line) || false;
  }

  /**
   * Helper: Find next non-empty line for import detection
   */
  findNextNonEmptyLine(lines, startIndex) {
    for (let i = startIndex + 1; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed !== '') {
        return trimmed;
      }
    }
    return null;
  }

  /**
   * 1. Content Normalization
   */
  normalizeContent(content) {
    return content
      // Normalize line endings to \n
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize Unicode
      .normalize('NFC');
  }

  /**
   * 2. Comment Processing - Keep meaningful ones, remove noise
   */
  processComments(content, fileExtension) {
    switch (fileExtension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return this.processJavaScriptComments(content);
      case 'py':
        return this.processPythonComments(content);
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
        return this.processCStyleComments(content);
      default:
        return content;
    }
  }

  processJavaScriptComments(content) {
    const lines = content.split('\n');
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Keep JSDoc comments - they're valuable
      if (trimmed.startsWith('/**') || trimmed.includes('* @')) {
        processedLines.push(line);
        continue;
      }

      // Keep substantial comments (>20 chars of actual content)
      if (trimmed.startsWith('//')) {
        const commentContent = trimmed.substring(2).trim();
        if (commentContent.length > 20 && !this.isBoilerplateComment(commentContent)) {
          processedLines.push(`// ${commentContent}`);
          continue;
        }
        // Skip short/boilerplate comments
        continue;
      }

      // Keep multi-line comments if substantial
      if (trimmed.startsWith('/*') && !trimmed.startsWith('/**')) {
        const commentContent = trimmed.replace(/\/\*|\*\//g, '').trim();
        if (commentContent.length > 30) {
          processedLines.push(line);
          continue;
        }
        // Skip short comments
        continue;
      }

      processedLines.push(line);
    }

    return processedLines.join('\n');
  }

  processPythonComments(content) {
    const lines = content.split('\n');
    const processedLines = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep docstrings - they're valuable
      if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
        processedLines.push(line);
        continue;
      }

      // Keep substantial comments
      if (trimmed.startsWith('#')) {
        const commentContent = trimmed.substring(1).trim();
        if (commentContent.length > 15 && !this.isBoilerplateComment(commentContent)) {
          processedLines.push(`# ${commentContent}`);
          continue;
        }
        continue;
      }

      processedLines.push(line);
    }

    return processedLines.join('\n');
  }

  processCStyleComments(content) {
    // Similar to JavaScript but with C/Java specific patterns
    return this.processJavaScriptComments(content);
  }

  isBoilerplateComment(comment) {
    const boilerplatePatterns = [
      /^todo:?\s*$/i,
      /^fixme:?\s*$/i,
      /^hack:?\s*$/i,
      /^xxx:?\s*$/i,
      /^end of/i,
      /^debug$/i,
      /^console\.log/i,
      /^=+$/,
      /^-+$/,
      /^\*+$/
    ];

    return boilerplatePatterns.some(pattern => pattern.test(comment));
  }

  /**
   * 3. Whitespace Normalization
   */
  normalizeWhitespace(content, fileExtension) {
    const lines = content.split('\n');
    const processedLines = [];

    for (const line of lines) {
      // Remove trailing whitespace
      let processedLine = line.replace(/\s+$/, '');
      
      // Normalize indentation for better chunking
      if (processedLine.trim()) {
        // Convert tabs to spaces for consistency
        processedLine = processedLine.replace(/\t/g, '  ');
        processedLines.push(processedLine);
      } else {
        // Keep empty lines but normalize them
        processedLines.push('');
      }
    }

    // Remove excessive empty lines (more than 2 consecutive)
    const finalLines = [];
    let emptyLineCount = 0;

    for (const line of processedLines) {
      if (line.trim() === '') {
        emptyLineCount++;
        if (emptyLineCount <= 2) {
          finalLines.push(line);
        }
      } else {
        emptyLineCount = 0;
        finalLines.push(line);
      }
    }

    return finalLines.join('\n');
  }

  /**
   * Extract Structural Information (Safe alternative to markers)
   * Returns metadata about code structure without modifying content
   */
  extractStructuralInfo(content, fileExtension) {
    if (!this.supportedLanguages.has(fileExtension)) {
      return { classes: [], functions: [], imports: [], totalLines: content.split('\n').length };
    }

    const lines = content.split('\n');
    const structuralInfo = {
      classes: [],
      functions: [],
      imports: [],
      totalLines: lines.length,
      complexity: 'low' // Will be computed based on structure count
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (this.isClassDeclaration(trimmed, fileExtension)) {
        structuralInfo.classes.push({ 
          line: i + 1, 
          declaration: trimmed.substring(0, 100) // Limit length
        });
      } else if (this.isFunctionDeclaration(trimmed, fileExtension)) {
        structuralInfo.functions.push({ 
          line: i + 1, 
          declaration: trimmed.substring(0, 100)
        });
      } else if (this.isImportStatement(trimmed, fileExtension)) {
        structuralInfo.imports.push({ 
          line: i + 1, 
          statement: trimmed.substring(0, 100)
        });
      }
    }

    // Compute complexity based on structure density
    const totalStructures = structuralInfo.classes.length + structuralInfo.functions.length;
    const density = totalStructures / lines.length;
    if (density > 0.1) structuralInfo.complexity = 'high';
    else if (density > 0.05) structuralInfo.complexity = 'medium';

    return structuralInfo;
  }

  /**
   * 4. Add Structural Markers for Better Chunking (DEPRECATED - Unsafe for execution)
   * Returns an object with both the original content and structural metadata
   */
  addStructuralMarkers(content, fileExtension) {
    if (!this.supportedLanguages.has(fileExtension)) {
      return content;
    }

    // Extract structural information without modifying the code
    const lines = content.split('\n');
    const structuralInfo = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Record structural elements with line numbers
      if (this.isClassDeclaration(trimmed, fileExtension)) {
        structuralInfo.push({ type: 'class', line: i + 1, content: trimmed });
      } else if (this.isFunctionDeclaration(trimmed, fileExtension)) {
        structuralInfo.push({ type: 'function', line: i + 1, content: trimmed });
      } else if (this.isImportStatement(trimmed, fileExtension)) {
        structuralInfo.push({ type: 'import', line: i + 1, content: trimmed });
      }
    }

    // DEPRECATED: Adding markers directly to code is unsafe for execution
    // Return original content with structural metadata as comments at the top
    if (structuralInfo.length > 0) {
      const structuralComments = structuralInfo.map(info => 
        `// [STRUCTURE] Line ${info.line}: ${info.type.toUpperCase()} - ${info.content.substring(0, 50)}${info.content.length > 50 ? '...' : ''}`
      ).join('\n');
      
      return `${structuralComments}\n// [END STRUCTURE INFO]\n\n${content}`;
    }

    return content;
  }

  isClassDeclaration(line, ext) {
    const patterns = {
      'js': /^(export\s+)?(default\s+)?class\s+/,
      'jsx': /^(export\s+)?(default\s+)?class\s+/,
      'ts': /^(export\s+)?(default\s+)?class\s+/,
      'tsx': /^(export\s+)?(default\s+)?class\s+/,
      'py': /^class\s+/,
      'java': /^(public\s+|private\s+|protected\s+)?(static\s+)?(final\s+)?class\s+/,
      'cpp': /^(class|struct)\s+/,
      'c': /^(typedef\s+)?struct\s+/,
      'cs': /^(public\s+|private\s+|internal\s+)?(static\s+)?(sealed\s+)?class\s+/
    };

    return patterns[ext]?.test(line) || false;
  }

  isFunctionDeclaration(line, ext) {
    const patterns = {
      'js': /^(export\s+)?(async\s+)?function\s+|^(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
      'jsx': /^(export\s+)?(async\s+)?function\s+|^(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
      'ts': /^(export\s+)?(async\s+)?function\s+|^(const|let|var)\s+\w+\s*:\s*\(.*\)\s*=>/,
      'tsx': /^(export\s+)?(async\s+)?function\s+|^(const|let|var)\s+\w+\s*:\s*\(.*\)\s*=>/,
      'py': /^(async\s+)?def\s+/,
      'java': /^(public\s+|private\s+|protected\s+)?(static\s+)?\w+\s+\w+\s*\(/,
      'cpp': /^\w+\s+\w+\s*\(|^(virtual\s+|static\s+|inline\s+)*\w+\s+\w+\s*\(/,
      'c': /^\w+\s+\w+\s*\(/,
      'cs': /^(public\s+|private\s+|protected\s+)?(static\s+|virtual\s+|override\s+)?\w+\s+\w+\s*\(/
    };

    return patterns[ext]?.test(line) || false;
  }

  isImportStatement(line, ext) {
    const patterns = {
      'js': /^import\s+|^const\s+.*=\s*require\(|^require\(/,
      'jsx': /^import\s+|^const\s+.*=\s*require\(|^require\(/,
      'ts': /^import\s+|^const\s+.*=\s*require\(|^require\(/,
      'tsx': /^import\s+|^const\s+.*=\s*require\(|^require\(/,
      'py': /^import\s+|^from\s+.*import/,
      'java': /^import\s+/,
      'cpp': /^#include\s*[<"]/,
      'c': /^#include\s*[<"]/,
      'cs': /^using\s+/
    };

    return patterns[ext]?.test(line) || false;
  }

  /**
   * 5. Extract Enhanced Metadata (now uses separated imports)
   */
  async extractCodeMetadata(content, filePath, baseMetadata, extractedImports = []) {
    const fileExtension = this.getFileExtension(filePath);
    const fileName = filePath.split('/').pop();
    
    // Basic metrics
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim()).length;
    const complexity = this.calculateCyclomaticComplexity(content, fileExtension);
    
    // Extract structural elements from content (not imports)
    const functions = this.extractFunctionNames(content, fileExtension);
    const classes = this.extractClassNames(content, fileExtension);
    
    // Use extracted imports instead of parsing them again
    const importPaths = extractedImports.map(imp => this.parseImportPath(imp, fileExtension)).filter(Boolean);
    
    return {
      ...baseMetadata,
      // File info
      file_name: fileName,
      file_extension: fileExtension,
      file_type: 'code',
      language: fileExtension,
      
      // Content metrics (without imports!)
      total_lines: lines.length,
      code_lines: nonEmptyLines,
      cyclomatic_complexity: complexity,
      
      // Structural elements
      imports_count: extractedImports.length,
      functions_count: functions.length,
      classes_count: classes.length,
      
      // For better retrieval
      main_entities: [...classes, ...functions].slice(0, 10),
      import_dependencies: importPaths.slice(0, 20),
      
      // Import handling info
      imports_excluded_from_chunking: true,
      import_lines: extractedImports, // Keep for context if needed
      
      // Processing info
      preprocessed: true,
      preprocessing_version: '1.0',
      preprocessed_at: new Date().toISOString()
    };
  }

  /**
   * Helper: Parse import path from import statement
   */
  parseImportPath(importStatement, fileExtension) {
    const trimmed = importStatement.trim();
    
    switch (fileExtension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        // import ... from 'path' or require('path')
        const fromMatch = trimmed.match(/from\s+['"]([^'"]+)['"]/);
        const requireMatch = trimmed.match(/require\(['"]([^'"]+)['"]\)/);
        return fromMatch?.[1] || requireMatch?.[1];
        
      case 'py':
        // import module or from module import ...
        const importMatch = trimmed.match(/^import\s+([^\s;]+)/);
        const fromImportMatch = trimmed.match(/^from\s+([^\s]+)\s+import/);
        return fromImportMatch?.[1] || importMatch?.[1];
        
      default:
        return null;
    }
  }

  calculateCyclomaticComplexity(content, ext) {
    // Simple complexity estimation based on control flow keywords
    const keywords = {
      'js': ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'],
      'jsx': ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'],
      'ts': ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'],
      'tsx': ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||'],
      'py': ['if', 'elif', 'else', 'while', 'for', 'except', 'and', 'or'],
      'java': ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||']
    };

    const keywordSet = keywords[ext] || keywords['js'];
    let complexity = 1; // Base complexity

    for (const keyword of keywordSet) {
      // Escape special regex characters
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'g');
      const matches = content.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    // Special case for ternary operator (which can't use word boundaries)
    const ternaryMatches = content.match(/\?/g);
    if (ternaryMatches) {
      complexity += ternaryMatches.length;
    }

    return Math.min(complexity, 50); // Cap at 50 for sanity
  }

  extractImports(content, ext) {
    const imports = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (ext === 'js' || ext === 'ts') {
        const importMatch = trimmed.match(/^import\s+.*from\s+['"]([^'"]+)['"]/);
        const requireMatch = trimmed.match(/require\(['"]([^'"]+)['"]\)/);
        
        if (importMatch) imports.push(importMatch[1]);
        if (requireMatch) imports.push(requireMatch[1]);
      } else if (ext === 'py') {
        const importMatch = trimmed.match(/^import\s+([^\s;]+)/);
        const fromMatch = trimmed.match(/^from\s+([^\s]+)\s+import/);
        
        if (importMatch) imports.push(importMatch[1]);
        if (fromMatch) imports.push(fromMatch[1]);
      }
    }

    return imports;
  }

  extractFunctionNames(content, ext) {
    const functions = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (ext === 'js' || ext === 'ts') {
        const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
        const arrowMatch = trimmed.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/);
        
        if (funcMatch) functions.push(funcMatch[1]);
        if (arrowMatch) functions.push(arrowMatch[1]);
      } else if (ext === 'py') {
        const defMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/);
        if (defMatch) functions.push(defMatch[1]);
      }
    }

    return functions;
  }

  extractClassNames(content, ext) {
    const classes = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (ext === 'js' || ext === 'ts') {
        const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?class\s+(\w+)/);
        if (classMatch) classes.push(classMatch[1]);
      } else if (ext === 'py') {
        const classMatch = trimmed.match(/^class\s+(\w+)/);
        if (classMatch) classes.push(classMatch[1]);
      }
    }

    return classes;
  }

  getFileExtension(filePath) {
    return filePath.split('.').pop()?.toLowerCase() || '';
  }
}

module.exports = CodePreprocessor;
