#!/usr/bin/env node

/**
 * Trigger repository indexing on deployed Cloud Run backend
 * This makes an HTTP request to the production API to index your repository
 */

const https = require('https');
require('dotenv').config();

async function triggerCloudIndexing() {
  console.log('🚀 Triggering repository indexing on Cloud Run backend...');
  console.log('=' .repeat(70));
  
  // Configuration
  const baseUrl = process.env.BASE_URL || 'https://eventstorm.me';
  const hostname = baseUrl.replace('https://', '').replace('http://', '');
  
  const repoData = {
    repoId: 'anatolyZader/vc-3',
    githubOwner: 'anatolyZader',
    repoName: 'vc-3',
    branch: 'main',
    repoUrl: 'https://github.com/anatolyZader/vc-3',
    forceReindex: true
  };
  
  console.log(`📡 Target: ${baseUrl}`);
  console.log(`📦 Repository: ${repoData.repoId}`);
  console.log(`🌿 Branch: ${repoData.branch}`);
  console.log('');
  
  const postData = JSON.stringify(repoData);
  
  const options = {
    hostname: hostname,
    path: '/api/ai/manual-process-repo-direct',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      // Add authorization if you have a token
      // 'Authorization': `Bearer ${process.env.API_TOKEN}`
    }
  };
  
  return new Promise((resolve, reject) => {
    console.log('📤 Sending indexing request...');
    
    const req = https.request(options, (res) => {
      console.log(`📊 Response status: ${res.statusCode}`);
      
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        console.log('');
        console.log('📥 Response received:');
        console.log('-'.repeat(70));
        
        try {
          const parsedResponse = JSON.parse(responseBody);
          console.log(JSON.stringify(parsedResponse, null, 2));
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('');
            console.log('✅ SUCCESS! Repository indexing triggered');
            console.log('⏳ Indexing is processing in the background...');
            console.log('');
            console.log('💡 Check progress:');
            console.log('   1. Wait a few minutes for processing to complete');
            console.log('   2. Check Cloud Run logs for processing details');
            console.log('   3. Query your repository in the UI to verify');
            console.log('');
            console.log(`📊 Documents processed: ${parsedResponse.documentsProcessed || 'pending'}`);
            console.log(`🧩 Chunks generated: ${parsedResponse.chunksGenerated || 'pending'}`);
          } else {
            console.log('');
            console.log('❌ FAILED: Server returned error status');
            console.log(`🔧 Status: ${res.statusCode}`);
            console.log(`💬 Message: ${parsedResponse.message || parsedResponse.error || 'Unknown error'}`);
          }
          
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            body: parsedResponse
          });
          
        } catch (parseError) {
          console.log('⚠️ Response is not JSON:');
          console.log(responseBody);
          
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            body: { rawResponse: responseBody }
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('');
      console.error('❌ Request failed:', error.message);
      console.error('');
      console.error('🔧 Possible causes:');
      console.error('   1. Network connectivity issue');
      console.error('   2. Incorrect BASE_URL in .env');
      console.error('   3. Cloud Run service not deployed');
      console.error('   4. Authentication required but not provided');
      console.error('');
      console.error(`💡 Current BASE_URL: ${baseUrl}`);
      
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.write(postData);
    req.end();
  });
}

// Run the script
if (require.main === module) {
  triggerCloudIndexing()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { triggerCloudIndexing };
