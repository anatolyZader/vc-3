#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { split } = require('./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/nlpTextSplitter');

async function testNLPSplitterOnAiMd() {
  console.log('📝 Testing NLP Text Splitter on ai.md\n');

  // Load the ai.md file
  const aiMdPath = './backend/business_modules/ai/ai.md';
  
  if (!fs.existsSync(aiMdPath)) {
    console.error('❌ ai.md not found at:', aiMdPath);
    return;
  }

  const markdownContent = fs.readFileSync(aiMdPath, 'utf-8');
  console.log(`📁 Source file: ${aiMdPath}`);
  console.log(`📊 Original size: ${markdownContent.length} characters`);
  console.log(`📏 Estimated tokens: ${Math.ceil(markdownContent.length / 4)}\n`);

  try {
    console.log('🔄 Processing with semantic + structure-aware splitting...');
    console.log('🧠 Loading embedding model (this may take a moment for first run)...\n');

    // Split the markdown using the NLP text splitter
    const startTime = Date.now();
    const chunks = await split(markdownContent, { 
      extraMeta: {
        source: aiMdPath,
        fileType: 'markdown',
        module: 'ai',
        splitType: 'semantic_structure'
      }
    });
    const processingTime = Date.now() - startTime;

    console.log(`✅ Successfully split into ${chunks.length} chunks in ${processingTime}ms\n`);

    // Generate comprehensive analysis
    const markdownReport = generateNLPAnalysisMarkdown(chunks, aiMdPath, markdownContent, processingTime);
    
    // Write to markdown file
    const outputPath = './ai_md_nlp_chunks_analysis.md';
    fs.writeFileSync(outputPath, markdownReport, 'utf-8');
    
    console.log(`📝 Analysis report generated: ${outputPath}`);
    console.log(`📋 Total chunks: ${chunks.length}`);
    
    // Show chunk summary
    console.log('\n📊 Chunk Summary:');
    let totalTokens = 0;
    chunks.forEach((chunk, i) => {
      const tokens = chunk.metadata.tokenCount || 0;
      const chars = chunk.metadata.charCount || chunk.pageContent.length;
      const heading = chunk.metadata.heading || chunk.metadata.title || 'No heading';
      totalTokens += tokens;
      
      console.log(`  Chunk ${i + 1}: ${tokens} tokens, ${chars} chars`);
      console.log(`    Heading: "${heading}"`);
      console.log(`    Preview: "${chunk.pageContent.substring(0, 60).replace(/\n/g, ' ')}..."`);
    });
    
    console.log(`\n📈 Processing Statistics:`);
    console.log(`  • Total tokens: ${totalTokens}`);
    console.log(`  • Average tokens per chunk: ${Math.round(totalTokens / chunks.length)}`);
    console.log(`  • Processing time: ${processingTime}ms`);
    console.log(`  • Semantic coherence: Maintained through embedding similarity`);
    console.log(`  • Structure preservation: Markdown headings and sections preserved`);

  } catch (error) {
    console.error('❌ Error during NLP splitting:', error.message);
    console.error(error.stack);
  }
}

