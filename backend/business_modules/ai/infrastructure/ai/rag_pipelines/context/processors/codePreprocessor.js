/**
 * CodePreprocessor - Advanced preprocessing for code files before RAG pipeline
 * Handles syntax cleaning, comment enhancement, and structural normalization
 * Updated: 2025-10-11 - Enhanced for better RAG pipeline integration
 */
"use strict";

class CodePreprocessor {
  constructor(options = {}) {
    this.supportedLanguages = new Set([
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt'
    ]);
    
    this.options = {
      // Default preprocessing options
      excludeImportsFromChunking: true,
      preserveDocComments: true,
      normalizeWhitespace: true,
      extractStructuralInfo: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      preserveWarnLogs: false,
      maxComplexity: 50,
      minCommentLength: 15,
      ...options
    };
  }

  /**
   * Main preprocessing entry point for code files
   * Enhanced for RAG pipeline integration with document format compatibility
   */
  async preprocessCodeDocument(document, options = {}) {
    if (!document?.pageContent) {
      throw new Error('Document must have pageContent property');
    }

    const filePath = document.metadata?.source || 'unknown.txt';
    const fileExtension = this.getFileExtension(filePath);
    
    // Merge options with defaults
    const processingOptions = { ...this.options, ...options };
    
    console.log(`[${new Date().toISOString()}] 🔧 Starting code preprocessing for: ${filePath}`);
    
    try {
      // Step 1: Normalize line endings and encoding
      let processedContent = this.normalizeContent(document.pageContent);
      console.log(`[${new Date().toISOString()}] ✅ Content normalized`);
      
      // Step 2: Strip markdown artifacts if present
      processedContent = this.stripMarkdownArtifacts(processedContent);
      console.log(`[${new Date().toISOString()}] ✅ Markdown artifacts stripped`);
      
      // Step 3: Handle imports strategically
      const { contentWithoutImports, extractedImports } = this.separateImportsFromContent(processedContent, fileExtension);
      
      if (processingOptions.excludeImportsFromChunking) {
        console.log(`[${new Date().toISOString()}] 🗂️ Excluded ${extractedImports.length} imports from chunking`);
        processedContent = contentWithoutImports;
      } else {
        console.log(`[${new Date().toISOString()}] 🗂️ Keeping imports in content for chunking`);
      }
      
      // Step 4: Process comments (remove noise, keep valuable ones)
      processedContent = this.processComments(processedContent, fileExtension, processingOptions);
      console.log(`[${new Date().toISOString()}] ✅ Comments processed`);
      
      // Step 5: Remove boilerplate code
      processedContent = this.removeBoilerplate(processedContent, fileExtension);
      console.log(`[${new Date().toISOString()}] ✅ Boilerplate removed`);
      
      // Step 6: Remove log statements (console.log, print, etc.)
      processedContent = this.removeLogStatements(processedContent, fileExtension, processingOptions);
      console.log(`[${new Date().toISOString()}] ✅ Log statements removed`);
      
      // Step 7: Normalize whitespace and indentation
      processedContent = this.normalizeWhitespace(processedContent, fileExtension);
      console.log(`[${new Date().toISOString()}] ✅ Whitespace normalized`);
      
      // Step 8: Add structural markers (DEPRECATED - unsafe for execution)
      if (processingOptions.addStructuralMarkers) {
        console.warn(`[${new Date().toISOString()}] WARNING: Adding structural markers to code content - unsafe for execution/testing`);
        processedContent = this.addStructuralMarkers(processedContent, fileExtension);
        console.log(`[${new Date().toISOString()}] ⚠️ Structural markers added (DEPRECATED)`);
      }
      
      // Step 9: Extract structural information
      const structuralInfo = processingOptions.extractStructuralInfo 
        ? this.extractStructuralInfo(processedContent, fileExtension)
        : null;
      
      // Step 10: Extract and enhance metadata
      const enhancedMetadata = await this.extractCodeMetadata(
        processedContent, 
        filePath, 
        document.metadata || {}, 
        extractedImports
      );
      
      console.log(`[${new Date().toISOString()}] 🎉 Code preprocessing completed successfully`);
      
      return {
        ...document,
        pageContent: processedContent,
        metadata: {
          ...enhancedMetadata,
          preprocessing_applied: {
            normalization: true,
            markdownStripping: true,
            importSeparation: processingOptions.excludeImportsFromChunking,
            commentProcessing: true,
            boilerplateRemoval: true,
            logStatementRemoval: true,
            whitespaceNormalization: true,
            structuralMarkers: !!processingOptions.addStructuralMarkers,
            structuralAnalysis: !!structuralInfo,
            metadataExtraction: true,
            preprocessor_version: '2.0',
            preprocessed_at: new Date().toISOString()
          },
          structural_info: structuralInfo,
          extracted_imports: extractedImports
        }
      };
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Code preprocessing failed:`, error);
      // Return original document with error metadata
      return {
        ...document,
        metadata: {
          ...document.metadata,
          preprocessing_error: error.message,
          preprocessing_failed_at: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async preprocessCodeFile(content, filePath, metadata = {}, options = {}) {
    const document = {
      pageContent: content,
      metadata: { ...metadata, source: filePath }
    };
    
    const result = await this.preprocessCodeDocument(document, options);
    
    return {
      content: result.pageContent,
      metadata: result.metadata,
      structuralInfo: result.metadata.structural_info,
      extractedImports: result.metadata.extracted_imports,
      preprocessingApplied: result.metadata.preprocessing_applied
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
   * 6. Remove Log Statements
   * Comprehensive removal of logging statements across different languages
   */
  removeLogStatements(content, fileExtension, options = {}) {
    const preserveErrorLogs = options.preserveErrorLogs !== false;
    const preserveWarnLogs = options.preserveWarnLogs !== false;
    
    console.log(`[${new Date().toISOString()}] 🧹 Removing log statements for ${fileExtension} files`);
    
    switch (fileExtension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return this.removeJavaScriptLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'py':
        return this.removePythonLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'java':
        return this.removeJavaLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'cs':
        return this.removeCSharpLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'php':
        return this.removePHPLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'rb':
        return this.removeRubyLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'go':
        return this.removeGoLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'rs':
        return this.removeRustLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'swift':
        return this.removeSwiftLogs(content, { preserveErrorLogs, preserveWarnLogs });
      case 'kt':
        return this.removeKotlinLogs(content, { preserveErrorLogs, preserveWarnLogs });
      default:
        return content;
    }
  }

  removeJavaScriptLogs(content, options = {}) {
    const { preserveErrorLogs = true, preserveWarnLogs = true } = options;
    let removedCount = 0;

    // Define console methods to remove
    const methodsToRemove = [
      'log', 'info', 'debug', 'trace', 'table', 'time', 'timeEnd', 
      'count', 'group', 'groupEnd', 'groupCollapsed'
    ];
    
    // Add conditional methods
    if (!preserveWarnLogs) methodsToRemove.push('warn');
    if (!preserveErrorLogs) methodsToRemove.push('error');

    const lines = content.split('\n');
    const resultLines = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check if this line starts a console statement we want to remove
      const consoleMatch = this.findConsoleStatementStart(trimmedLine, methodsToRemove);
      
      if (consoleMatch) {
        // Find the complete console statement across multiple lines
        const statementResult = this.extractCompleteStatement(lines, i, consoleMatch.method);
        
        if (statementResult.success) {
          // Skip all lines that are part of this console statement
          removedCount++;
          i = statementResult.endLineIndex + 1;
          continue;
        }
      }
      
      // Keep this line
      resultLines.push(line);
      i++;
    }

    let processedContent = resultLines.join('\n');

    // Remove debugger statements
    const debuggerMatches = processedContent.match(/debugger\s*;?/g);
    if (debuggerMatches) {
      removedCount += debuggerMatches.length;
      processedContent = processedContent.replace(/debugger\s*;?/g, '');
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} JavaScript log statements`);
    }

