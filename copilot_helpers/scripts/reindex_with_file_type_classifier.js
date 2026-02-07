#!/usr/bin/env node

/**
 * Re-index Repository with FileTypeClassifier Integration
 * 
 * This script triggers repository re-indexing after the FileTypeClassifier
 * integration to update all 38,790 Pinecone vectors with correct semantic types.
 * 
 * PURPOSE:
 * - Updates existing vectors from type: 'github-file' to semantic types
 * - Uses the new FileTypeClassifier in repoProcessor.js (commit e8d2871)
 * - Ensures vector search filters work correctly
 * 
 * ESTIMATED TIME: 10-15 minutes for full re-indexing
 * 
 * Run: node reindex_with_file_type_classifier.js
 */

require('dotenv').config({ path: './backend/.env' });
const { PubSub } = require('@google-cloud/pubsub');

// Configuration
const CONFIG = {
  projectId: process.env.GCP_PROJECT_ID || 'vibeswitch-1',
  topicName: 'git-topic',
  userId: 'd41402df-182a-41ec-8f05-153118bf2718',
  repoId: 'anatolyZader/vc-3',
  repoUrl: 'https://github.com/anatolyZader/vc-3',
  branch: 'main',
  commitSha: 'e8d2871'  // Commit with FileTypeClassifier integration
};

async function reindexRepository() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄 REPOSITORY RE-INDEXING WITH FILETYPECLASSIFIER');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📋 CONFIGURATION:');
  console.log(`   Project:    ${CONFIG.projectId}`);
  console.log(`   Repository: ${CONFIG.repoId}`);
  console.log(`   Branch:     ${CONFIG.branch}`);
  console.log(`   Commit:     ${CONFIG.commitSha} (FileTypeClassifier integration)`);
  console.log(`   User:       ${CONFIG.userId}`);
  console.log(`   Namespace:  ${CONFIG.userId}_${CONFIG.repoId.replace('/', '_')}\n`);

  console.log('🎯 EXPECTED CHANGES:');
  console.log('   ❌ BEFORE: type: "github-file" (all 38,790 vectors)');
  console.log('   ✅ AFTER:  type: "github-code", "github-docs", "github-test", etc.\n');

  try {
    console.log('🔌 Connecting to Google Cloud Pub/Sub...');
    const pubsub = new PubSub({ projectId: CONFIG.projectId });
    const topic = pubsub.topic(CONFIG.topicName);

    const payload = {
      event: 'repoPushed',
      payload: {
        userId: CONFIG.userId,
        repoId: CONFIG.repoId,
        repoData: {
          url: CONFIG.repoUrl,
          branch: CONFIG.branch,
          owner: 'anatolyZader',
          name: 'vc-3',
          commitHash: CONFIG.commitSha,
          forceUpdate: true  // CRITICAL: Force reprocessing even if commit exists
        },
        metadata: {
          source: 'manual-reindex',
          reason: 'integrate-FileTypeClassifier-semantic-types',
          commit: CONFIG.commitSha,
          timestamp: new Date().toISOString()
        }
      }
    };

    console.log('📦 Publishing repoPushed event to topic:', CONFIG.topicName);
    console.log('📋 Event payload:', JSON.stringify(payload, null, 2));
    console.log('');

    const messageId = await topic.publishMessage({ 
      json: payload 
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ REPOSITORY RE-INDEXING TRIGGERED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log('📨 Message ID:', messageId);
    console.log('⏳ Processing time: 10-15 minutes (38,790 vectors)\n');

    console.log('📊 MONITORING OPTIONS:\n');
    console.log('1. Check Cloud Run logs:');
    console.log('   cd backend && npm run logs\n');
    
    console.log('2. Monitor Pub/Sub subscription:');
    console.log('   gcloud pubsub subscriptions pull ai-sub --auto-ack --limit=10\n');
    
    console.log('3. Check processing status:');
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
    console.error('\nFull error:', error);
    console.error('\n🔧 TROUBLESHOOTING:\n');
    console.error('1. Check environment variables:');
    console.error('   - GCP_PROJECT_ID in backend/.env');
    console.error('   - GOOGLE_APPLICATION_CREDENTIALS set correctly\n');
    console.error('2. Verify Google Cloud Pub/Sub permissions:');
    console.error('   - Service account has pubsub.publisher role');
    console.error('   - Topic "git-topic" exists\n');
    console.error('3. Alternative re-indexing methods:');
    console.error('   - Run: node trigger_repo_reprocess.js');
    console.error('   - Or trigger via frontend UI (repository settings)\n');
    
    process.exit(1);
  }
}

// Run the re-indexing
reindexRepository();
