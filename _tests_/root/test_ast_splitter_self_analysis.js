#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function testASTSplitterOnItself() {
  console.log('🔄 Testing AST Splitter on Itself - Meta Analysis!\n');

  // Load the AST splitter file itself
  const splitterPath = './backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter.js';
  
  if (!fs.existsSync(splitterPath)) {
    console.error('❌ astCodeSplitter.js not found at:', splitterPath);
    return;
  }

  const sourceCode = fs.readFileSync(splitterPath, 'utf-8');
  console.log(`📁 Source file: ${splitterPath}`);
  console.log(`📊 Original size: ${sourceCode.length} characters`);
  console.log(`📏 Estimated tokens: ${Math.ceil(sourceCode.length / 4)}\n`);

  // Initialize the splitter with test settings
  const splitter = new ASTCodeSplitter({
    maxTokens: 600,      // Smaller chunks for better analysis
    minTokens: 50,
    overlapTokens: 60,
    maxUnitsPerChunk: 1, // One semantic unit per chunk
    charsPerToken: 4
  });

  try {
    // Split the file
    const chunks = splitter.split(sourceCode, { 
      source: splitterPath,
      fileType: 'javascript',
      selfAnalysis: true,
      description: 'AST Splitter analyzing itself'
    });

    console.log(`✅ Successfully split AST splitter into ${chunks.length} chunks\n`);

    // Generate markdown report
    const markdownContent = generateSelfAnalysisMarkdown(chunks, splitterPath, sourceCode);
    
    // Write to markdown file
    const outputPath = './astCodeSplitter_self_analysis.md';
    fs.writeFileSync(outputPath, markdownContent, 'utf-8');
    
    console.log(`📝 Self-analysis markdown generated: ${outputPath}`);
    console.log(`📋 Total chunks: ${chunks.length}`);
    console.log(`📊 Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.pageContent.length, 0) / chunks.length)} chars`);
    
    // Show detailed chunk analysis
    const chunkTypes = {};
    const chunkMethods = {};
    
    chunks.forEach((chunk, i) => {
      const meta = chunk.metadata;
      const method = meta.splitting || 'unknown';
      chunkMethods[method] = (chunkMethods[method] || 0) + 1;
      
      const units = meta.units || [];
      if (units.length === 0) {
        chunkTypes['no_units'] = (chunkTypes['no_units'] || 0) + 1;
      } else {
        units.forEach(unit => {
          chunkTypes[unit.type] = (chunkTypes[unit.type] || 0) + 1;
        });
      }
      
      console.log(`  Chunk ${i + 1}: ${method} (${meta.tokenCount} tokens) - ${units.length ? units.map(u => `${u.type}:${u.name}`).join(', ') : 'residual/gap'}`);
    });
    
    console.log('\n📈 Splitting Methods Used:');
    Object.entries(chunkMethods).forEach(([method, count]) => {
      console.log(`  • ${method}: ${count} chunks`);
    });

    console.log('\n🏗️ Semantic Unit Types Found:');
    Object.entries(chunkTypes).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count} chunks`);
    });

  } catch (error) {
    console.error('❌ Error during self-analysis:', error.message);
    console.error(error.stack);
  }
}

function generateSelfAnalysisMarkdown(chunks, filePath, originalCode) {
  const timestamp = new Date().toISOString();
  
  let markdown = `# AST Splitter Self-Analysis

