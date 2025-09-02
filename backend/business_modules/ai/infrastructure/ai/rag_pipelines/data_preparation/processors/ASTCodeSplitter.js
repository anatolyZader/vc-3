// ASTCodeSplitter.js
"use strict";

const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

/**
 * AST-Based Code Splitter - Semantic Code Chunking
 * 
 * This class splits JavaScript/TypeScript code based on semantic units
 * (functions, classes, methods) rather than arbitrary line counts.
 * 
 * Benefits:
 * - Preserves semantic boundaries
 * - Includes related JSDoc/comments
 * - Maintains code coherence
 * - Better embedding quality
 */
class ASTCodeSplitter {
  constructor(options = {}) {
    this.maxChunkSize = options.maxChunkSize || 3500; // Max chars per chunk - increased to handle larger methods
    this.includeComments = options.includeComments !== false; // Include comments by default
    this.includeImports = options.includeImports !== false; // Include import context
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs'];
    
    console.log(`[${new Date().toISOString()}] ASTCodeSplitter initialized with maxChunkSize: ${this.maxChunkSize}`);
  }

  /**
   * Split code document using AST analysis
   */
  async splitCodeDocument(document) {
    const { pageContent, metadata } = document;
    const fileExtension = this.getFileExtension(metadata.source || '');
    
    if (!this.supportedExtensions.includes(fileExtension)) {
      console.log(`[${new Date().toISOString()}] AST: Unsupported extension ${fileExtension}, falling back to regular splitting`);
      return [document];
    }

    try {
      console.log(`[${new Date().toISOString()}] AST: Processing ${metadata.source} (${pageContent.length} chars)`);
      
      // Parse the code into AST
      const ast = this.parseCode(pageContent, fileExtension);
      
      // Extract semantic chunks
      const chunks = this.extractSemanticChunks(ast, pageContent, metadata);
      
      console.log(`[${new Date().toISOString()}] AST: Split ${metadata.source} into ${chunks.length} semantic chunks`);
      
      return chunks.length > 0 ? chunks : [document];
      
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] AST: Failed to parse ${metadata.source}: ${error.message}`);
      console.warn(`[${new Date().toISOString()}] AST: Falling back to original document`);
      return [document];
    }
  }

  /**
   * Parse code into AST with appropriate plugins
   */
  parseCode(code, extension) {
    const isTypeScript = ['.ts', '.tsx'].includes(extension);
    const isReact = ['.jsx', '.tsx'].includes(extension);

    const plugins = [
      'decorators-legacy',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'objectRestSpread',
      'asyncGenerators',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'functionBind',
      'nullishCoalescingOperator',
      'optionalChaining',
      'optionalCatchBinding'
    ];

    if (isTypeScript) {
      plugins.push('typescript');
    }

    if (isReact) {
      plugins.push('jsx');
    }

    return parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins
    });
  }

  /**
   * Extract semantic chunks from AST
   */
  extractSemanticChunks(ast, originalCode, metadata) {
    const chunks = [];
    const lines = originalCode.split('\n');
    
    // Collect imports for context
    const imports = this.collectImports(ast, lines);
    
    // Collect top-level declarations and their contexts
    const semanticUnits = [];
    
    traverse(ast, {
      // Class declarations - but also capture methods individually if class is large
      ClassDeclaration: (path) => {
        if (path.parent && path.parent.type === 'Program') { // Only top-level classes
          const classUnit = this.createSemanticUnit(path.node, lines, 'class', originalCode);
          if (classUnit) {
            // If class is small enough, add it as a single unit
            if (classUnit.size <= this.maxChunkSize) {
              semanticUnits.push(classUnit);
            } else {
              // If class is too large, break it down into methods
              console.log(`[${new Date().toISOString()}] AST: Class ${classUnit.name} too large (${classUnit.size} chars), extracting methods`);
              
              // Add class declaration/constructor as separate unit
              const classHeader = this.extractClassHeader(path.node, lines);
              if (classHeader) {
                semanticUnits.push({
                  type: 'class_header',
                  nodeType: 'ClassDeclaration',
                  name: classUnit.name + '_header',
                  startLine: classHeader.startLine,
                  endLine: classHeader.endLine,
                  content: classHeader.content,
                  size: classHeader.content.length
                });
              }
              
              // Extract individual methods
              this.extractClassMethods(path.node, lines, semanticUnits, originalCode);
            }
          }
        }
      },

      // Function declarations
      FunctionDeclaration: (path) => {
        console.log(`[${new Date().toISOString()}] AST: Found FunctionDeclaration: ${path.node.id?.name}, parent: ${path.parent?.type}`);
        if (path.parent && path.parent.type === 'Program') { // Only top-level functions
          const unit = this.createSemanticUnit(path.node, lines, 'function', originalCode);
          if (unit) {
            console.log(`[${new Date().toISOString()}] AST: Added function unit: ${unit.name} (${unit.size} chars)`);
            semanticUnits.push(unit);
          } else {
            console.log(`[${new Date().toISOString()}] AST: Function unit creation failed for ${path.node.id?.name}`);
          }
        }
      },

      // Arrow function assignments at top level
      VariableDeclaration: (path) => {
        if (path.parent && path.parent.type === 'Program') {
          // Check if any declarator has a function expression
          for (const declarator of path.node.declarations) {
            if (declarator.init && 
                (declarator.init.type === 'ArrowFunctionExpression' || 
                 declarator.init.type === 'FunctionExpression')) {
              const unit = this.createSemanticUnit(path.node, lines, 'function', originalCode);
              if (unit) {
                semanticUnits.push(unit);
                break; // Only add once per variable declaration
              }
            }
          }
        }
      },

      // Export declarations
      ExportNamedDeclaration: (path) => {
        if (path.node.declaration) {
          const unit = this.createSemanticUnit(path.node, lines, 'export', originalCode);
          if (unit) semanticUnits.push(unit);
        }
      },

      ExportDefaultDeclaration: (path) => {
        const unit = this.createSemanticUnit(path.node, lines, 'export', originalCode);
        if (unit) semanticUnits.push(unit);
      }
    });

    // Sort by line number
    semanticUnits.sort((a, b) => a.startLine - b.startLine);

    // Create chunks with imports context
    for (const unit of semanticUnits) {
      let chunkContent = '';
      
      // Add imports if requested and this is the first chunk or a standalone chunk
      if (this.includeImports && imports.length > 0) {
        chunkContent += imports.join('\n') + '\n\n';
      }
      
      // Add the semantic unit content
      chunkContent += unit.content;
      
      // Create chunk metadata
      const chunkMetadata = {
        ...metadata,
        chunk_type: 'ast_semantic',
        semantic_unit: unit.type,
        ast_node_type: unit.nodeType,
        start_line: unit.startLine,
        end_line: unit.endLine,
        function_name: unit.name || 'anonymous',
        includes_imports: this.includeImports && imports.length > 0,
        original_size: originalCode.length,
        chunk_size: chunkContent.length
      };

      chunks.push({
        pageContent: chunkContent,
        metadata: chunkMetadata
      });
    }

    // If no semantic units found or chunks are too large, fall back to original
    if (chunks.length === 0 || chunks.some(chunk => chunk.pageContent.length > this.maxChunkSize * 1.5)) {
      console.log(`[${new Date().toISOString()}] AST: No suitable chunks or chunks too large, using original document`);
      return [{
        pageContent: originalCode,
        metadata: {
          ...metadata,
          chunk_type: 'ast_fallback',
          ast_parsing_attempted: true,
          fallback_reason: chunks.length === 0 ? 'no_semantic_units' : 'chunks_too_large'
        }
      }];
    }

    console.log(`[${new Date().toISOString()}] AST: Split ${metadata?.source || 'unknown'} into ${chunks.length} semantic chunks`);
    return chunks;
  }

  /**
   * Extract class header (class declaration, constructor, and imports)
   */
  extractClassHeader(classNode, lines) {
    if (!classNode.loc) return null;
    
    const classStart = classNode.loc.start.line - 1;
    let headerEnd = classStart;
    
    // Find constructor or first method
    if (classNode.body && classNode.body.body) {
      for (const member of classNode.body.body) {
        if (member.kind === 'constructor' || member.type === 'MethodDefinition') {
          headerEnd = member.loc.start.line - 2; // Line before method
          break;
        }
      }
      
      // If no methods found, include a few more lines
      if (headerEnd === classStart) {
        headerEnd = Math.min(classStart + 5, lines.length - 1);
      }
    }
    
    const headerLines = lines.slice(classStart, headerEnd + 1);
    return {
      startLine: classStart + 1,
      endLine: headerEnd + 1,
      content: headerLines.join('\n')
    };
  }

  /**
   * Extract individual methods from a class
   */
  extractClassMethods(classNode, lines, semanticUnits, originalCode) {
    if (!classNode.body || !classNode.body.body) {
      console.log(`[${new Date().toISOString()}] AST: No class body found`);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] AST: Found ${classNode.body.body.length} class members`);
    