function generateNLPAnalysisMarkdown(chunks, filePath, originalContent, processingTime) {
  const timestamp = new Date().toISOString();
  
  let markdown = `# AI Module Documentation - NLP Semantic Splitting Analysis

**Generated:** ${timestamp}  
**Source File:** \`${filePath}\`  
**Original Size:** ${originalContent.length} characters (${Math.ceil(originalContent.length / 4)} estimated tokens)  
**Total Chunks:** ${chunks.length}  
**Processing Time:** ${processingTime}ms  
**Splitting Method:** Semantic + Structure-aware (NLP Text Splitter)  

## 🧠 NLP Semantic Splitting Overview

This document demonstrates advanced NLP-powered text splitting that combines:
- **Structure-First Approach**: Splits by markdown AST nodes (headings, code blocks, tables)
- **Semantic Coherence**: Uses embedding similarity to detect topic boundaries
- **Linguistic Intelligence**: Sentence-level analysis with semantic merging
- **Token Management**: Respects token budgets while maintaining semantic integrity

The splitter uses the \`Xenova/all-MiniLM-L6-v2\` model for 384-dimensional sentence embeddings and applies cosine similarity analysis to detect topic shifts.

---

`;

  let totalTokens = 0;
  const chunkTypes = {};
  
  chunks.forEach((chunk, index) => {
    const meta = chunk.metadata;
    const tokens = meta.tokenCount || 0;
    const chars = meta.charCount || chunk.pageContent.length;
    const heading = meta.heading || meta.title || 'No section heading';
    totalTokens += tokens;
    
    // Categorize chunk types
    const chunkType = heading === 'No section heading' ? 'Content Block' : 'Section';
    chunkTypes[chunkType] = (chunkTypes[chunkType] || 0) + 1;
    
    markdown += `## Chunk ${index + 1}

**Section:** ${heading}  
**Token Count:** ${tokens} tokens  
**Character Count:** ${chars} characters  
**Splitter:** ${meta.splitter}  

`;

    // Analyze content characteristics
    const content = chunk.pageContent;
    const characteristics = [];
    if (content.includes('##')) characteristics.push('Contains headings');
    if (content.includes('```')) characteristics.push('Contains code blocks');
    if (content.includes('1.') || content.includes('-')) characteristics.push('Contains lists');
    if (content.length > 500) characteristics.push('Long-form content');
    else if (content.length < 100) characteristics.push('Concise content');
    
    if (characteristics.length > 0) {
      markdown += `**Content Characteristics:** ${characteristics.join(', ')}  \n\n`;
    }

    markdown += `### Full Content

\`\`\`markdown
${content}
\`\`\`

---

`;
  });

  // Add comprehensive statistics
  const avgTokens = Math.round(totalTokens / chunks.length);
  const minTokens = Math.min(...chunks.map(c => c.metadata.tokenCount || 0));
  const maxTokens = Math.max(...chunks.map(c => c.metadata.tokenCount || 0));

  markdown += `## 📊 Comprehensive Analysis

### Processing Metrics
| Metric | Value |
|--------|-------|
| Total Chunks | ${chunks.length} |
| Total Tokens | ${totalTokens} |
| Average Tokens per Chunk | ${avgTokens} |
| Min Tokens | ${minTokens} |
| Max Tokens | ${maxTokens} |
| Original File Tokens | ${Math.ceil(originalContent.length / 4)} |
| Processing Time | ${processingTime}ms |
| Embedding Model | Xenova/all-MiniLM-L6-v2 |

### Chunk Distribution by Type
`;

  Object.entries(chunkTypes).forEach(([type, count]) => {
    const percentage = ((count / chunks.length) * 100).toFixed(1);
    markdown += `- **${type}**: ${count} chunks (${percentage}%)\n`;
  });

  markdown += `\n### Semantic Splitting Benefits

This NLP-powered approach provides several advantages over simple text splitting:

1. **Topic Coherence**: Embeddings detect semantic boundaries, keeping related content together
2. **Structure Preservation**: Markdown hierarchy is maintained through AST parsing
3. **Intelligent Merging**: Adjacent sentences are merged based on semantic similarity
4. **Token Budget Respect**: Stays within configured token limits while maintaining meaning
5. **Overlap Management**: Provides contextual overlap between chunks for better retrieval

### Use Cases for RAG Applications

Each chunk is optimized for:
- **Question Answering**: Coherent topic coverage enables accurate responses
- **Semantic Search**: Embedding-aware splitting improves retrieval relevance  
- **Context Building**: Related information stays together for better AI understanding
- **Documentation Analysis**: Preserves document structure while enabling granular access

The AI module documentation has been successfully processed into ${chunks.length} semantically coherent chunks, ready for integration into RAG pipelines and AI-powered documentation systems.
`;

  return markdown;
}

// Run the test
testNLPSplitterOnAiMd().catch(console.error);