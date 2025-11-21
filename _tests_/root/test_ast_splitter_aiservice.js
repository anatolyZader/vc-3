#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ASTCodeSplitter = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function testAiServiceSplitting() {
  console.log('🤖 Testing Enhanced AST Splitter on aiService.js\n');

  // Load the aiService.js file
  const aiServicePath = './backend/business_modules/ai/application/services/aiService.js';
  
  if (!fs.existsSync(aiServicePath)) {
    console.error('❌ aiService.js not found at:', aiServicePath);
    return;
  }

  const sourceCode = fs.readFileSync(aiServicePath, 'utf-8');
  console.log(`📁 Source file: ${aiServicePath}`);
  console.log(`📊 Original size: ${sourceCode.length} characters`);
  console.log(`📏 Estimated tokens: ${Math.ceil(sourceCode.length / 4)}\n`);

  // Initialize the splitter with settings optimized for service files
  const splitter = new ASTCodeSplitter({
    maxTokens: 700,      // Slightly smaller for better granularity
    minTokens: 50,
    overlapTokens: 70,
    maxUnitsPerChunk: 1, // One semantic unit per chunk for clarity
    charsPerToken: 4
  });

  try {
    // Split the file
    const chunks = splitter.split(sourceCode, { 
      source: aiServicePath,
      fileType: 'javascript',
      serviceType: 'aiService',
      analysisType: 'business_logic'
    });

    console.log(`✅ Successfully split into ${chunks.length} chunks\n`);

    // Generate markdown report
    const markdownContent = generateAiServiceMarkdown(chunks, aiServicePath, sourceCode);
    
    // Write to markdown file
    const outputPath = './aiService_chunks_analysis.md';
    fs.writeFileSync(outputPath, markdownContent, 'utf-8');
    
    console.log(`📝 Markdown report generated: ${outputPath}`);
    console.log(`📋 Total chunks: ${chunks.length}`);
    console.log(`📊 Average chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.pageContent.length, 0) / chunks.length)} chars`);
    
    // Show detailed analysis
    const chunkTypes = {};
    const chunkMethods = {};
    const businessLogicPatterns = {
      asyncFunctions: 0,
      errorHandling: 0,
      logging: 0,
      diContainer: 0,
      repositories: 0
    };
    
    chunks.forEach((chunk, i) => {
      const meta = chunk.metadata;
      const method = meta.splitting || 'unknown';
      chunkMethods[method] = (chunkMethods[method] || 0) + 1;
      
      const units = meta.units || [];
      if (units.length === 0) {
        chunkTypes['residual'] = (chunkTypes['residual'] || 0) + 1;
      } else {
        units.forEach(unit => {
          chunkTypes[unit.type] = (chunkTypes[unit.type] || 0) + 1;
        });
      }
      
      // Analyze business logic patterns
      const content = chunk.pageContent;
      if (content.includes('async ')) businessLogicPatterns.asyncFunctions++;
      if (content.includes('try {') || content.includes('catch')) businessLogicPatterns.errorHandling++;
      if (content.includes('.log.')) businessLogicPatterns.logging++;
      if (content.includes('diScope') || content.includes('resolve(')) businessLogicPatterns.diContainer++;
      if (content.includes('Repository') || content.includes('repository')) businessLogicPatterns.repositories++;
      
      console.log(`  Chunk ${i + 1}: ${method} (${meta.tokenCount} tokens) - ${units.length ? units.map(u => `${u.type}:${u.name}`).join(', ') : 'residual'}`);
    });
    
    console.log('\n📈 Splitting Methods:');
    Object.entries(chunkMethods).forEach(([method, count]) => {
      console.log(`  • ${method}: ${count} chunks`);
    });

    console.log('\n🏗️ Semantic Units:');
    Object.entries(chunkTypes).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count}`);
    });

    console.log('\n🧠 Business Logic Patterns:');
    Object.entries(businessLogicPatterns).forEach(([pattern, count]) => {
      console.log(`  • ${pattern}: ${count} chunks`);
    });

  } catch (error) {
    console.error('❌ Error during splitting:', error.message);
    console.error(error.stack);
  }
}

function generateAiServiceMarkdown(chunks, filePath, originalCode) {
  const timestamp = new Date().toISOString();
  
  let markdown = `# AI Service Code Analysis

