#!/usr/bin/env node

/**
 * Manual Repository Processing Test Script
 * Tests the cloud-native GitHub API fixes by triggering manual repository processing
 */

const http = require('http');
const process = require('process');

async function testManualRepoProcessing() {
  console.log('🔬 TESTING: Manual repository processing with cloud-native GitHub API fixes');
  
  // Test configuration
  const serverUrl = 'http://localhost:3000';  // Update if server runs on different port
  const testRepo = {
    repoId: 'anatolyZader/vc-3',
    githubOwner: 'anatolyZader', 
    repoName: 'vc-3',
    branch: 'main',
    repoUrl: 'https://github.com/anatolyZader/vc-3'
  };
  
  // You'll need to provide a valid JWT token for authentication
  const authToken = process.env.JWT_TOKEN || 'YOUR_JWT_TOKEN_HERE';
  
  if (authToken === 'YOUR_JWT_TOKEN_HERE') {
    console.log('❌ ERROR: Please set JWT_TOKEN environment variable or update the script with a valid token');
    process.exit(1);
  }
  
  const postData = JSON.stringify(testRepo);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/ai/manual-process-repo-direct',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  return new Promise((resolve, reject) => {
    console.log(`🚀 SENDING REQUEST: ${options.method} ${serverUrl}${options.path}`);
    console.log('📝 REQUEST BODY:', testRepo);
    
    const req = http.request(options, (res) => {
      let data = '';
      
      console.log(`📡 RESPONSE STATUS: ${res.statusCode} ${res.statusMessage}`);
      console.log('📋 RESPONSE HEADERS:', res.headers);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ RESPONSE RECEIVED:');
          console.log(JSON.stringify(response, null, 2));
          
          if (res.statusCode === 200 && response.success) {
            console.log('🎉 SUCCESS: Repository processing completed successfully');
            console.log(`📊 PROCESSED: ${response.data?.documentsProcessed || 0} documents, ${response.data?.chunksGenerated || 0} chunks`);
          } else {
            console.log('⚠️ WARNING: Request completed but may have had issues');
          }
          
          resolve(response);
        } catch (error) {
          console.error('❌ ERROR: Failed to parse JSON response');
          console.error('📄 RAW RESPONSE:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ REQUEST ERROR:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Run the test
if (require.main === module) {
  console.log('🧪 CLOUD-NATIVE RAG PIPELINE TEST');
  console.log('🎯 PURPOSE: Validate GitHub API-only processing fixes');
  console.log('=====================================');
  
  testManualRepoProcessing()
    .then(() => {
      console.log('✅ TEST COMPLETED');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ TEST FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = testManualRepoProcessing;