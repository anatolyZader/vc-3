#!/usr/bin/env node

/**
 * Real-time RAG Chunk Analysis Tool
 * 
 * This tool captures and analyzes RAG chunks in real-time,
 * providing better content reconstruction and immediate feedback.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Configuration
const PROJECT_ID = 'vibeswitch-1';
const SERVICE_NAME = 'vibeswitch-backend';

async function analyzeLatestQuery() {
  console.log(`🔍 Real-time RAG Analysis - Looking for latest query...`);
  
  // Step 1: Get the very latest chunk logging entry
  console.log(`📥 Step 1: Finding latest query...`);
  
  const queryCommand = `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND textPayload:"📋 CHUNK CONTENT LOGGING"' --project=${PROJECT_ID} --limit=1 --format=json`;
  
  let queryData = null;
  try {
    const output = execSync(queryCommand, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const logs = JSON.parse(output || '[]');
    
    if (logs.length === 0) {
      console.log('❌ No recent chunk logging found. Make sure you sent a query and RAG_ENABLE_CHUNK_LOGGING=true');
      return;
    }
    
    const log = logs[0];
    const text = log.textPayload || '';
    const match = text.match(/Retrieved (\d+) chunks for query: "([^"]+)"/);
    
    if (!match) {
      console.log('❌ Could not parse query from log entry');
      return;
    }
    
    const [, chunkCount, query] = match;
    queryData = {
      query,
      chunkCount: parseInt(chunkCount),
      timestamp: log.timestamp,
      logTime: new Date(log.timestamp).toLocaleString()
    };
    
    console.log(`✅ Found query: "${query}"`);
    console.log(`   Expected chunks: ${chunkCount}`);
    console.log(`   Time: ${queryData.logTime}`);
    
  } catch (error) {
    console.error('❌ Error fetching query info:', error.message);
    return;
  }
  
  // Step 2: Get detailed chunk logs for this specific query
  console.log(`\n📥 Step 2: Fetching detailed chunk logs...`);
  
  const baseTime = new Date(queryData.timestamp);
  const startTime = new Date(baseTime.getTime() - 2 * 60 * 1000); // 2 minutes before
  const endTime = new Date(baseTime.getTime() + 2 * 60 * 1000);   // 2 minutes after
  
  const chunkCommand = `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="${SERVICE_NAME}" AND (textPayload:"📄 CHUNK" OR textPayload:"📝 Content:" OR textPayload:"🏷️") AND timestamp >= "${startTime.toISOString()}" AND timestamp <= "${endTime.toISOString()}"' --project=${PROJECT_ID} --limit=200 --format=json`;
  
  let chunkLogs = [];
  try {
    const output = execSync(chunkCommand, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    chunkLogs = JSON.parse(output || '[]');
    console.log(`   Found ${chunkLogs.length} chunk-related log entries`);
  } catch (error) {
    console.error('❌ Error fetching chunk logs:', error.message);
    return;
  }
  
  // Step 3: Parse and reconstruct chunks
  console.log(`\n🔧 Step 3: Reconstructing chunks...`);
  
  // Sort logs by timestamp
  chunkLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  const chunks = [];
  let currentChunk = null;
  
  for (const log of chunkLogs) {
    const text = log.textPayload || '';
    
    // Detect chunk header
    if (text.includes('📄 CHUNK')) {
      // Save previous chunk
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // Parse new chunk
      const match = text.match(/📄 CHUNK (\d+)\/(\d+):/);
      if (match) {
        const [, chunkNum, totalChunks] = match;
        currentChunk = {
          number: parseInt(chunkNum),
          total: parseInt(totalChunks),
          content: '',
          source: '',
          type: '',
          score: '',
          timestamp: log.timestamp
        };
      }
    }
    
    // Extract content
    if (text.includes('📝 Content:') && currentChunk) {
      const content = text.replace(/.*📝 Content:\s*/, '').trim();
      // Filter out generic placeholders
      if (content && !content.includes('FILE:') && content !== 'ROOT_DOCUMENTATION.md') {
        currentChunk.content = content;
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
    chunks.push(currentChunk);
  }
  
  console.log(`   Reconstructed ${chunks.length} chunks`);
  
  // Step 4: Display real-time analysis
  console.log(`\n🎯 REAL-TIME ANALYSIS RESULTS`);
  console.log(`==========================================`);
  console.log(`Query: "${queryData.query}"`);
  console.log(`Time: ${queryData.logTime}`);
  console.log(`Expected chunks: ${queryData.chunkCount}`);
  console.log(`Actual chunks found: ${chunks.length}`);
  console.log(`\n📋 CHUNK DETAILS:`);
  
  chunks.forEach((chunk, index) => {
    console.log(`\n--- CHUNK ${chunk.number}/${chunk.total} ---`);
    console.log(`Source: ${chunk.source || 'Unknown'}`);
    console.log(`Type: ${chunk.type || 'Unknown'}`);
    console.log(`Score: ${chunk.score || 'N/A'}`);
    console.log(`Content (${chunk.content.length} chars):`);
    console.log(`"${chunk.content}"`);
    
    if (index < chunks.length - 1) {
      console.log(`\n${'='.repeat(50)}`);
    }
  });
  
  // Step 5: Quick insights
  console.log(`\n🔍 QUICK INSIGHTS:`);
  const contentTypes = {};
  let totalContentLength = 0;
  
  chunks.forEach(chunk => {
    // Categorize content
    const content = chunk.content.toLowerCase();
    if (content.includes('import') || content.includes('require')) {
      contentTypes['imports'] = (contentTypes['imports'] || 0) + 1;
    } else if (content.includes('class ') || content.includes('function ')) {
      contentTypes['definitions'] = (contentTypes['definitions'] || 0) + 1;
    } else if (content.startsWith('//') || content.startsWith('*')) {
      contentTypes['comments'] = (contentTypes['comments'] || 0) + 1;
    } else if (content.includes('{') || content.includes('(')) {
      contentTypes['code'] = (contentTypes['code'] || 0) + 1;
    } else {
      contentTypes['other'] = (contentTypes['other'] || 0) + 1;
    }
    
    totalContentLength += chunk.content.length;
  });
  
  console.log(`📊 Content Types:`);
  Object.entries(contentTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} chunks`);
  });
  
  console.log(`📏 Average chunk length: ${Math.round(totalContentLength / chunks.length)} characters`);
  console.log(`📈 Reconstruction quality: ${Math.round((chunks.filter(c => c.content.length > 0).length / chunks.length) * 100)}%`);
  
  console.log(`\n✅ Real-time analysis complete!`);
  console.log(`💡 This shows the actual chunks retrieved for your query.`);
}

// Run the analysis
if (require.main === module) {
  analyzeLatestQuery().catch(console.error);
}

module.exports = { analyzeLatestQuery };
