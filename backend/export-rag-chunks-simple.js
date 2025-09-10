#!/usr/bin/env node

/**
 * RAG Chunks Export Tool - Simplified Version
 * 
 * This tool fetches and organizes RAG chunk logging data from Google Cloud Logging
 * into a readable, structured format for analysis and debugging.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = 'eventstorm-1';
const SERVICE_NAME = 'eventstorm-backend';

function main() {
  console.log(`🚀 RAG Chunks Export Tool - Simplified`);
  
  // Get timestamp from args or use recent time
  const args = process.argv.slice(2);
  const outputFile = args[0] || 'rag-chunks-analysis.md';
  
  console.log(`📄 Output file: ${outputFile}`);
  
  // Fetch the query summary log first
  console.log(`📥 Fetching query summary...`);
  
  const queryCommand = `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND textPayload:"📋 CHUNK CONTENT LOGGING"' --project=${PROJECT_ID} --limit=5 --format=json`;
  
  let queryLogs = [];
  try {
    const output = execSync(queryCommand, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    queryLogs = JSON.parse(output || '[]');
  } catch (error) {
    console.error('❌ Error fetching query logs:', error.message);
  }
  
  if (queryLogs.length === 0) {
    console.log('⚠️  No query logs found');
    generateEmptyReport(outputFile);
    return;
  }
  
  // Extract query info from the first log
  const queryLog = queryLogs[0];
  const queryText = queryLog.textPayload || '';
  const queryMatch = queryText.match(/Retrieved (\d+) chunks for query: "([^"]+)"/);
  
  if (!queryMatch) {
    console.log('⚠️  Could not parse query information');
    generateEmptyReport(outputFile);
    return;
  }
  
  const [, chunkCount, query] = queryMatch;
  const queryTime = queryLog.timestamp;
  
  console.log(`   Found query: "${query}" with ${chunkCount} chunks`);
  console.log(`   Timestamp: ${queryTime}`);
  
  // Create time window around the query
  const baseTime = new Date(queryTime);
  const startTime = new Date(baseTime.getTime() - 2 * 60 * 1000); // 2 minutes before
  const endTime = new Date(baseTime.getTime() + 2 * 60 * 1000);   // 2 minutes after
  
  // Fetch all chunk-related logs in that time window
  console.log(`📥 Fetching chunk details...`);
  
  const chunkCommand = `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND (textPayload:"📄 CHUNK" OR textPayload:"📝 Content:" OR textPayload:"🏷️") AND timestamp >= "${startTime.toISOString()}" AND timestamp <= "${endTime.toISOString()}"' --project=${PROJECT_ID} --limit=100 --format=json`;
  
  let chunkLogs = [];
  try {
    const output = execSync(chunkCommand, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    chunkLogs = JSON.parse(output || '[]');
  } catch (error) {
    console.error('❌ Error fetching chunk logs:', error.message);
  }
  
  console.log(`   Found ${chunkLogs.length} chunk-related log entries`);
  
  // Parse chunks
  const chunks = parseChunks(chunkLogs);
  
  // Generate report
  const report = generateReport({
    query,
    queryTime,
    chunkCount: parseInt(chunkCount),
    chunks
  });
  
  // Write to file
  const outputPath = path.resolve(outputFile);
  fs.writeFileSync(outputPath, report);
  
  console.log(`✅ Report generated successfully!`);
  console.log(`📁 File saved to: ${outputPath}`);
  console.log(`📊 Analyzed 1 query with ${chunks.length} chunks`);
}

function parseChunks(logs) {
  // Sort logs by timestamp
  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  const chunks = [];
  let currentChunk = null;
  
  for (const log of logs) {
    const text = log.textPayload || '';
    
    // Detect chunk header
    if (text.includes('📄 CHUNK')) {
      const match = text.match(/📄 CHUNK (\d+)\/(\d+):/);
      if (match) {
        const [, chunkNum, totalChunks] = match;
        
        // Save previous chunk if exists
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // Create new chunk
        currentChunk = {
          number: parseInt(chunkNum),
          total: parseInt(totalChunks),
          content: '',
          source: '',
          type: '',
          score: ''
        };
      }
    }
    
    // Extract chunk content
    if (text.includes('📝 Content:') && currentChunk) {
      currentChunk.content = text.replace(/.*📝 Content:\s*/, '').trim();
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
    chunks.push(currentChunk);
  }
  
  return chunks.sort((a, b) => a.number - b.number);
}

function generateReport(data) {
  const { query, queryTime, chunkCount, chunks } = data;
  
  let markdown = `# RAG Chunks Analysis Report

Generated on: ${new Date().toLocaleString()}
Project: ${PROJECT_ID}
Service: ${SERVICE_NAME}

---

## Query Analysis

**Query:** "${query}"  
**Timestamp:** ${new Date(queryTime).toLocaleString()}  
**Expected Chunks:** ${chunkCount}  
**Retrieved Chunks:** ${chunks.length}

---

## Retrieved Chunks

`;

  chunks.forEach((chunk, index) => {
    markdown += `### Chunk ${chunk.number}/${chunk.total}

**Source:** \`${chunk.source}\`  
**Type:** ${chunk.type}  
**Score:** ${chunk.score}

**Content:**
\`\`\`
${chunk.content}
\`\`\`

`;

    if (index < chunks.length - 1) {
      markdown += `---

`;
    }
  });
  
  // Statistics
  const sourceStats = new Map();
  const typeStats = new Map();
  
  chunks.forEach(chunk => {
    const source = chunk.source || 'Unknown';
    const type = chunk.type || 'Unknown';
    sourceStats.set(source, (sourceStats.get(source) || 0) + 1);
    typeStats.set(type, (typeStats.get(type) || 0) + 1);
  });
  
  markdown += `

---

## Statistics

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

## Usage Notes

This report was generated from Google Cloud Logging data for the RAG pipeline.

**To view real-time chunk logging:**
\`\`\`bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND textPayload:"📋 CHUNK CONTENT LOGGING"' --project=${PROJECT_ID} --limit=10
\`\`\`
`;

  return markdown;
}

function generateEmptyReport(outputFile) {
  const markdown = `# RAG Chunks Analysis Report

Generated on: ${new Date().toLocaleString()}
Project: ${PROJECT_ID}
Service: ${SERVICE_NAME}

---

## No Data Found

No RAG chunk logging data was found.

**Possible reasons:**
- No queries were processed recently
- RAG_ENABLE_CHUNK_LOGGING environment variable is not set to 'true'
- The query logs have expired

**To enable chunk logging:**
\`\`\`bash
# Check if chunk logging is enabled
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
