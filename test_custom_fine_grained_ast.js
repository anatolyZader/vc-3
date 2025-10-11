// Custom Fine-Grained AST Splitter for Method/Function Level Chunks
'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

class FineGrainedCodeSplitter {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 300;
    this.minTokens = options.minTokens || 30;
    this.overlapTokens = options.overlapTokens || 50;
    
    // Use tiktoken for accurate token counting
    this.tiktoken = require('tiktoken');
    this.encoding = this.tiktoken.encoding_for_model('gpt-3.5-turbo');
  }

  countTokens(text) {
    return this.encoding.encode(text).length;
  }

  async splitDocument(document) {
    const { pageContent, metadata } = document;
    const chunks = [];

    try {
      // Parse with Babel
      const ast = this.parseCode(pageContent);
      const lines = pageContent.split('\n');
      
      console.log('🔍 Starting fine-grained semantic extraction...');
      
      // Extract all semantic units aggressively
      const semanticUnits = this.extractAllSemanticUnits(ast, lines, metadata);
      
      console.log(`📦 Found ${semanticUnits.length} semantic units`);
      
      // Convert semantic units to chunks
      for (const unit of semanticUnits) {
        const tokenCount = this.countTokens(unit.content);
        
        // Skip very small units unless they're important
        if (tokenCount < this.minTokens && !unit.important) {
          continue;
        }
        
        // If unit is too large, try to split it further
        if (tokenCount > this.maxTokens) {
          const subChunks = this.splitLargeUnit(unit);
          chunks.push(...subChunks);
        } else {
          chunks.push({
            pageContent: unit.content,
            metadata: {
              ...metadata,
              chunkType: unit.type,
              semanticType: unit.semanticType,
              functionName: unit.functionName,
              className: unit.className,
              tokenCount: tokenCount,
              startLine: unit.startLine,
              endLine: unit.endLine
            }
          });
        }
      }
      
      console.log(`✅ Created ${chunks.length} fine-grained chunks`);
      return chunks;
      
    } catch (error) {
      console.error('❌ AST parsing failed, falling back to line-based splitting:', error.message);
      return this.fallbackSplit(pageContent, metadata);
    }
  }

  parseCode(code) {
    return parse(code, {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'importAssertions']
    });
  }

  extractAllSemanticUnits(ast, lines, metadata) {
    const units = [];
    
    traverse(ast, {
      // Extract every function declaration
      FunctionDeclaration: (path) => {
        const unit = this.createSemanticUnit(path.node, lines, 'function_declaration', 'function');
        if (unit) {
          unit.functionName = path.node.id?.name || 'anonymous';
          unit.important = true;
          units.push(unit);
        }
      },

      // Extract every method definition
      MethodDefinition: (path) => {
        const unit = this.createSemanticUnit(path.node, lines, 'method_definition', 'method');
        if (unit) {
          unit.functionName = path.node.key?.name || 'anonymous';
          unit.important = true;
          units.push(unit);
        }
      },

      // Extract arrow functions and function expressions assigned to variables
      VariableDeclaration: (path) => {
        for (const declarator of path.node.declarations) {
          if (declarator.init && 
              (declarator.init.type === 'ArrowFunctionExpression' || 
               declarator.init.type === 'FunctionExpression')) {
            const unit = this.createSemanticUnit(path.node, lines, 'variable_function', 'function');
            if (unit) {
              unit.functionName = declarator.id?.name || 'anonymous';
              unit.important = true;
              units.push(unit);
            }
          }
        }
      },

      // Extract every call expression (like fastify.register, fastify.get, etc.)
      CallExpression: (path) => {
        // Only extract top-level calls or important method calls
        if (this.isImportantCall(path.node)) {
          const unit = this.createSemanticUnit(path.node, lines, 'call_expression', 'registration');
          if (unit) {
            unit.callType = this.getCallType(path.node);
            unit.important = true;
            units.push(unit);
          }
        }
      },

      // Extract class declarations
      ClassDeclaration: (path) => {
        const unit = this.createSemanticUnit(path.node, lines, 'class_declaration', 'class');
        if (unit) {
          unit.className = path.node.id?.name || 'anonymous';
          unit.important = true;
          units.push(unit);
        }
      },

      // Extract export statements
      ExportNamedDeclaration: (path) => {
        const unit = this.createSemanticUnit(path.node, lines, 'named_export', 'export');
        if (unit) {
          unit.important = true;
          units.push(unit);
        }
      },

      ExportDefaultDeclaration: (path) => {
        const unit = this.createSemanticUnit(path.node, lines, 'default_export', 'export');
        if (unit) {
          unit.important = true;
          units.push(unit);
        }
      }
    });

    // Sort by line number
    units.sort((a, b) => a.startLine - b.startLine);
    
    return units;
  }

  createSemanticUnit(node, lines, type, semanticType) {
    if (!node.loc) return null;
    
    const startLine = node.loc.start.line - 1;
    const endLine = node.loc.end.line - 1;
    
    // Include preceding comments
    let adjustedStartLine = startLine;
    for (let i = startLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') || line === '') {
        adjustedStartLine = i;
      } else {
        break;
      }
    }
    
    const content = lines.slice(adjustedStartLine, endLine + 1).join('\n');
    
    return {
      content: content,
      type: type,
      semanticType: semanticType,
      startLine: adjustedStartLine + 1,
      endLine: endLine + 1,
      important: false
    };
  }

  isImportantCall(node) {
    if (!node.callee) return false;
    
    // Check for fastify method calls
    if (node.callee.type === 'MemberExpression') {
      const objectName = node.callee.object?.name;
      const propertyName = node.callee.property?.name;
      
      // Fastify registrations and routes
      if (objectName === 'fastify' && 
          ['register', 'get', 'post', 'put', 'delete', 'patch', 'route', 'addHook'].includes(propertyName)) {
        return true;
      }
      
      // Await expressions with fastify
      if (node.callee.object?.type === 'MemberExpression' &&
          node.callee.object.object?.name === 'fastify') {
        return true;
      }
    }
    
    // Module.exports or exports assignments
    if (node.callee.name === 'require') {
      return false; // Skip require calls for now
    }
    
    return false;
  }

  getCallType(node) {
    if (node.callee?.type === 'MemberExpression') {
      const propertyName = node.callee.property?.name;
      
      if (['get', 'post', 'put', 'delete', 'patch'].includes(propertyName)) {
        return 'route_definition';
      }
      if (propertyName === 'register') {
        return 'plugin_registration';
      }
      if (propertyName === 'addHook') {
        return 'hook_registration';
      }
    }
    
    return 'function_call';
  }

  splitLargeUnit(unit) {
    // If a unit is too large, split it by lines
    const lines = unit.content.split('\n');
    const targetLines = Math.ceil(lines.length / 2);
    
    const chunks = [];
    for (let i = 0; i < lines.length; i += targetLines) {
      const chunkLines = lines.slice(i, i + targetLines);
      const chunkContent = chunkLines.join('\n');
      const tokenCount = this.countTokens(chunkContent);
      
      if (tokenCount >= this.minTokens) {
        chunks.push({
          pageContent: chunkContent,
          metadata: {
            chunkType: `${unit.type}_part`,
            semanticType: unit.semanticType,
            functionName: unit.functionName,
            className: unit.className,
            tokenCount: tokenCount,
            partOf: unit.type
          }
        });
      }
    }
    
    return chunks;
  }

  fallbackSplit(content, metadata) {
    // Simple line-based fallback
    const lines = content.split('\n');
    const chunks = [];
    const linesPerChunk = 15; // Small chunks
    
    for (let i = 0; i < lines.length; i += linesPerChunk) {
      const chunkLines = lines.slice(i, i + linesPerChunk);
      const chunkContent = chunkLines.join('\n');
      const tokenCount = this.countTokens(chunkContent);
      
      if (tokenCount >= this.minTokens) {
        chunks.push({
          pageContent: chunkContent,
          metadata: {
            ...metadata,
            chunkType: 'fallback_chunk',
            semanticType: 'code',
            tokenCount: tokenCount,
            startLine: i + 1,
            endLine: Math.min(i + linesPerChunk, lines.length)
          }
        });
      }
    }
    
    return chunks;
  }
}

