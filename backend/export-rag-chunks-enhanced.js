#!/usr/bin/env node

/**
 * RAG Chunks Export Tool - Enhanced Content Reconstruction
 * 
 * This tool fetches and properly reconstructs fragmented RAG chunk data
 * from Google Cloud Logging into complete, readable chunks.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = 'eventstorm-1';
const SERVICE_NAME = 'eventstorm-backend';

function main() {
  console.log(`🚀 RAG Chunks Export Tool - Enhanced`);
  
  const args = process.argv.slice(2);
  const outputFile = args[0] || 'rag-chunks-analysis.md';
  
  console.log(`📄 Output file: ${outputFile}`);
  
  // Step 1: Get the query summary
  console.log(`📥 Step 1: Fetching query summary...`);
  const queryInfo = getQueryInfo();
  
  if (!queryInfo) {
    console.log('⚠️  No query found');
    generateEmptyReport(outputFile);
    return;
  }
  
  console.log(`   Query: "${queryInfo.query}"`);
  console.log(`   Expected chunks: ${queryInfo.chunkCount}`);
  console.log(`   Timestamp: ${queryInfo.timestamp}`);
  
  // Step 2: Get ALL logs in the time window 
  console.log(`📥 Step 2: Fetching all chunk-related logs...`);
  const allLogs = getAllChunkLogs(queryInfo.timestamp);
  console.log(`   Found ${allLogs.length} log entries`);
  
  // Step 3: Reconstruct complete chunks
  console.log(`🔧 Step 3: Reconstructing complete chunks...`);
  const chunks = reconstructChunks(allLogs);
  console.log(`   Reconstructed ${chunks.length} complete chunks`);
  
  // Step 4: Generate report
  console.log(`📝 Step 4: Generating report...`);
  const report = generateEnhancedReport({
    ...queryInfo,
    chunks
  });
  
  // Step 5: Save to file
  const outputPath = path.resolve(outputFile);
  fs.writeFileSync(outputPath, report);
  
  console.log(`✅ Enhanced report generated successfully!`);
  console.log(`📁 File saved to: ${outputPath}`);
  console.log(`📊 Analyzed 1 query with ${chunks.length} complete chunks`);
  
  // Show preview of first chunk
  if (chunks.length > 0) {
    console.log('');
    console.log('📋 Preview of first chunk:');
    console.log(`   Source: ${chunks[0].source}`);
    console.log(`   Type: ${chunks[0].type}`);
    console.log(`   Content length: ${chunks[0].content.length} characters`);
    console.log(`   Content preview: "${chunks[0].content.substring(0, 100)}..."`);
  }
}

function getQueryInfo() {
  const command = `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND textPayload:"📋 CHUNK CONTENT LOGGING"' --project=${PROJECT_ID} --limit=1 --format=json`;
  
  try {
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const logs = JSON.parse(output || '[]');
    
    if (logs.length === 0) return null;
    
    const log = logs[0];
    const text = log.textPayload || '';
    const match = text.match(/Retrieved (\d+) chunks for query: "([^"]+)"/);
    
    if (!match) return null;
    
    const [, chunkCount, query] = match;
    return {
      query,
      chunkCount: parseInt(chunkCount),
      timestamp: log.timestamp
    };
  } catch (error) {
    console.error('❌ Error fetching query info:', error.message);
    return null;
  }
}

function getAllChunkLogs(queryTime) {
  // Create a wider time window to capture all related logs
  const baseTime = new Date(queryTime);
  const startTime = new Date(baseTime.getTime() - 3 * 60 * 1000); // 3 minutes before
  const endTime = new Date(baseTime.getTime() + 3 * 60 * 1000);   // 3 minutes after
  
  const command = `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND (textPayload:"📄 CHUNK" OR textPayload:"📝 Content:" OR textPayload:"🏷️") AND timestamp >= "${startTime.toISOString()}" AND timestamp <= "${endTime.toISOString()}"' --project=${PROJECT_ID} --limit=200 --format=json`;
  
  try {
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const logs = JSON.parse(output || '[]');
    
    // Sort by timestamp for proper reconstruction
    return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } catch (error) {
    console.error('❌ Error fetching chunk logs:', error.message);
    return [];
  }
}

function reconstructChunks(logs) {
  const chunks = [];
  let currentChunk = null;
  let currentContentParts = [];
  
  for (const log of logs) {
    const text = log.textPayload || '';
    
    // Detect new chunk header
    if (text.includes('📄 CHUNK')) {
      // Save previous chunk if exists
      if (currentChunk) {
        currentChunk.content = currentContentParts.join('\\n').trim();
        chunks.push(currentChunk);
      }
      
      // Parse chunk header
      const match = text.match(/📄 CHUNK (\d+)\/(\d+):/);
      if (match) {
        const [, chunkNum, totalChunks] = match;
        currentChunk = {
          number: parseInt(chunkNum),
          total: parseInt(totalChunks),
          source: '',
          type: '',
          score: '',
          content: ''
        };
        currentContentParts = [];
      }
    }
    
    // Collect content parts
    if (text.includes('📝 Content:') && currentChunk) {
      const content = text.replace(/.*📝 Content:\s*/, '').trim();
      if (content && content !== 'FILE: ROOT_DOCUMENTATION.md') {
        currentContentParts.push(content);
      }
    }
    
    // Extract metadata
    if (text.includes('🏷️ Source:') && currentChunk) {
      currentChunk.source = text.replace(/.*🏷️ Source:\s*/, '').trim();
    }
    
    if (text.includes('🏷️ Type:') && currentChunk) {
      currentChunk.type = text.replace(/.*🏷️ Type:\s*/, '').trim();
    }
    
    if (text.includes('🏷️ Score:') && currentChunk) {
      currentChunk.score = text.replace(/.*🏷️ Score:\s*/, '').trim();
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk) {
    currentChunk.content = currentContentParts.join('\\n').trim();
    chunks.push(currentChunk);
  }
  
  // Sort chunks by number
  return chunks.sort((a, b) => a.number - b.number);
}