    return processedContent;
  }

  /**
   * Find if a line starts a console statement we want to remove
   * Returns { method, startPos } if found, null otherwise
   */
  findConsoleStatementStart(line, methodsToRemove) {
    for (const method of methodsToRemove) {
      const pattern = new RegExp(`\\bconsole\\.${method}\\s*\\(`, 'i');
      const match = line.match(pattern);
      if (match) {
        return {
          method: method,
          startPos: match.index
        };
      }
    }
    return null;
  }

  /**
   * Extract complete console statement across multiple lines
   * Properly handles nested parentheses, template literals, etc.
   */
  extractCompleteStatement(lines, startLineIndex, method) {
    let currentLine = startLineIndex;
    let content = lines[currentLine];
    
    // Find the console.method( part
    const consoleRegex = new RegExp(`\\bconsole\\.${method}\\s*\\(`, 'i');
    const match = content.match(consoleRegex);
    if (!match) {
      return { success: false };
    }

    // Start counting parentheses after the opening parenthesis
    let parenCount = 0;
    let inString = false;
    let stringChar = null;
    let escaped = false;
    let inTemplateString = false;
    let templateBraceCount = 0;
    
    // Find the opening parenthesis position
    const openParenPos = match.index + match[0].length - 1;
    
    // Start from the character after the opening parenthesis
    let charIndex = openParenPos + 1;
    
    while (currentLine < lines.length) {
      const line = lines[currentLine];
      
      // Process characters from current position
      for (let i = (currentLine === startLineIndex ? charIndex : 0); i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i - 1] : '';
        
        if (escaped) {
          escaped = false;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          continue;
        }
        
        // Handle template literals
        if (char === '`') {
          if (!inString) {
            inTemplateString = !inTemplateString;
          }
          continue;
        }
        
        if (inTemplateString) {
          if (char === '{' && prevChar === '$') {
            templateBraceCount++;
          } else if (char === '}' && templateBraceCount > 0) {
            templateBraceCount--;
          }
          continue;
        }
        
        // Handle regular strings
        if ((char === '"' || char === "'") && !inTemplateString) {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
            stringChar = null;
          }
          continue;
        }
        
        if (inString) {
          continue;
        }
        
        // Count parentheses outside of strings
        if (char === '(') {
          parenCount++;
        } else if (char === ')') {
          if (parenCount === 0) {
            // This is the closing parenthesis of the console statement
            return {
              success: true,
              endLineIndex: currentLine,
              endCharIndex: i
            };
          }
          parenCount--;
        }
      }
      
      currentLine++;
      charIndex = 0; // Reset for next line
    }
    
    // If we reach here, the statement wasn't properly closed
    return { success: false };
  }

  removePythonLogs(content, options = {}) {
    const { preserveErrorLogs = true, preserveWarnLogs = true } = options;
    let processedContent = content;
    let removedCount = 0;

    // Remove print statements (basic logging)
    const printMatches = processedContent.match(/print\s*\([^)]*\)/g);
    if (printMatches) {
      removedCount += printMatches.length;
      processedContent = processedContent.replace(/print\s*\([^)]*\)/g, '');
    }

    // Remove logging module calls
    const loggingPatterns = [
      /logging\.debug\s*\([^)]*\)/g,
      /logging\.info\s*\([^)]*\)/g,
      /logger\.debug\s*\([^)]*\)/g,
      /logger\.info\s*\([^)]*\)/g
    ];

    for (const pattern of loggingPatterns) {
      const matches = processedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        processedContent = processedContent.replace(pattern, '');
      }
    }

    // Conditionally remove warnings
    if (!preserveWarnLogs) {
      const warnPatterns = [/logging\.warning\s*\([^)]*\)/g, /logger\.warning\s*\([^)]*\)/g];
      for (const pattern of warnPatterns) {
        const matches = processedContent.match(pattern);
        if (matches) {
          removedCount += matches.length;
          processedContent = processedContent.replace(pattern, '');
        }
      }
    }

    // Conditionally remove errors
    if (!preserveErrorLogs) {
      const errorPatterns = [/logging\.error\s*\([^)]*\)/g, /logger\.error\s*\([^)]*\)/g];
      for (const pattern of errorPatterns) {
        const matches = processedContent.match(pattern);
        if (matches) {
          removedCount += matches.length;
          processedContent = processedContent.replace(pattern, '');
        }
      }
    }

    // Remove pdb debugging
    const pdbMatches = processedContent.match(/pdb\.set_trace\(\)/g);
    if (pdbMatches) {
      removedCount += pdbMatches.length;
      processedContent = processedContent.replace(/pdb\.set_trace\(\)/g, '');
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} Python log statements`);
    }

    return processedContent;
  }

  removeJavaLogs(content, options = {}) {
    const { preserveErrorLogs = true, preserveWarnLogs = true } = options;
    let processedContent = content;
    let removedCount = 0;

    // Remove System.out.print statements
    const systemOutMatches = processedContent.match(/System\.out\.print(ln)?\s*\([^)]*\)\s*;?/g);
    if (systemOutMatches) {
      removedCount += systemOutMatches.length;
      processedContent = processedContent.replace(/System\.out\.print(ln)?\s*\([^)]*\)\s*;?/g, '');
    }

    // Remove logger statements
    const loggerPatterns = [
      /logger\.debug\s*\([^)]*\)\s*;?/g,
      /logger\.info\s*\([^)]*\)\s*;?/g,
      /log\.debug\s*\([^)]*\)\s*;?/g,
      /log\.info\s*\([^)]*\)\s*;?/g
    ];

    for (const pattern of loggerPatterns) {
      const matches = processedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        processedContent = processedContent.replace(pattern, '');
      }
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} Java log statements`);
    }

    return processedContent;
  }

  removeCSharpLogs(content, options = {}) {
    const { preserveErrorLogs = true, preserveWarnLogs = true } = options;
    let processedContent = content;
    let removedCount = 0;

    // Remove Console.WriteLine statements
    const consoleMatches = processedContent.match(/Console\.Write(Line)?\s*\([^)]*\)\s*;?/g);
    if (consoleMatches) {
      removedCount += consoleMatches.length;
      processedContent = processedContent.replace(/Console\.Write(Line)?\s*\([^)]*\)\s*;?/g, '');
    }

    // Remove Debug.WriteLine statements
    const debugMatches = processedContent.match(/Debug\.WriteLine\s*\([^)]*\)\s*;?/g);
    if (debugMatches) {
      removedCount += debugMatches.length;
      processedContent = processedContent.replace(/Debug\.WriteLine\s*\([^)]*\)\s*;?/g, '');
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} C# log statements`);
    }

    return processedContent;
  }

  removePHPLogs(content, options = {}) {
    let processedContent = content;
    let removedCount = 0;

    // Remove echo and print statements that look like debugging
    const patterns = [
      /echo\s+['"][^'"]*['"];?\s*$/gm,
      /print\s+['"][^'"]*['"];?\s*$/gm,
      /var_dump\s*\([^)]*\)\s*;?/g,
      /print_r\s*\([^)]*\)\s*;?/g
    ];

    for (const pattern of patterns) {
      const matches = processedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        processedContent = processedContent.replace(pattern, '');
      }
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} PHP log statements`);
    }

    return processedContent;
  }

  removeRubyLogs(content, options = {}) {
    let processedContent = content;
    let removedCount = 0;

    // Remove puts and p statements
    const patterns = [
      /puts\s+['"][^'"]*['"]$/gm,
      /p\s+['"][^'"]*['"]$/gm,
      /Rails\.logger\.(debug|info)\s*\([^)]*\)/g
    ];

    for (const pattern of patterns) {
      const matches = processedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        processedContent = processedContent.replace(pattern, '');
      }
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} Ruby log statements`);
    }

    return processedContent;
  }

  removeGoLogs(content, options = {}) {
    let processedContent = content;
    let removedCount = 0;

    // Remove fmt.Print statements
    const patterns = [
      /fmt\.Print(ln|f)?\s*\([^)]*\)/g,
      /log\.Print(ln|f)?\s*\([^)]*\)/g
    ];

    for (const pattern of patterns) {
      const matches = processedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        processedContent = processedContent.replace(pattern, '');
      }
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} Go log statements`);
    }

    return processedContent;
  }

  removeRustLogs(content, options = {}) {
    let processedContent = content;
    let removedCount = 0;

    // Remove println! and print! macros
    const patterns = [
      /println!\s*\([^)]*\)\s*;?/g,
      /print!\s*\([^)]*\)\s*;?/g,
      /dbg!\s*\([^)]*\)\s*;?/g
    ];

    for (const pattern of patterns) {
      const matches = processedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        processedContent = processedContent.replace(pattern, '');
      }
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} Rust log statements`);
    }

    return processedContent;
  }

  removeSwiftLogs(content, options = {}) {
    let processedContent = content;
    let removedCount = 0;

    // Remove print statements
    const printMatches = processedContent.match(/print\s*\([^)]*\)/g);
    if (printMatches) {
      removedCount += printMatches.length;
      processedContent = processedContent.replace(/print\s*\([^)]*\)/g, '');
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} Swift log statements`);
    }

    return processedContent;
  }

  removeKotlinLogs(content, options = {}) {
    let processedContent = content;
    let removedCount = 0;

    // Remove println statements
    const patterns = [
      /println\s*\([^)]*\)/g,
      /print\s*\([^)]*\)/g
    ];

    for (const pattern of patterns) {
      const matches = processedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        processedContent = processedContent.replace(pattern, '');
      }
    }

    if (removedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🗑️ Removed ${removedCount} Kotlin log statements`);
    }

    return processedContent;
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
      .normalize('NFC')
      // Remove BOM if present
      .replace(/^\uFEFF/, '');
  }

  /**
   * 2. Strip Markdown Artifacts
   * Remove markdown code block markers and other artifacts that might be present
   */
  stripMarkdownArtifacts(content) {
    return content
      // Remove markdown code block markers
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```\n?$/gm, '')
      // Remove markdown inline code backticks at line start/end
      .replace(/^`+|`+$/gm, '')
      // Remove markdown headers that might be mixed in
      .replace(/^#{1,6}\s+/gm, '')
      // Remove markdown horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Remove markdown emphasis markers if they span entire lines
      .replace(/^\*{1,2}(.*?)\*{1,2}$/gm, '$1')
      .replace(/^_{1,2}(.*?)_{1,2}$/gm, '$1')
      // Remove markdown list markers at the start of lines (but preserve indentation)
      .replace(/^(\s*)[-*+]\s+/gm, '$1');
  }

  /**
   * 3. Comment Processing - Keep meaningful ones, remove noise
   */
  processComments(content, fileExtension, options = {}) {
    const preserveDocComments = options.preserveDocComments !== false;
    const minCommentLength = options.minCommentLength || this.options.minCommentLength;
    
    switch (fileExtension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return this.processJavaScriptComments(content, { preserveDocComments, minCommentLength });
      case 'py':
        return this.processPythonComments(content, { preserveDocComments, minCommentLength });
      case 'java':
      case 'cpp':
      case 'c':
      case 'cs':
        return this.processCStyleComments(content, { preserveDocComments, minCommentLength });
      default:
        return content;
    }
  }

  /**
   * 4. Remove Boilerplate Code
   * Remove common boilerplate patterns that don't add semantic value
   */
  removeBoilerplate(content, fileExtension) {
    let processedContent = content;
    
    // Remove empty functions/methods
    processedContent = this.removeEmptyFunctions(processedContent, fileExtension);
    
    // Remove getter/setter boilerplate
    processedContent = this.removeSimpleGettersSetters(processedContent, fileExtension);
    
    // Remove console.log and debug statements
    processedContent = this.removeDebugStatements(processedContent, fileExtension);
    
    // Remove TODO/FIXME comments (unless they're substantial)
    processedContent = this.removeTodoComments(processedContent, fileExtension);
    
    return processedContent;
  }

  removeEmptyFunctions(content, fileExtension) {
    const lines = content.split('\n');
    const result = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if this is a function declaration
      if (this.isFunctionDeclaration(trimmed, fileExtension)) {
        // Look ahead to see if it's an empty function
        const functionLines = [line];
        let j = i + 1;
        let braceCount = 0;
        let foundOpenBrace = false;
        
        // Collect the function body
        while (j < lines.length) {
          const nextLine = lines[j];
          functionLines.push(nextLine);
          
          for (const char of nextLine) {
            if (char === '{') {
              braceCount++;
              foundOpenBrace = true;
            } else if (char === '}') {
              braceCount--;
            }
          }
          
          if (foundOpenBrace && braceCount === 0) {
            break;
          }
          j++;
        }
        
        // Check if the function is empty (only whitespace and comments)
        const bodyLines = functionLines.slice(1, -1); // Remove declaration and closing brace
        const hasContent = bodyLines.some(bodyLine => {
          const bodyTrimmed = bodyLine.trim();
          return bodyTrimmed && !this.isComment(bodyTrimmed, fileExtension);
        });
        
        if (hasContent) {
          // Keep the function - it has content
          result.push(...functionLines);
        } else {
          // Skip empty function
          console.log(`[${new Date().toISOString()}] 🗑️ Removed empty function: ${trimmed.substring(0, 50)}...`);
        }
        
        i = j + 1;
      } else {
        result.push(line);
        i++;
      }
    }
    
    return result.join('\n');
  }

  removeSimpleGettersSetters(content, fileExtension) {
    if (!['js', 'jsx', 'ts', 'tsx', 'java', 'cs'].includes(fileExtension)) {
      return content;
    }
    
    const lines = content.split('\n');
    const result = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for simple getter/setter patterns
      const isSimpleGetter = /^(get\s+\w+\(\)\s*\{\s*return\s+this\.\w+;\s*\}|public\s+\w+\s+get\w+\(\)\s*\{\s*return\s+\w+;\s*\})/.test(trimmed);
      const isSimpleSetter = /^(set\s+\w+\([^)]+\)\s*\{\s*this\.\w+\s*=\s*\w+;\s*\}|public\s+void\s+set\w+\([^)]+\)\s*\{\s*this\.\w+\s*=\s*\w+;\s*\})/.test(trimmed);
      
      if (isSimpleGetter || isSimpleSetter) {
        console.log(`[${new Date().toISOString()}] 🗑️ Removed simple getter/setter: ${trimmed.substring(0, 50)}...`);
        i++;
        continue;
      }
      
      result.push(line);
      i++;
    }
    
    return result.join('\n');
  }

  removeDebugStatements(content, fileExtension) {
    const debugPatterns = {
      'js': [/console\.(log|debug|info|warn|error)\s*\([^)]*\)\s*;?/g, /debugger\s*;?/g],
      'jsx': [/console\.(log|debug|info|warn|error)\s*\([^)]*\)\s*;?/g, /debugger\s*;?/g],
      'ts': [/console\.(log|debug|info|warn|error)\s*\([^)]*\)\s*;?/g, /debugger\s*;?/g],
      'tsx': [/console\.(log|debug|info|warn|error)\s*\([^)]*\)\s*;?/g, /debugger\s*;?/g],
      'py': [/print\s*\([^)]*\)/g, /pdb\.set_trace\(\)/g],
      'java': [/System\.out\.print(ln)?\s*\([^)]*\)\s*;?/g],
      'cs': [/Console\.Write(Line)?\s*\([^)]*\)\s*;?/g]
    };
    
    const patterns = debugPatterns[fileExtension] || [];
    let result = content;
    
    for (const pattern of patterns) {
      const matches = result.match(pattern);
      if (matches) {
        console.log(`[${new Date().toISOString()}] 🗑️ Removed ${matches.length} debug statements`);
        result = result.replace(pattern, '');
      }
    }
    
    return result;
  }

  removeTodoComments(content, fileExtension) {
    const lines = content.split('\n');
    const result = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if it's a TODO/FIXME comment
      if (this.isComment(trimmed, fileExtension)) {
        const commentContent = this.extractCommentContent(trimmed, fileExtension);
        const isTodoComment = /^(todo|fixme|hack|xxx|note):/i.test(commentContent);
        
        if (isTodoComment && commentContent.length < 30) {
          // Skip short TODO comments
          console.log(`[${new Date().toISOString()}] 🗑️ Removed TODO comment: ${commentContent.substring(0, 30)}...`);
          continue;
        }
      }
      
      result.push(line);
    }
    
    return result.join('\n');
  }

  extractCommentContent(line, fileExtension) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('//')) {
      return trimmed.substring(2).trim();
    } else if (trimmed.startsWith('#')) {
      return trimmed.substring(1).trim();
    } else if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
      return trimmed.substring(2, trimmed.length - 2).trim();
    }
    
    return trimmed;
  }

  processJavaScriptComments(content, options = {}) {
    const { preserveDocComments = true, minCommentLength = 15 } = options;
    const lines = content.split('\n');
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Always keep JSDoc comments if preserveDocComments is true
      if (preserveDocComments && (trimmed.startsWith('/**') || trimmed.includes('* @'))) {
        processedLines.push(line);
        continue;
      }

      // Keep substantial single-line comments
      if (trimmed.startsWith('//')) {
        const commentContent = trimmed.substring(2).trim();
        if (commentContent.length > minCommentLength && !this.isBoilerplateComment(commentContent)) {
          processedLines.push(`// ${commentContent}`);
          continue;
        }
        // Skip short/boilerplate comments
        continue;
      }

      // Keep multi-line comments if substantial
      if (trimmed.startsWith('/*') && !trimmed.startsWith('/**')) {
        const commentContent = trimmed.replace(/\/\*|\*\//g, '').trim();
        if (commentContent.length > minCommentLength * 2) {
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

  processPythonComments(content, options = {}) {
    const { preserveDocComments = true, minCommentLength = 15 } = options;
    const lines = content.split('\n');
    const processedLines = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep docstrings if preserveDocComments is true
      if (preserveDocComments && (trimmed.startsWith('"""') || trimmed.startsWith("'''"))) {
        processedLines.push(line);
        continue;
      }

      // Keep substantial comments
      if (trimmed.startsWith('#')) {
        const commentContent = trimmed.substring(1).trim();
        if (commentContent.length > minCommentLength && !this.isBoilerplateComment(commentContent)) {
          processedLines.push(`# ${commentContent}`);
          continue;
        }
        continue;
      }

      processedLines.push(line);
    }

    return processedLines.join('\n');
  }

  processCStyleComments(content, options = {}) {
    // Similar to JavaScript but with C/Java specific patterns
    return this.processJavaScriptComments(content, options);
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
   * 5. Whitespace Normalization
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