async function testCustomFineGrainedSplitting() {
  console.log('========================================');
  console.log('🎯 CUSTOM FINE-GRAINED AST SPLITTING');
  console.log('========================================\n');

  try {
    // Read app.js
    const appJsPath = path.join(__dirname, 'backend', 'app.js');
    const originalCode = fs.readFileSync(appJsPath, 'utf8');
    console.log(`📄 Original app.js: ${originalCode.length} characters\n`);

    // Create custom splitter
    const splitter = new FineGrainedCodeSplitter({
      maxTokens: 300,
      minTokens: 30,
      overlapTokens: 50
    });

    // Split the document
    const document = {
      pageContent: originalCode,
      metadata: {
        source: 'app.js',
        language: 'javascript',
        type: 'code'
      }
    };

    const chunks = await splitter.splitDocument(document);
    
    console.log(`\n🎯 RESULTS: ${chunks.length} fine-grained chunks created\n`);

    // Analyze chunks
    console.log('📊 CHUNK ANALYSIS:');
    let totalTokens = 0;
    const tokenCounts = [];
    
    chunks.forEach((chunk, index) => {
      const tokenCount = chunk.metadata?.tokenCount || splitter.countTokens(chunk.pageContent);
      tokenCounts.push(tokenCount);
      totalTokens += tokenCount;
      
      const chunkType = chunk.metadata?.chunkType || 'unknown';
      const functionName = chunk.metadata?.functionName || '';
      const callType = chunk.metadata?.callType || '';
      
      console.log(`   ${index + 1}: ${tokenCount} tokens | ${chunkType} | ${functionName} ${callType}`);
    });

    const avgTokens = Math.round(totalTokens / chunks.length);
    const maxTokens = Math.max(...tokenCounts);
    const minTokens = Math.min(...tokenCounts);

    console.log(`\n📈 STATISTICS:`);
    console.log(`   • Total Chunks: ${chunks.length}`);
    console.log(`   • Average Size: ${avgTokens} tokens`);
    console.log(`   • Size Range: ${minTokens} - ${maxTokens} tokens`);
    console.log(`   • Total Tokens: ${totalTokens}`);

    // Generate markdown output
    let markdownContent = '# app.js - Custom Fine-Grained AST Chunks\n\n';
    markdownContent += `**Configuration:** Custom fine-grained AST splitting (max ${splitter.maxTokens} tokens)\n`;
    markdownContent += `**Generated:** ${new Date().toISOString()}\n`;
    markdownContent += `**Total Chunks:** ${chunks.length}\n`;
    markdownContent += `**Average Size:** ${avgTokens} tokens\n\n`;

    chunks.forEach((chunk, index) => {
      const metadata = chunk.metadata || {};
      const tokenCount = metadata.tokenCount || splitter.countTokens(chunk.pageContent);
      
      markdownContent += `## Chunk ${index + 1}: ${metadata.chunkType || 'unknown'} (${tokenCount} tokens)\n\n`;
      
      if (metadata.functionName) markdownContent += `**Function:** ${metadata.functionName}\n`;
      if (metadata.className) markdownContent += `**Class:** ${metadata.className}\n`;
      if (metadata.callType) markdownContent += `**Call Type:** ${metadata.callType}\n`;
      
      markdownContent += `**Tokens:** ${tokenCount}\n`;
      markdownContent += `**Lines:** ${metadata.startLine}-${metadata.endLine}\n\n`;
      
      markdownContent += '```javascript\n';
      markdownContent += chunk.pageContent;
      markdownContent += '\n```\n\n---\n\n';
    });

    // Write output
    const outputPath = path.join(__dirname, 'custom_fine_grained_app_js_chunks.md');
    fs.writeFileSync(outputPath, markdownContent);
    
    console.log(`\n✅ Custom fine-grained chunks saved to: custom_fine_grained_app_js_chunks.md`);
    console.log(`🎉 SUCCESS: Created ${chunks.length} method/function level chunks!`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testCustomFineGrainedSplitting()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { FineGrainedCodeSplitter, testCustomFineGrainedSplitting };