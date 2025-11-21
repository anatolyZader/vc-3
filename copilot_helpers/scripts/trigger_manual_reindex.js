#!/usr/bin/env node
/**
 * Manual Repository Reindexing Trigger
 * 
 * This script manually triggers repository reindexing by publishing
 * a repoPushed event directly to the git-topic Pub/Sub.
 */

const { PubSub } = require('@google-cloud/pubsub');
require('dotenv').config({ path: './backend/.env' });

async function triggerReindex() {
  console.log('🚀 Starting manual repository reindexing...\n');

  // Initialize Pub/Sub client
  const pubsub = new PubSub({
    projectId: process.env.GCP_PROJECT_ID
  });

  const topicName = 'git-topic';
  const topic = pubsub.topic(topicName);

  // Prepare the repoPushed event payload
  const eventData = {
    eventType: 'repoPushed',
    userId: 'd41402df-182a-41ec-8f05-153118bf2718',
    repoId: 'anatolyZader/vc-3',
    repoData: {
      url: 'https://github.com/anatolyZader/vc-3',
      branch: 'main',
      githubOwner: 'anatolyZader',
      repoName: 'vc-3',
      commitHash: '5c420fb', // Latest commit with renewed token
      description: 'Manual reindex trigger after GitHub token renewal',
      timestamp: new Date().toISOString(),
      source: 'manual-trigger'
    },
    timestamp: new Date().toISOString()
  };

  console.log('📦 Event payload:');
  console.log(JSON.stringify(eventData, null, 2));
  console.log('');

  try {
    // Publish the event
    const dataBuffer = Buffer.from(JSON.stringify(eventData));
    const messageId = await topic.publishMessage({ data: dataBuffer });

    console.log('✅ Successfully published repoPushed event!');
    console.log(`📨 Message ID: ${messageId}`);
    console.log(`📡 Topic: ${topicName}`);
    console.log('');
    console.log('🔄 The event will be processed by:');
    console.log('   1. gitPubsubListener (forwards to eventBus)');
    console.log('   2. aiPubsubListener (processes the repo)');
    console.log('   3. contextPipeline (loads files, creates chunks)');
    console.log('   4. Storage (Pinecone + PostgreSQL)');
    console.log('');
    console.log('⏰ Check your backend logs in ~30-60 seconds for processing updates');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to publish event:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   - Verify GCP_PROJECT_ID is set in backend/.env');
    console.error('   - Verify you have GCP credentials configured');
    console.error('   - Verify the git-topic exists in your GCP project');
    process.exit(1);
  }
}

// Run the trigger
triggerReindex()
  .then(() => {
    console.log('✨ Manual reindex trigger completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
