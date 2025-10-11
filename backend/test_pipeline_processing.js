const fs = require('fs');
const path = require('path');
const { Document } = require('langchain/document');

// Import the pipeline components
const CodePreprocessor = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/processors/codePreprocessor');
const UbiquitousLanguageEnhancer = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/enhancers/ubiquitousLanguageEnhancer');
const ASTCodeSplitter = require('./business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter');

async function processFileForTesting(filePath) {
  console.log(`=== PROCESSING FILE: ${filePath} ===\n`);
  
  // Check if file exists
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ File not found: ${fullPath}`);
    return;
  }
  
  // Read file content
  const fileContent = fs.readFileSync(fullPath, 'utf8');
  const fileExtension = path.extname(filePath);
  
  console.log(`📁 File: ${filePath}`);
  console.log(`📏 Original size: ${fileContent.length} characters`);
  console.log(`🏷️ Extension: ${fileExtension}`);
  console.log('');
  
  // Create initial document
  const originalDocument = new Document({
    pageContent: fileContent,
    metadata: { 
      source: filePath,
      type: 'code',
      originalSize: fileContent.length
    }
  });
  
  try {
    // Initialize components
    console.log('🔧 Initializing pipeline components...');
    const codePreprocessor = new CodePreprocessor({
      excludeImportsFromChunking: true,
      preserveDocComments: true,
      normalizeWhitespace: true,
      extractStructuralInfo: true
    });
    
    const ubiquitousLanguageEnhancer = new UbiquitousLanguageEnhancer();
    
    const astCodeSplitter = new ASTCodeSplitter({
      maxTokens: 300,          // Small tokens to force splitting
      minTokens: 50,
      overlapTokens: 50,
      includeImportsInContext: true,
      mergeSmallChunks: true,
      semanticCoherence: true
    });
    
    console.log('✅ Components initialized\n');
    
    // Step 1: Code preprocessing
    console.log('🔧 Step 1: Code preprocessing...');
    const preprocessedDocument = await codePreprocessor.preprocessCodeDocument(originalDocument, {
      excludeImportsFromChunking: true,
      preserveDocComments: true,
      removeLogStatements: true,
      preserveErrorLogs: true,
      preserveWarnLogs: false,
      addStructuralMarkers: false
    });
    
    console.log(`📏 After preprocessing: ${preprocessedDocument.pageContent.length} characters`);
    console.log('✅ Code preprocessing completed\n');
    
    // Step 2: Ubiquitous language enhancement
    console.log('📚 Step 2: Ubiquitous language enhancement...');
    const ubiquitousEnhanced = await ubiquitousLanguageEnhancer.enhanceWithUbiquitousLanguage(preprocessedDocument);
    
    console.log(`📏 After ubiquitous enhancement: ${ubiquitousEnhanced.pageContent.length} characters`);
    console.log('✅ Ubiquitous language enhancement completed\n');
    
    // Step 3: AST-based code splitting
    console.log('✂️ Step 3: AST-based code splitting...');
    const chunks = await astCodeSplitter.splitDocument(ubiquitousEnhanced);
    
    console.log(`📦 Generated ${chunks.length} chunks`);
    console.log('✅ AST code splitting completed\n');
    
    // Generate markdown report
    const markdownReport = generateMarkdownReport({
      filePath,
      fileExtension,
      originalSize: fileContent.length,
      preprocessedSize: preprocessedDocument.pageContent.length,
      enhancedSize: ubiquitousEnhanced.pageContent.length,
      chunks,
      originalContent: fileContent,
      preprocessedContent: preprocessedDocument.pageContent,
      enhancedContent: ubiquitousEnhanced.pageContent
    });
    
    // Save report to file
    const reportFileName = `processing_report_${path.basename(filePath, fileExtension)}.md`;
    fs.writeFileSync(reportFileName, markdownReport);
    
    console.log(`📄 Markdown report saved to: ${reportFileName}`);
    console.log('\n=== PROCESSING COMPLETED ===');
    
    return {
      chunks,
      reportFileName,
      stats: {
        originalSize: fileContent.length,
        preprocessedSize: preprocessedDocument.pageContent.length,
        enhancedSize: ubiquitousEnhanced.pageContent.length,
        chunksGenerated: chunks.length
      }
    };
    
  } catch (error) {
    console.error('❌ Error processing file:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

function generateMarkdownReport(data) {
  const {
    filePath,
    fileExtension,
    originalSize,
    preprocessedSize,
    enhancedSize,
    chunks,
    originalContent,
    preprocessedContent,
    enhancedContent
  } = data;
  
  let markdown = `# Code Processing Pipeline Report\n\n`;
  markdown += `**File:** \`${filePath}\`\n`;
  markdown += `**Extension:** \`${fileExtension}\`\n`;
  markdown += `**Processed:** ${new Date().toISOString()}\n\n`;
  
  // Processing Statistics
  markdown += `## 📊 Processing Statistics\n\n`;
  markdown += `| Stage | Size (chars) | Change |\n`;
  markdown += `|-------|--------------|--------|\n`;
  markdown += `| Original | ${originalSize.toLocaleString()} | - |\n`;
  markdown += `| After Preprocessing | ${preprocessedSize.toLocaleString()} | ${preprocessedSize > originalSize ? '+' : ''}${((preprocessedSize - originalSize) / originalSize * 100).toFixed(1)}% |\n`;
  markdown += `| After Enhancement | ${enhancedSize.toLocaleString()} | ${enhancedSize > preprocessedSize ? '+' : ''}${((enhancedSize - preprocessedSize) / preprocessedSize * 100).toFixed(1)}% |\n`;
  markdown += `| **Total Chunks Generated** | **${chunks.length}** | **Final** |\n\n`;
  
  // Chunk Analysis
  markdown += `## 🧩 Chunk Analysis\n\n`;
  
  if (chunks.length > 0) {
    const avgChunkSize = Math.round(chunks.reduce((sum, chunk) => sum + chunk.pageContent.length, 0) / chunks.length);
    const minChunkSize = Math.min(...chunks.map(chunk => chunk.pageContent.length));
    const maxChunkSize = Math.max(...chunks.map(chunk => chunk.pageContent.length));
    
    markdown += `- **Total Chunks:** ${chunks.length}\n`;
    markdown += `- **Average Size:** ${avgChunkSize.toLocaleString()} characters\n`;
    markdown += `- **Size Range:** ${minChunkSize.toLocaleString()} - ${maxChunkSize.toLocaleString()} characters\n\n`;
    
    // Chunk breakdown table
    markdown += `### Chunk Breakdown\n\n`;
    markdown += `| Chunk | Size (chars) | Type | Functions | Classes | Complexity |\n`;
    markdown += `|-------|--------------|------|-----------|---------|------------|\n`;
    
    chunks.forEach((chunk, index) => {
      const metadata = chunk.metadata || {};
      const size = chunk.pageContent.length;
      const type = metadata.semantic_type || 'unknown';
      const functions = (metadata.function_names || []).slice(0, 3).join(', ') || 'none';
      const classes = (metadata.class_names || []).slice(0, 2).join(', ') || 'none';
      const complexity = metadata.complexity_score || 0;
      
      markdown += `| ${index + 1} | ${size.toLocaleString()} | ${type} | ${functions} | ${classes} | ${complexity} |\n`;
    });
    
    markdown += `\n`;
  }
  
  // Pipeline Steps Detail
  markdown += `## 🔄 Pipeline Processing Steps\n\n`;
  
  // Step 1: Original Content
  markdown += `### Step 0: Original Content\n\n`;
  markdown += `\`\`\`${fileExtension.slice(1) || 'text'}\n`;
  markdown += originalContent;
  markdown += `\n\`\`\`\n\n`;
  
  // Step 1: Code Preprocessing
  markdown += `### Step 1: Code Preprocessing Result\n\n`;
  markdown += `**Changes Applied:**\n`;
  markdown += `- ✅ Remove import statements for cleaner chunking\n`;
  markdown += `- ✅ Preserve documentation comments\n`;
  markdown += `- ✅ Remove log statements (preserve errors)\n`;
  markdown += `- ✅ Normalize whitespace\n\n`;
  
  markdown += `\`\`\`${fileExtension.slice(1) || 'text'}\n`;
  markdown += preprocessedContent;
  markdown += `\n\`\`\`\n\n`;
  
  // Step 2: Ubiquitous Language Enhancement
  markdown += `### Step 2: Ubiquitous Language Enhancement Result\n\n`;
  markdown += `**Domain Context Added:**\n`;
  markdown += `- 📚 Business domain terminology enrichment\n`;
  markdown += `- 🏗️ Architectural pattern context\n`;
  markdown += `- 🔧 Technical implementation context\n`;
  markdown += `- 📋 Metadata enhancement for better retrieval\n\n`;
  
  markdown += `\`\`\`${fileExtension.slice(1) || 'text'}\n`;
  markdown += enhancedContent;
  markdown += `\n\`\`\`\n\n`;
  
  // Step 3: AST Splitting Results
  markdown += `### Step 3: AST Code Splitting Results\n\n`;
  
  if (chunks.length > 0) {
    chunks.forEach((chunk, index) => {
      markdown += `#### Chunk ${index + 1}\n\n`;
      
      const metadata = chunk.metadata || {};
      markdown += `**Metadata:**\n`;
      markdown += `- **Type:** ${metadata.semantic_type || 'unknown'}\n`;
      markdown += `- **Size:** ${chunk.pageContent.length} characters\n`;
      markdown += `- **Functions:** ${(metadata.function_names || []).join(', ') || 'none'}\n`;
      markdown += `- **Classes:** ${(metadata.class_names || []).join(', ') || 'none'}\n`;
      markdown += `- **Complexity Score:** ${metadata.complexity_score || 0}\n`;
      markdown += `- **Has Imports:** ${metadata.has_imports ? 'Yes' : 'No'}\n`;
      markdown += `- **Enhanced with Imports:** ${metadata.enhanced_with_imports ? 'Yes' : 'No'}\n`;
      
      if (metadata.node_type) {
        markdown += `- **AST Node Type:** ${metadata.node_type}\n`;
      }
      
      if (metadata.split_method) {
        markdown += `- **Split Method:** ${metadata.split_method}\n`;
      }
      
      markdown += `\n**Content:**\n\n`;
      markdown += `\`\`\`${fileExtension.slice(1) || 'text'}\n`;
      markdown += chunk.pageContent;
      markdown += `\n\`\`\`\n\n`;
    });
  } else {
    markdown += `*No chunks generated - content may have been too small or parsing failed.*\n\n`;
  }
  
  // Summary
  markdown += `## 📋 Summary\n\n`;
  markdown += `The code processing pipeline successfully processed \`${filePath}\` through three stages:\n\n`;
  markdown += `1. **Code Preprocessing**: Cleaned and normalized the code, removing noise like imports and log statements\n`;
  markdown += `2. **Ubiquitous Language Enhancement**: Added domain-specific context and metadata for better semantic understanding\n`;
  markdown += `3. **AST Code Splitting**: Intelligently split the code into ${chunks.length} semantic chunks using AST analysis\n\n`;
  
  if (chunks.length > 0) {
    markdown += `The resulting chunks are optimized for RAG (Retrieval-Augmented Generation) applications, with semantic coherence and appropriate size for embedding models.\n\n`;
  }
  
  markdown += `---\n*Report generated on ${new Date().toISOString()}*`;
  
  return markdown;
}

function truncateContent(content, maxLength) {
  // Return full content without truncation for complete analysis
  return content;
}

// Handle command line arguments
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Usage: node test_pipeline_processing.js <file-path>');
    console.log('Example: node test_pipeline_processing.js ./backend/app.js');
    process.exit(1);
  }
  
  processFileForTesting(filePath)
    .then((result) => {
      console.log('\n✅ Processing completed successfully!');
      if (result?.reportFileName) {
        console.log(`📄 Report saved to: ${result.reportFileName}`);
      }
    })
    .catch((error) => {
      console.error('\n❌ Processing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { processFileForTesting };