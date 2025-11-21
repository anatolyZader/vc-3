#!/usr/bin/env node

/**
 * RAG Chunks Export Tool
 * 
 * This tool fetches and organizes RAG chunk logging data from Google Cloud Logging
 * into a readable, structured format for analysis and debugging.
 * 
 * Usage:
 *   node export-rag-chunks.js [query-timestamp] [output-file]
 * 
 * Examples:
 *   node export-rag-chunks.js "2025-09-10T17:15:48Z" chunks-analysis.md
 *   node export-rag-chunks.js latest chunks-latest.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ID = 'eventstorm-1';
const SERVICE_NAME = 'eventstorm-backend';

/**
 * Fetch RAG chunk logs from Google Cloud Logging
 */
function fetchChunkLogs(timestamp = 'latest', limit = 50) {
  console.log(`📥 Fetching RAG chunk logs...`);
  
  let timeFilter = '';
  if (timestamp !== 'latest') {
    // Create a time window around the specified timestamp
    const baseTime = new Date(timestamp);
    const startTime = new Date(baseTime.getTime() - 5 * 60 * 1000); // 5 minutes before
    const endTime = new Date(baseTime.getTime() + 5 * 60 * 1000);   // 5 minutes after
    
    timeFilter = `AND timestamp >= "${startTime.toISOString()}" AND timestamp <= "${endTime.toISOString()}"`;
  } else {
    // Get logs from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    timeFilter = `AND timestamp >= "${oneHourAgo.toISOString()}"`;
  }

  const query = `
    resource.type="cloud_run_revision" 
    AND resource.labels.service_name="${SERVICE_NAME}" 
    AND (textPayload:"CHUNK CONTENT LOGGING" OR textPayload:"📄 CHUNK" OR textPayload:"📝 Content:" OR textPayload:"🏷️")
    ${timeFilter}
  `.replace(/\s+/g, ' ').trim();

  try {
    const command = `gcloud logging read '${query}' --project=${PROJECT_ID} --limit=${limit} --format=json`;
    const output = execSync(command, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(output || '[]');
  } catch (error) {
    console.error('❌ Error fetching logs:', error.message);
    return [];
  }
}

/**
 * Parse and organize chunk data from raw logs
 */
function parseChunkData(logs) {
  console.log(`🔍 Parsing ${logs.length} log entries...`);
  
  const queries = new Map();
  let currentQuery = null;
  let currentChunk = null;

  // Sort logs by timestamp
  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  for (const log of logs) {
    const text = log.textPayload || '';
    const timestamp = log.timestamp;

    // Detect new query
    if (text.includes('📋 CHUNK CONTENT LOGGING (temp): Retrieved')) {
      const match = text.match(/Retrieved (\d+) chunks for query: "([^"]+)"/);
      if (match) {
        const [, chunkCount, queryText] = match;
        currentQuery = {
          id: timestamp,
          timestamp,
          query: queryText,
          chunkCount: parseInt(chunkCount),
          chunks: [],
          metadata: {}
        };
        queries.set(currentQuery.id, currentQuery);
      }
    }

    // Detect chunk header
    if (text.includes('📄 CHUNK')) {
      const match = text.match(/📄 CHUNK (\d+)\/(\d+):/);
      if (match && currentQuery) {
        const [, chunkNum, totalChunks] = match;
        currentChunk = {
          number: parseInt(chunkNum),
          total: parseInt(totalChunks),
          content: '',
          source: '',
          type: '',
          score: '',
          metadata: {}
        };
        currentQuery.chunks.push(currentChunk);
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

  return Array.from(queries.values());
}

/**
 * Generate markdown report from parsed chunk data
 */
function generateMarkdownReport(queries) {
  console.log(`📝 Generating report for ${queries.length} queries...`);
  
  let markdown = `# RAG Chunks Analysis Report

Generated on: ${new Date().toLocaleString()}
Project: ${PROJECT_ID}
Service: ${SERVICE_NAME}

---

`;

  if (queries.length === 0) {
    markdown += `## No Data Found

No RAG chunk logging data was found in the specified time period.

**Possible reasons:**
- No queries were processed during this time
- RAG_ENABLE_CHUNK_LOGGING environment variable is not set to 'true'
- The timestamp filter is too restrictive

**To enable chunk logging:**
\`\`\`bash
# Check if chunk logging is enabled
gcloud run services describe ${SERVICE_NAME} --region=me-west1 --project=${PROJECT_ID} --format="value(spec.template.spec.containers[0].env[].name,spec.template.spec.containers[0].env[].value)" | grep RAG_ENABLE
\`\`\`
`;
    return markdown;
  }

  // Summary section
  markdown += `## Summary

- **Total Queries Analyzed:** ${queries.length}
- **Total Chunks Retrieved:** ${queries.reduce((sum, q) => sum + q.chunks.length, 0)}
- **Average Chunks per Query:** ${(queries.reduce((sum, q) => sum + q.chunks.length, 0) / queries.length).toFixed(1)}

---

`;

  // Detailed analysis for each query
  queries.forEach((query, index) => {
    markdown += `## Query ${index + 1}

### Query Details
- **Timestamp:** ${new Date(query.timestamp).toLocaleString()}
- **Query Text:** "${query.query}"
- **Chunks Retrieved:** ${query.chunks.length}/${query.chunkCount}

### Retrieved Chunks

`;

    query.chunks.forEach((chunk, chunkIndex) => {
      markdown += `#### Chunk ${chunk.number}/${chunk.total}

**Source:** \`${chunk.source}\`  
**Type:** ${chunk.type}  
**Score:** ${chunk.score}

**Content:**
\`\`\`
${chunk.content}
\`\`\`

`;

      // Add separator between chunks
      if (chunkIndex < query.chunks.length - 1) {
        markdown += `---

`;
      }
    });

    // Add separator between queries
    if (index < queries.length - 1) {
      markdown += `

═══════════════════════════════════════════════════════════════════════════════

`;
    }
  });

  // Statistics section
  markdown += `

---

## Statistics

### Source File Distribution
`;

  const sourceStats = new Map();
  const typeStats = new Map();

  queries.forEach(query => {
    query.chunks.forEach(chunk => {
      // Count sources
      const source = chunk.source || 'Unknown';
      sourceStats.set(source, (sourceStats.get(source) || 0) + 1);
      
      // Count types
      const type = chunk.type || 'Unknown';
      typeStats.set(type, (typeStats.get(type) || 0) + 1);
    });
  });

  // Source distribution
  Array.from(sourceStats.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      markdown += `- **${source}:** ${count} chunks\n`;
    });

  markdown += `
### Document Type Distribution
`;

  // Type distribution
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
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND textPayload:"CHUNK CONTENT LOGGING"' --project=${PROJECT_ID} --limit=10
\`\`\`

**To re-generate this report:**
\`\`\`bash
node export-rag-chunks.js ${queries[0]?.timestamp || 'latest'} chunks-analysis.md
\`\`\`
`;

  return markdown;
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const timestamp = args[0] || 'latest';
  const outputFile = args[1] || `rag-chunks-${new Date().toISOString().split('T')[0]}.md`;

  console.log(`🚀 RAG Chunks Export Tool`);
  console.log(`⏰ Timestamp: ${timestamp}`);
  console.log(`📄 Output file: ${outputFile}`);
  console.log('');

  // Fetch logs
  const logs = fetchChunkLogs(timestamp);
  
  if (logs.length === 0) {
    console.log('⚠️  No logs found for the specified criteria');
  }

  // Parse chunk data
  const queries = parseChunkData(logs);

  // Generate report
  const markdown = generateMarkdownReport(queries);

  // Write to file
  const outputPath = path.resolve(outputFile);
  fs.writeFileSync(outputPath, markdown);

  console.log(`✅ Report generated successfully!`);
  console.log(`📁 File saved to: ${outputPath}`);
  console.log(`📊 Analyzed ${queries.length} queries with ${queries.reduce((sum, q) => sum + q.chunks.length, 0)} total chunks`);
  
  if (queries.length > 0) {
    console.log('');
    console.log('📋 Quick Summary:');
    queries.forEach((query, index) => {
      console.log(`   Query ${index + 1}: "${query.query.substring(0, 50)}..." (${query.chunks.length} chunks)`);
    });
  }
}

// Run the tool
if (require.main === module) {
  main();
}

module.exports = { fetchChunkLogs, parseChunkData, generateMarkdownReport };
