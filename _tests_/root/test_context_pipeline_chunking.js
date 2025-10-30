#!/usr/bin/env node

const fs = require('fs');
const ContextPipeline = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/contextPipeline.js');

async function testContextPipelineChunking() {
  console.log('🧪 Testing ContextPipeline Chunking Integration...\n');

  try {
    // Initialize the ContextPipeline with minimal config
    const pipeline = new ContextPipeline({
      embeddings: null, // Mock - not needed for chunking test
      eventBus: null,   // Mock - not needed for chunking test
      pineconeLimiter: null, // Mock - not needed for chunking test
      config: {
        maxTokens: 500,    // Test with our fixed token-based config
        minTokens: 30,
        overlapTokens: 50
      }
    });

    console.log('✅ ContextPipeline instantiated successfully');

    // Test with diPlugin.js - the file we were discussing
    const testFilePath = './backend/diPlugin.js';
    
    if (!fs.existsSync(testFilePath)) {
      console.error('❌ Test file not found:', testFilePath);
      return;
    }

    const sourceCode = fs.readFileSync(testFilePath, 'utf-8');
    console.log(`📁 Testing file: ${testFilePath}`);
    console.log(`📊 Original size: ${sourceCode.length} characters`);
    console.log(`📏 Estimated tokens: ${Math.ceil(sourceCode.length / 4)}\n`);

    // Create a document in the expected format
    const document = {
      pageContent: sourceCode,
      metadata: {
        source: testFilePath,
        fileType: 'javascript',
        contentType: 'code'
      }
    };

    console.log('🚀 Processing document through ContextPipeline...');
    
    // Process the document through the code processing pipeline
    const chunks = await pipeline.processCodeDocument(document);
    
    console.log(`\n✅ Successfully processed document into ${chunks.length} chunks\n`);

    // Analyze the results
    console.log('📋 Chunk Analysis:');
    let totalTokens = 0;
    const chunkSizes = [];
    const splittingMethods = {};

    chunks.forEach((chunk, i) => {
      const tokenCount = chunk.metadata.tokenCount || 0;
      const splitting = chunk.metadata.splitting || 'unknown';
      const unitType = chunk.metadata.unit?.type || 'no_unit';
      
      totalTokens += tokenCount;
      chunkSizes.push(tokenCount);
      splittingMethods[splitting] = (splittingMethods[splitting] || 0) + 1;
      
      console.log(`  Chunk ${i+1}: ${tokenCount} tokens - ${splitting} (${unitType})`);
    });

    console.log(`\n📊 Summary:`);
    console.log(`  • Total chunks: ${chunks.length}`);
    console.log(`  • Total tokens: ${totalTokens}`);
    console.log(`  • Average chunk size: ${Math.round(totalTokens / chunks.length)} tokens`);
    console.log(`  • Min chunk size: ${Math.min(...chunkSizes)} tokens`);
    console.log(`  • Max chunk size: ${Math.max(...chunkSizes)} tokens`);

    console.log(`\n🏗️ Splitting Methods Used:`);
    Object.entries(splittingMethods).forEach(([method, count]) => {
      console.log(`  • ${method}: ${count} chunks`);
    });

    // Verify the fix worked
    if (chunks.length > 1) {
      console.log('\n🎉 SUCCESS: Chunking is working properly!');
      console.log('✅ File was split into multiple semantic chunks instead of one large chunk');
    } else {
      console.log('\n❌ ISSUE: Still getting only 1 chunk - chunking may not be working');
    }

    // Generate a detailed report
    const reportContent = generateChunkingReport(chunks, testFilePath, sourceCode);
    const reportPath = './contextPipeline_chunking_test_report.md';
    fs.writeFileSync(reportPath, reportContent, 'utf-8');
    console.log(`📝 Detailed report generated: ${reportPath}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

function generateChunkingReport(chunks, filePath, originalCode) {
  const timestamp = new Date().toISOString();
  
  let report = `# ContextPipeline Chunking Test Report

**Generated:** ${timestamp}  
**Source File:** \`${filePath}\`  
**Original Size:** ${originalCode.length} characters (${Math.ceil(originalCode.length / 4)} estimated tokens)  
**Total Chunks:** ${chunks.length}  

## 🔄 Processing Results

### 📊 Chunk Statistics
`;

  chunks.forEach((chunk, i) => {
    const tokenCount = chunk.metadata.tokenCount || 0;
    const splitting = chunk.metadata.splitting || 'unknown';
    const unitType = chunk.metadata.unit?.type || 'no_unit';
    const unitName = chunk.metadata.unit?.name || 'unnamed';
    
    report += `
## Chunk ${i + 1}: ${unitType} (${tokenCount} tokens)

**Type:** ${unitType}  
**Name:** ${unitName}  
**Splitting Method:** ${splitting}  
**Token Count:** ${tokenCount}  

### Content Preview
\`\`\`javascript
${chunk.pageContent.substring(0, 300)}${chunk.pageContent.length > 300 ? '...' : ''}
\`\`\`

---
`;
  });

  report += `
## 🎯 Test Results

- **Chunking Status:** ${chunks.length > 1 ? '✅ WORKING' : '❌ BROKEN'}
- **Multiple Chunks:** ${chunks.length > 1 ? 'Yes' : 'No'}
- **Token-Based Splitting:** ${chunks.some(c => c.metadata.tokenCount) ? 'Yes' : 'No'}
- **AST-Based Splitting:** ${chunks.some(c => c.metadata.splitting === 'ast_semantic') ? 'Yes' : 'No'}

## 🔧 Configuration Used

- **Max Tokens:** 500
- **Min Tokens:** 30  
- **Overlap Tokens:** 50
- **Max Units Per Chunk:** 1
`;

  return report;
}

// Run the test
testContextPipelineChunking().catch(console.error);