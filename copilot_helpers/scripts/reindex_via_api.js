#!/usr/bin/env node

/**
 * Re-index Repository via Direct API Call
 * 
 * This script triggers repository re-indexing using the direct API endpoint.
 * No external dependencies required - uses native fetch.
 * 
 * PURPOSE:
 * - Updates existing vectors from type: 'github-file' to semantic types
 * - Uses the new FileTypeClassifier in repoProcessor.js (commit e8d2871)
 * - Ensures vector search filters work correctly
 * 
 * ESTIMATED TIME: 10-15 minutes for full re-indexing
 * 
 * Run: node reindex_via_api.js
 */

require('dotenv').config({ path: './backend/.env' });

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'https://eventstorm.me',
  userId: 'd41402df-182a-41ec-8f05-153118bf2718',
  repoId: 'anatolyZader/vc-3',
  repoUrl: 'https://github.com/anatolyZader/vc-3',
  branch: 'main',
  commitSha: 'e8d2871',  // Commit with FileTypeClassifier integration
  jwtToken: process.env.JWT_TOKEN || null
};

async function authenticateAndGetToken() {
  console.log('🔐 Checking authentication...');
  
  // Check if JWT token is available in environment
  if (CONFIG.jwtToken) {
    console.log('✅ Using JWT token from environment variable\n');
    return CONFIG.jwtToken;
  }
  
  console.log('⚠️  No JWT token found in environment');
  console.log('💡 Options to authenticate:\n');
  console.log('1. Add JWT_TOKEN to backend/.env:');
  console.log('   JWT_TOKEN=your-token-here\n');
  console.log('2. Log in via browser and copy token from cookies\n');
  console.log('3. Use the frontend UI to trigger re-indexing\n');
  
  throw new Error('Authentication required - no JWT token available');
}

async function reindexRepository() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄 REPOSITORY RE-INDEXING WITH FILETYPECLASSIFIER');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📋 CONFIGURATION:');
  console.log(`   API URL:    ${CONFIG.apiUrl}`);
  console.log(`   Repository: ${CONFIG.repoId}`);
  console.log(`   Branch:     ${CONFIG.branch}`);
  console.log(`   Commit:     ${CONFIG.commitSha} (FileTypeClassifier integration)`);
  console.log(`   User:       ${CONFIG.userId}`);
  console.log(`   Namespace:  ${CONFIG.userId}_${CONFIG.repoId.replace('/', '_')}\n`);

  console.log('🎯 EXPECTED CHANGES:');
  console.log('   ❌ BEFORE: type: "github-file" (all 38,790 vectors)');
  console.log('   ✅ AFTER:  type: "github-code", "github-docs", "github-test", etc.\n');

  try {
    // Authenticate
    const token = await authenticateAndGetToken();

    // Prepare request payload
    const payload = {
      repoId: CONFIG.repoId,
      githubOwner: 'anatolyZader',
      repoName: 'vc-3',
      repoUrl: CONFIG.repoUrl,
      branch: CONFIG.branch,
      forceUpdate: true  // CRITICAL: Force reprocessing
    };

    const endpoint = `${CONFIG.apiUrl}/api/ai/manual-process-repo-direct`;
    
    console.log('📡 Sending request to:', endpoint);
    console.log('📋 Request payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `token=${token}`
      },
      body: JSON.stringify(payload)
    });

    console.log('📨 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const result = await response.json();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ REPOSITORY RE-INDEXING TRIGGERED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📋 Response:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('⏳ Processing time: 10-15 minutes (38,790 vectors)\n');

    console.log('📊 MONITORING OPTIONS:\n');
    console.log('1. Check Cloud Run logs:');
    console.log('   cd backend && npm run logs\n');
    
    console.log('2. Monitor processing status:');
    console.log('   # Watch for "Processing repository: anatolyZader/vc-3"');
    console.log('   # Look for "✅ Repository processing completed"\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 VERIFICATION (Run after 15 minutes):');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('node backend/debug_pinecone_index.js\n');
    
    console.log('Expected output:');
    console.log('  ✅ Test: Query vectors WITH type filters: github-code');
    console.log('     Expected: 10+ results (was 0 before)');
    console.log('  ✅ Test: Vector metadata shows type: "github-code"');
    console.log('     Expected: NOT "github-file" anymore\n');

    console.log('If verification fails:');
    console.log('  1. Check logs for processing errors');
    console.log('  2. Verify GitHub Actions deployment completed');
    console.log('  3. Re-run this script if needed\n');

    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('❌ ERROR: Repository re-indexing failed');
    console.error('═══════════════════════════════════════════════════════════════\n');
    console.error('Error details:', error.message);
    console.error('\n🔧 TROUBLESHOOTING:\n');
    
    if (error.message.includes('Authentication required')) {
      console.error('AUTHENTICATION ISSUE:');
      console.error('  1. Add JWT_TOKEN to backend/.env');
      console.error('  2. Get token by logging in to https://eventstorm.me');
      console.error('  3. Or use frontend UI to trigger re-indexing\n');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.error('AUTHORIZATION ISSUE:');
      console.error('  1. Token may be expired - get a new one');
      console.error('  2. Verify token has correct permissions');
      console.error('  3. Check user ID matches: ' + CONFIG.userId + '\n');
    } else {
      console.error('GENERAL ERROR:');
      console.error('  1. Check API URL:', CONFIG.apiUrl);
      console.error('  2. Verify backend is deployed and running');
      console.error('  3. Check network connectivity\n');
      console.error('Full error:', error);
    }
    
    console.error('═══════════════════════════════════════════════════════════════\n');
    console.error('ALTERNATIVE: Trigger via frontend UI');
    console.error('  1. Go to https://eventstorm.me');
    console.error('  2. Navigate to repository settings');
    console.error('  3. Click "Re-index Repository" button\n');
    
    process.exit(1);
  }
}

// Run the re-indexing
reindexRepository();
