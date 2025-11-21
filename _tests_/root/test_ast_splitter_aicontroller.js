#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function testAiControllerSplitting() {
  console.log('🚀 Testing Enhanced AST Splitter on aiController.js\n');

  // Load the aiController.js file
  const aiControllerPath = './backend/business_modules/ai/application/aiController.js';
  
  if (!fs.existsSync(aiControllerPath)) {
    console.error('❌ aiController.js not found at:', aiControllerPath);
    return;
  }

  const sourceCode = fs.readFileSync(aiControllerPath, 'utf-8');
  console.log(`📁 Source file: ${aiControllerPath}`);
  console.log(`📊 Original size: ${sourceCode.length} characters`);
  console.log(`📏 Estimated tokens: ${Math.ceil(sourceCode.length / 4)}\n`);

  // Initialize the splitter with test settings
  const splitter = new ASTCodeSplitter({
    maxTokens: 800,
    minTokens: 60,
    overlapTokens: 80,
    maxUnitsPerChunk: 1, // Keep one semantic unit per chunk for clarity
    charsPerToken: 4
  });

  try {
    // Split the file
    const chunks = splitter.split(sourceCode, { 
      source: aiControllerPath,
      fileType: 'javascript',
      testRun: true
    });

    console.log(`✅ Successfully split into ${chunks.length} chunks\n`);

    // Generate markdown report
    const markdownContent = generateMarkdownReport(chunks, aiControllerPath, sourceCode);
    
    // Write to markdown file
    const outputPath = './aiController_chunks_analysis.md';
    fs.writeFileSync(outputPath, markdownContent, 'utf-8');
    
    console.log(`📝 Markdown report generated: ${outputPath}`);
    console.log(`📋 Total chunks: ${chunks.length}`);
    console.log(`📊 Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.pageContent.length, 0) / chunks.length)} chars`);
    
    // Show summary of chunk types
    const chunkTypes = {};
    chunks.forEach(chunk => {
      const units = chunk.metadata.units || [];
      units.forEach(unit => {
        chunkTypes[unit.type] = (chunkTypes[unit.type] || 0) + 1;
      });
    });
    
    console.log('\n📈 Chunk Types Found:');
    Object.entries(chunkTypes).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error during splitting:', error.message);
    console.error(error.stack);
  }
}

function generateMarkdownReport(chunks, filePath, originalCode) {
  const timestamp = new Date().toISOString();
  
  let markdown = `# AST Splitter Analysis: aiController.js

**Generated:** ${timestamp}  
**Source File:** \`${filePath}\`  
**Original Size:** ${originalCode.length} characters  
**Total Chunks:** ${chunks.length}  

## Overview

This document shows the enhanced AST splitter results for \`aiController.js\`, demonstrating:
- Fastify route/handler detection
- Event subscription detection  
- Semantic unit boundaries
- Clean code generation (comments removed)

---

`;

  chunks.forEach((chunk, index) => {
    const meta = chunk.metadata;
    const units = meta.units || [];
    
    markdown += `## Chunk ${index + 1}

**Splitting Method:** \`${meta.splitting}\`  
**Token Count:** ${meta.tokenCount}  
**Unit Count:** ${meta.unitCount}  
**SHA1:** \`${meta.sha1}\`  

`;

    if (units.length > 0) {
      markdown += `**Semantic Units:**\n`;
      units.forEach(unit => {
        markdown += `- **${unit.type}**: \`${unit.name}\` (lines ${unit.start}-${unit.end})\n`;
      });
      markdown += '\n';
    }

    if (meta.oversizeOf) {
      markdown += `**Note:** This is a line-window chunk from oversized unit: \`${meta.oversizeOf.type}: ${meta.oversizeOf.name}\`\n\n`;
    }

    markdown += `### Code Content

\`\`\`javascript
${chunk.pageContent}
\`\`\`

---

`;
  });

  // Add summary statistics
  const totalTokens = chunks.reduce((sum, c) => sum + c.metadata.tokenCount, 0);
  const avgTokens = Math.round(totalTokens / chunks.length);
  const minTokens = Math.min(...chunks.map(c => c.metadata.tokenCount));
  const maxTokens = Math.max(...chunks.map(c => c.metadata.tokenCount));

  markdown += `## Statistics

| Metric | Value |
|--------|-------|
| Total Chunks | ${chunks.length} |
| Total Tokens | ${totalTokens} |
| Average Tokens per Chunk | ${avgTokens} |
| Min Tokens | ${minTokens} |
| Max Tokens | ${maxTokens} |
| Original File Tokens | ${Math.ceil(originalCode.length / 4)} |

## Chunk Distribution by Type

`;

  const typeStats = {};
  chunks.forEach(chunk => {
    const units = chunk.metadata.units || [];
    if (units.length === 0) {
      typeStats['no_units'] = (typeStats['no_units'] || 0) + 1;
    } else {
      units.forEach(unit => {
        typeStats[unit.type] = (typeStats[unit.type] || 0) + 1;
      });
    }
  });

  Object.entries(typeStats).forEach(([type, count]) => {
    markdown += `- **${type}**: ${count} chunks\n`;
  });

  return markdown;
}

// Run the test
testAiControllerSplitting().catch(console.error);