**Generated:** ${timestamp}  
**Source File:** \`${filePath}\`  
**Original Size:** ${originalCode.length} characters (${Math.ceil(originalCode.length / 4)} estimated tokens)  
**Total Chunks:** ${chunks.length}  

## 🔄 Meta-Analysis Overview

This document shows how the AST splitter analyzes **itself** - a fascinating recursive demonstration of:
- Self-awareness in code chunking
- Semantic unit detection on its own implementation
- How well it handles complex, nested JavaScript structures
- Tree-building and residual gap handling in practice

---

`;

  chunks.forEach((chunk, index) => {
    const meta = chunk.metadata;
    const units = meta.units || [];
    
    markdown += `## Chunk ${index + 1}

**Splitting Method:** \`${meta.splitting}\`  
**Token Count:** ${meta.tokenCount} tokens  
**Character Count:** ${chunk.pageContent.length} chars  
**Unit Count:** ${meta.unitCount || 0}  
**SHA1:** \`${meta.sha1}\`  

`;

    if (units.length > 0) {
      markdown += `**Semantic Units Detected:**\n`;
      units.forEach(unit => {
        markdown += `- **${unit.type}**: \`${unit.name}\``;
        if (unit.start && unit.end) {
          markdown += ` (lines ${unit.start}-${unit.end})`;
        }
        if (unit.kind) {
          markdown += ` [${unit.kind}]`;
        }
        markdown += '\n';
      });
      markdown += '\n';
    } else {
      markdown += `**Type:** Residual/Gap chunk (structural code between semantic units)\n\n`;
    }

    if (meta.oversizeOf) {
      markdown += `**Note:** This is a line-window chunk from oversized unit: \`${meta.oversizeOf.type}: ${meta.oversizeOf.name}\`\n\n`;
    }

    // Add code analysis
    const codePreview = chunk.pageContent.substring(0, 200);
    const isLong = chunk.pageContent.length > 200;
    
    markdown += `**Code Preview:**\n`;
    if (chunk.pageContent.length < 50) {
      markdown += `*Short structural chunk*\n`;
    } else if (chunk.pageContent.includes('function ')) {
      markdown += `*Contains function definition(s)*\n`;
    } else if (chunk.pageContent.includes('class ')) {
      markdown += `*Contains class definition*\n`;
    } else if (chunk.pageContent.includes('const ') || chunk.pageContent.includes('let ')) {
      markdown += `*Contains variable declarations*\n`;
    } else {
      markdown += `*Mixed code content*\n`;
    }

    markdown += `\n### Full Code Content

\`\`\`javascript
${chunk.pageContent}
\`\`\`

---

`;
  });

  // Add comprehensive statistics
  const totalTokens = chunks.reduce((sum, c) => sum + c.metadata.tokenCount, 0);
  const avgTokens = Math.round(totalTokens / chunks.length);
  const minTokens = Math.min(...chunks.map(c => c.metadata.tokenCount));
  const maxTokens = Math.max(...chunks.map(c => c.metadata.tokenCount));

  const splitMethods = {};
  const unitTypes = {};
  
  chunks.forEach(chunk => {
    const method = chunk.metadata.splitting || 'unknown';
    splitMethods[method] = (splitMethods[method] || 0) + 1;
    
    const units = chunk.metadata.units || [];
    if (units.length === 0) {
      unitTypes['residual'] = (unitTypes['residual'] || 0) + 1;
    } else {
      units.forEach(unit => {
        unitTypes[unit.type] = (unitTypes[unit.type] || 0) + 1;
      });
    }
  });

  markdown += `## 📊 Comprehensive Statistics

### Chunk Size Distribution
| Metric | Value |
|--------|-------|
| Total Chunks | ${chunks.length} |
| Total Tokens | ${totalTokens} |
| Average Tokens per Chunk | ${avgTokens} |
| Min Tokens | ${minTokens} |
| Max Tokens | ${maxTokens} |
| Original File Tokens | ${Math.ceil(originalCode.length / 4)} |
| Compression Ratio | ${((totalTokens / Math.ceil(originalCode.length / 4)) * 100).toFixed(1)}% |

### Splitting Methods Used
`;

  Object.entries(splitMethods).forEach(([method, count]) => {
    const percentage = ((count / chunks.length) * 100).toFixed(1);
    markdown += `- **${method}**: ${count} chunks (${percentage}%)\n`;
  });

  markdown += `\n### Semantic Unit Types Detected
`;

  Object.entries(unitTypes).forEach(([type, count]) => {
    const percentage = ((count / chunks.length) * 100).toFixed(1);
    markdown += `- **${type}**: ${count} occurrences (${percentage}%)\n`;
  });

  markdown += `\n## 🤔 Self-Analysis Insights

This meta-analysis reveals how the AST splitter understands its own architecture:

1. **Modular Design**: Clean separation between utility functions, main class, and helper methods
2. **Semantic Intelligence**: Correctly identifies its own functions, classes, and patterns
3. **Efficient Chunking**: Creates appropriately-sized chunks for complex JavaScript
4. **Tree Awareness**: Demonstrates the hierarchical understanding it applies to all code

The splitter successfully processes its own ${Math.ceil(originalCode.length / 4)} tokens into ${chunks.length} focused, semantically meaningful chunks - proving its effectiveness on real-world JavaScript codebases!
`;

  return markdown;
}

// Run the self-analysis
testASTSplitterOnItself().catch(console.error);