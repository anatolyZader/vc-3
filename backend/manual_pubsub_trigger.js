#!/usr/bin/env node

/**
 * Manual PubSub Event Trigger
 * Simulate the GitHub Actions PubSub events locally
 */

const { PubSub } = require('@google-cloud/pubsub');

async function triggerPubSubEvents() {
  console.log('📡 MANUAL PUBSUB EVENT TRIGGER');
  console.log('==============================');
  
  try {
    // Initialize PubSub client
    const pubsub = new PubSub();
    const topicName = 'git-topic';
    
    console.log('🔗 Connecting to PubSub...');
    
    // Prepare event data
    const repoData = {
      url: 'https://github.com/anatolyZader/vc-3.git',
      branch: 'main'
    };
    
    const userId = 'manual-trigger-user';
    const repoId = 'anatolyZader/vc-3';
    
    // Event 1: repoPushed
    const repoPushedEvent = {
      event: 'repoPushed',
      payload: {
        userId,
        repoId,
        repoData
      }
    };
    
    console.log('📤 Publishing repoPushed event...');
    console.log('Event data:', repoPushedEvent);
    
    await pubsub.topic(topicName).publishMessage({
      data: Buffer.from(JSON.stringify(repoPushedEvent)),
    });
    
    console.log('✅ repoPushed event published');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Event 2: docsDocsUpdated
    const docsUpdatedEvent = {
      event: 'docsDocsUpdated',
      payload: {
        userId
      }
    };
    
    console.log('📤 Publishing docsDocsUpdated event...');
    console.log('Event data:', docsUpdatedEvent);
    
    await pubsub.topic(topicName).publishMessage({
      data: Buffer.from(JSON.stringify(docsUpdatedEvent)),
    });
    
    console.log('✅ docsDocsUpdated event published');
    
    console.log('');
    console.log('🎯 Events published successfully!');
    console.log('💡 Check your EventStorm backend logs to see if processing starts');
    console.log('⏱️  Processing typically takes 10-30 minutes');
    
  } catch (error) {
    console.error('❌ Failed to publish events:', error.message);
    
    if (error.message.includes('authentication')) {
      console.log('');
      console.log('🔑 Authentication required:');
      console.log('   Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
      console.log('   Or ensure your backend service account is properly configured');
    }
  }
}

triggerPubSubEvents();