function generateEnhancedReport(data) {
  const { query, timestamp, chunkCount, chunks } = data;
  
  let markdown = `# RAG Chunks Analysis Report - Enhanced

Generated on: ${new Date().toLocaleString()}
Project: ${PROJECT_ID}
Service: ${SERVICE_NAME}

---

## Query Analysis

**Query:** "${query}"  
**Timestamp:** ${new Date(timestamp).toLocaleString()}  
**Expected Chunks:** ${chunkCount}  
**Successfully Reconstructed:** ${chunks.length}

---

## Complete Chunk Details

`;

  chunks.forEach((chunk, index) => {
    markdown += `### Chunk ${chunk.number}/${chunk.total}

**Source:** \`${chunk.source || 'Unknown'}\`  
**Type:** ${chunk.type || 'Unknown'}  
**Score:** ${chunk.score || 'N/A'}  
**Content Length:** ${chunk.content.length} characters

**Full Content:**
\`\`\`
${chunk.content || 'No content reconstructed'}
\`\`\`

`;

    if (index < chunks.length - 1) {
      markdown += `---

`;
    }
  });
  
  // Enhanced statistics
  const sourceStats = new Map();
  const typeStats = new Map();
  let totalContentLength = 0;
  
  chunks.forEach(chunk => {
    const source = chunk.source || 'Unknown';
    const type = chunk.type || 'Unknown';
    sourceStats.set(source, (sourceStats.get(source) || 0) + 1);
    typeStats.set(type, (typeStats.get(type) || 0) + 1);
    totalContentLength += chunk.content.length;
  });
  
  markdown += `

---

## Enhanced Statistics

### Content Overview
- **Total Chunks:** ${chunks.length}
- **Average Content Length:** ${Math.round(totalContentLength / chunks.length)} characters
- **Total Content Length:** ${totalContentLength} characters

### Source File Distribution
`;

  Array.from(sourceStats.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      markdown += `- **${source}:** ${count} chunks\n`;
    });

  markdown += `
### Document Type Distribution
`;

  Array.from(typeStats.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      markdown += `- **${type}:** ${count} chunks\n`;
    });

  markdown += `

---

## Reconstruction Quality

`;

  // Quality metrics
  const chunksWithContent = chunks.filter(c => c.content.length > 0).length;
  const chunksWithSource = chunks.filter(c => c.source && c.source !== 'Unknown').length;
  const chunksWithType = chunks.filter(c => c.type && c.type !== 'Unknown').length;

  markdown += `- **Chunks with Content:** ${chunksWithContent}/${chunks.length} (${Math.round(chunksWithContent/chunks.length*100)}%)
- **Chunks with Source:** ${chunksWithSource}/${chunks.length} (${Math.round(chunksWithSource/chunks.length*100)}%)
- **Chunks with Type:** ${chunksWithType}/${chunks.length} (${Math.round(chunksWithType/chunks.length*100)}%)

---

## Usage Notes

This enhanced report reconstructs fragmented chunk content from Google Cloud Logging.

**To regenerate:**
\`\`\`bash
node export-rag-chunks-enhanced.js [output-file.md]
\`\`\`

**To view real-time logging:**
\`\`\`bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND textPayload:"📋 CHUNK CONTENT LOGGING"' --project=${PROJECT_ID} --limit=10
\`\`\`
`;

  return markdown;
}

function generateEmptyReport(outputFile) {
  const markdown = `# RAG Chunks Analysis Report - Enhanced

Generated on: ${new Date().toLocaleString()}
Project: ${PROJECT_ID}
Service: ${SERVICE_NAME}

---

## No Data Found

No RAG chunk logging data was found.

**Next steps:**
1. Ensure RAG_ENABLE_CHUNK_LOGGING=true is set
2. Make a new query to generate fresh chunk data
3. Run this tool again

**Check environment:**
\`\`\`bash
gcloud run services describe ${SERVICE_NAME} --region=me-west1 --project=${PROJECT_ID} --format="value(spec.template.spec.containers[0].env[].name,spec.template.spec.containers[0].env[].value)" | grep RAG_ENABLE
\`\`\`
`;

  const outputPath = path.resolve(outputFile);
  fs.writeFileSync(outputPath, markdown);
  console.log(`✅ Empty report generated at: ${outputPath}`);
}

// Run the tool
if (require.main === module) {
  main();
}