    for (const member of classNode.body.body) {
      console.log(`[${new Date().toISOString()}] AST: Processing member type: ${member.type}, kind: ${member.kind}`);
      
      if ((member.type === 'MethodDefinition' || member.type === 'ClassMethod') && member.loc) {
        const methodUnit = this.createSemanticUnit(member, lines, 'method', originalCode);
        if (methodUnit) {
          console.log(`[${new Date().toISOString()}] AST: Extracted method: ${methodUnit.name} (${methodUnit.size} chars)`);
          semanticUnits.push(methodUnit);
        } else {
          console.log(`[${new Date().toISOString()}] AST: Method unit creation failed`);
        }
      }
    }
  }

  /**
   * Collect import statements for context
   */
  collectImports(ast, lines) {
    const imports = [];
    const importLines = new Set();

    traverse(ast, {
      ImportDeclaration: (path) => {
        if (path.node.loc) {
          const startLine = path.node.loc.start.line - 1;
          const endLine = path.node.loc.end.line - 1;
          
          for (let i = startLine; i <= endLine; i++) {
            if (!importLines.has(i) && lines[i]) {
              imports.push(lines[i]);
              importLines.add(i);
            }
          }
        }
      },

      // Also collect require statements at top level
      VariableDeclaration: (path) => {
        if (path.parent && path.parent.type === 'Program') {
          // Check if this is a require statement
          for (const declarator of path.node.declarations) {
            if (declarator.init && 
                declarator.init.type === 'CallExpression' &&
                declarator.init.callee && 
                declarator.init.callee.name === 'require') {
              
              if (path.node.loc) {
                const startLine = path.node.loc.start.line - 1;
                const endLine = path.node.loc.end.line - 1;
                
                for (let i = startLine; i <= endLine; i++) {
                  if (!importLines.has(i) && lines[i]) {
                    imports.push(lines[i]);
                    importLines.add(i);
                  }
                }
              }
              break;
            }
          }
        }
      }
    });

    return imports;
  }

  /**
   * Create a semantic unit from AST node
   */
  createSemanticUnit(node, lines, unitType, originalCode) {
    if (!node.loc) return null;

    const startLine = node.loc.start.line - 1;
    const endLine = node.loc.end.line - 1;
    
    // Look for JSDoc/comments before the node
    const adjustedStartLine = this.findCommentStart(lines, startLine);
    
    // Extract content
    const unitLines = lines.slice(adjustedStartLine, endLine + 1);
    const content = unitLines.join('\n');
    
    // Skip very small units (less than 50 chars)
    if (content.trim().length < 50) {
      return null;
    }
    
    // Extract name
    const name = this.extractName(node);
    
    return {
      type: unitType,
      nodeType: node.type,
      name,
      startLine: adjustedStartLine + 1,
      endLine: endLine + 1,
      content,
      size: content.length
    };
  }

  /**
   * Find the start of comments/JSDoc before a node
   */
  findCommentStart(lines, nodeStartLine) {
    let currentLine = nodeStartLine - 1;
    
    // Look backwards for JSDoc comments
    while (currentLine >= 0) {
      const line = lines[currentLine].trim();
      
      if (line === '*/') {
        // Found end of JSDoc, find the start
        while (currentLine >= 0 && !lines[currentLine].trim().startsWith('/**')) {
          currentLine--;
        }
        return currentLine >= 0 ? currentLine : nodeStartLine;
      }
      
      if (line.startsWith('//')) {
        // Single line comment, continue looking
        currentLine--;
        continue;
      }
      
      if (line === '' || line === '\n') {
        // Empty line, continue looking
        currentLine--;
        continue;
      }
      
      // Found non-comment, non-empty line
      break;
    }
    
    return nodeStartLine;
  }

  /**
   * Extract name from AST node
   */
  extractName(node) {
    switch (node.type) {
      case 'ClassDeclaration':
      case 'FunctionDeclaration':
        return node.id ? node.id.name : 'anonymous';
        
      case 'VariableDeclaration':
        if (node.declarations && node.declarations[0] && node.declarations[0].id) {
          return node.declarations[0].id.name;
        }
        break;
        
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration':
        if (node.declaration) {
          return this.extractName(node.declaration);
        }
        break;
        
      case 'ClassMethod':
      case 'ObjectMethod':
        return node.key ? node.key.name : 'method';
    }
    
    return 'unknown';
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename) {
    if (!filename) return '';
    return filename.substring(filename.lastIndexOf('.'));
  }

  /**
   * Check if a file should use AST-based splitting
   */
  shouldUseASTSplitting(metadata) {
    const source = metadata.source || '';
    const extension = this.getFileExtension(source);
    
    return this.supportedExtensions.includes(extension) && 
           !source.includes('node_modules') &&
           !source.includes('.min.') &&
           metadata.fileType !== 'JSON';
  }
}

module.exports = ASTCodeSplitter;
