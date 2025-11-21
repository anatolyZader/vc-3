#!/usr/bin/env node

/**
 * Development Console Log Monitor
 * 
 * Monitors and captures console output for real-time RAG analysis
 * Perfect for development mode where logs go to console
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Development RAG Console Monitor');
console.log('===================================\n');

console.log('💡 Instructions for Development Mode Analysis:');
console.log('1. Start your development server (npm run dev or node server.js)');
console.log('2. Send a query in your chat interface');
console.log('3. Watch for console output like:');
console.log('   📋 CHUNK CONTENT LOGGING: Retrieved X chunks for query: "..."');
console.log('   📄 CHUNK 1/X:');
console.log('   📝 Content: ...');
console.log('   🏷️ Source: ...');
console.log('');

console.log('🎯 Expected Console Output Pattern:');
console.log('-----------------------------------');
console.log('[timestamp] QueryPipeline processing prompt for user ...');
console.log('[timestamp] 📋 CHUNK CONTENT LOGGING: Retrieved 11 chunks for query: "your query"');
console.log('[timestamp] 📄 CHUNK 1/11:');
console.log('[timestamp] 📝 Content: actual chunk content here');
console.log('[timestamp] 🏷️ Source: filename.js');
console.log('[timestamp] 🏷️ Type: JavaScript');
console.log('[timestamp] 🏷️ Score: 0.85');
console.log('... (repeated for each chunk)');
console.log('');

console.log('🔧 Troubleshooting Development Mode:');
console.log('------------------------------------');
console.log('If you don\'t see chunk logging:');
console.log('1. Check RAG_ENABLE_CHUNK_LOGGING=true in .env');
console.log('2. Verify LANGSMITH_TRACING=true in .env');
console.log('3. Restart your development server');
console.log('4. Send a new query');
console.log('');

console.log('📋 Quick Environment Check:');
console.log('---------------------------');

// Check .env file
const envPath = path.join(__dirname, '../../../../.env');
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const langsmithTracing = envContent.match(/LANGSMITH_TRACING=(.+)/);
  const chunkLogging = envContent.match(/RAG_ENABLE_CHUNK_LOGGING=(.+)/);
  const apiKey = envContent.match(/LANGSMITH_API_KEY=(.+)/);
  
  console.log(`✅ LANGSMITH_TRACING: ${langsmithTracing ? langsmithTracing[1].trim() : 'NOT SET'}`);
  console.log(`✅ RAG_ENABLE_CHUNK_LOGGING: ${chunkLogging ? chunkLogging[1].trim() : 'NOT SET'}`);
  console.log(`✅ LANGSMITH_API_KEY: ${apiKey ? 'SET' : 'NOT SET'}`);
  
  if (langsmithTracing && langsmithTracing[1].trim() === 'true' && 
      chunkLogging && chunkLogging[1].trim() === 'true') {
    console.log('🎉 Environment is properly configured for chunk logging!');
  } else {
    console.log('⚠️  Environment needs configuration for chunk logging');
  }
  
} catch (err) {
  console.log('❌ Could not read .env file');
}

console.log('');
console.log('🚀 Next Steps:');
console.log('1. Make sure your development server is running');
console.log('2. Send a query in your chat interface');
console.log('3. Look at your server console for the chunk logging output');
console.log('4. Copy the chunks from console and analyze them manually');
console.log('');

console.log('💡 Alternative: Real-time Log Capture');
console.log('If your dev server logs to a file, you can monitor it with:');
console.log('   tail -f server.log | grep -E "(CHUNK|📄|📝)"');
console.log('');

// Create a simple log parser for manual paste
console.log('📝 Manual Log Parser Available:');
console.log('If you copy console output here, I can parse it for you.');
console.log('Look for output in your development server console after sending a query.');

module.exports = {
  monitorDevelopmentLogs: () => {
    console.log('Development log monitoring active...');
    console.log('Send a query in your chat interface and watch the console!');
  }
};
