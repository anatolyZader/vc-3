// trigger_repo_reprocess.js
'use strict';

/**
 * Manually trigger repository reprocessing to populate PostgreSQL repo_data table
 * This simulates the repoPushed event from GitHub Actions
 */

require('dotenv').config({ path: './backend/.env' });
const { PubSub } = require('@google-cloud/pubsub');

async function triggerRepoReprocessing() {
  console.log('🚀 Manually triggering repository reprocessing...\n');

  const projectId = process.env.GCP_PROJECT_ID || 'eventstorm-1';
  const topicName = 'git-topic';
  
  const userId = 'd41402df-182a-41ec-8f05-153118bf2718';
  const repoId = 'anatolyZader/vc-3';
  const repoUrl = 'https://github.com/anatolyZader/vc-3';
  const branch = 'main';
  const commitSha = '2eb2b46'; // Latest commit with text search fix

  try {
    const pubsub = new PubSub({ projectId });
    const topic = pubsub.topic(topicName);

    const payload = {
      event: 'repoPushed',
      payload: {
        userId,
        repoId,
        repoData: {
          url: repoUrl,
          branch,
          owner: 'anatolyZader',
          name: 'vc-3',
          commitHash: commitSha,
          forceUpdate: true  // Force reprocessing even if commit exists
        },
        metadata: {
          source: 'manual-trigger',
          reason: 'populate-postgres-full-text-search',
          timestamp: new Date().toISOString()
        }
      }
    };

    console.log('📦 Publishing repoPushed event to topic:', topicName);
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

    const messageId = await topic.publishMessage({ 
      json: payload 
    });

    console.log(`\n✅ Event published successfully!`);
    console.log(`📨 Message ID: ${messageId}`);
    console.log(`\n⏳ Wait 1-2 minutes for processing to complete...`);
    console.log(`\n📊 Then check logs with:`);
    console.log(`   cd backend && npm run logs`);
    console.log(`\n🔍 Or query the database:`);
    console.log(`   SELECT COUNT(*) FROM repo_data WHERE user_id = '${userId}';`);

  } catch (error) {
    console.error('❌ Error triggering reprocessing:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

triggerRepoReprocessing();