**Generated:** ${timestamp}  
**Source File:** \`${filePath}\`  
**Original Size:** ${originalCode.length} characters (${Math.ceil(originalCode.length / 4)} estimated tokens)  
**Total Chunks:** ${chunks.length}  

## 🤖 AI Service Overview

This document shows the enhanced AST splitter results for \`aiService.js\`, demonstrating:
- Business logic method detection and separation
- Dependency injection pattern recognition
- Async/await pattern handling
- Error handling and logging structure
- Clean separation of service responsibilities

The aiService is a core business logic component that orchestrates AI operations, manages dependencies, and provides a clean interface for AI-related functionality.

---

`;

  chunks.forEach((chunk, index) => {
    const meta = chunk.metadata;
    const units = meta.units || [];
    
    // Analyze chunk content for business patterns
    const content = chunk.pageContent;
    const patterns = [];
    if (content.includes('async ')) patterns.push('Async Operations');
    if (content.includes('try {') || content.includes('catch')) patterns.push('Error Handling');
    if (content.includes('.log.')) patterns.push('Logging');
    if (content.includes('diScope') || content.includes('resolve(')) patterns.push('Dependency Injection');
    if (content.includes('Repository') || content.includes('repository')) patterns.push('Repository Pattern');
    if (content.includes('await ')) patterns.push('Promise Handling');
    if (content.includes('throw ')) patterns.push('Exception Throwing');
    
    markdown += `## Chunk ${index + 1}

**Splitting Method:** \`${meta.splitting}\`  
**Token Count:** ${meta.tokenCount} tokens  
**Character Count:** ${content.length} chars  
**Unit Count:** ${meta.unitCount || 0}  
**SHA1:** \`${meta.sha1}\`  

`;

    if (units.length > 0) {
      markdown += `**Semantic Units:**\n`;
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
    }

    if (patterns.length > 0) {
      markdown += `**Business Logic Patterns Detected:**\n`;
      patterns.forEach(pattern => {
        markdown += `- ${pattern}\n`;
      });
      markdown += '\n';
    }

    if (meta.oversizeOf) {
      markdown += `**Note:** This is a line-window chunk from oversized unit: \`${meta.oversizeOf.type}: ${meta.oversizeOf.name}\`\n\n`;
    }

    // Analyze chunk purpose
    let chunkPurpose = 'Mixed functionality';
    if (content.length < 100) {
      chunkPurpose = 'Structural code (imports, exports, declarations)';
    } else if (content.includes('class ')) {
      chunkPurpose = 'Class definition with methods';
    } else if (content.includes('async ') && content.includes('function')) {
      chunkPurpose = 'Async business method';
    } else if (content.includes('constructor')) {
      chunkPurpose = 'Constructor and initialization';
    } else if (content.includes('module.exports')) {
      chunkPurpose = 'Module export configuration';
    }

    markdown += `**Purpose:** ${chunkPurpose}

### Full Code Content

\`\`\`javascript
${content}
\`\`\`

---

`;
  });

  // Add comprehensive analysis
  const totalTokens = chunks.reduce((sum, c) => sum + c.metadata.tokenCount, 0);
  const avgTokens = Math.round(totalTokens / chunks.length);
  const minTokens = Math.min(...chunks.map(c => c.metadata.tokenCount));
  const maxTokens = Math.max(...chunks.map(c => c.metadata.tokenCount));

  const splitMethods = {};
  const unitTypes = {};
  const businessPatterns = {
    async: 0,
    errorHandling: 0,
    logging: 0,
    diContainer: 0,
    repositories: 0
  };
  
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
    
    const content = chunk.pageContent;
    if (content.includes('async ')) businessPatterns.async++;
    if (content.includes('try {') || content.includes('catch')) businessPatterns.errorHandling++;
    if (content.includes('.log.')) businessPatterns.logging++;
    if (content.includes('diScope') || content.includes('resolve(')) businessPatterns.diContainer++;
    if (content.includes('Repository') || content.includes('repository')) businessPatterns.repositories++;
  });

  markdown += `## 📊 Comprehensive Analysis

### Chunk Distribution
| Metric | Value |
|--------|-------|
| Total Chunks | ${chunks.length} |
| Total Tokens | ${totalTokens} |
| Average Tokens per Chunk | ${avgTokens} |
| Min Tokens | ${minTokens} |
| Max Tokens | ${maxTokens} |
| Original File Tokens | ${Math.ceil(originalCode.length / 4)} |
| Processing Efficiency | ${((totalTokens / Math.ceil(originalCode.length / 4)) * 100).toFixed(1)}% |

### Splitting Methods Used
`;

  Object.entries(splitMethods).forEach(([method, count]) => {
    const percentage = ((count / chunks.length) * 100).toFixed(1);
    markdown += `- **${method}**: ${count} chunks (${percentage}%)\n`;
  });

  markdown += `\n### Semantic Unit Types
`;

  Object.entries(unitTypes).forEach(([type, count]) => {
    const percentage = ((count / chunks.length) * 100).toFixed(1);
    markdown += `- **${type}**: ${count} occurrences (${percentage}%)\n`;
  });

  markdown += `\n### Business Logic Patterns
`;

  Object.entries(businessPatterns).forEach(([pattern, count]) => {
    if (count > 0) {
      const percentage = ((count / chunks.length) * 100).toFixed(1);
      markdown += `- **${pattern}**: Found in ${count} chunks (${percentage}%)\n`;
    }
  });

  markdown += `\n## 🎯 AI Service Architecture Insights

This analysis reveals the structure and patterns of the AI Service:

1. **Service Layer Design**: Clean separation of concerns with focused methods
2. **Dependency Management**: Extensive use of dependency injection patterns
3. **Error Handling Strategy**: Consistent error handling and logging throughout
4. **Async Architecture**: Heavy use of async/await for non-blocking operations
5. **Repository Integration**: Clean data access layer integration

The chunking demonstrates how the AST splitter can effectively break down complex business logic into digestible, contextually meaningful pieces perfect for RAG applications and code understanding.

### RAG Optimization Benefits

Each chunk provides focused context for specific queries:
- **"How does AI service handle errors?"** → Error handling chunks
- **"Show me async methods"** → Async operation chunks  
- **"What dependencies does this use?"** → DI container chunks
- **"How is logging implemented?"** → Logging pattern chunks

This granular approach enables precise retrieval and better code understanding for both humans and AI systems.
`;

  return markdown;
}

// Run the test
testAiServiceSplitting().catch(console.error);