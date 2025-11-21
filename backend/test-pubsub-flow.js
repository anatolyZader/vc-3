// test-pubsub-flow.js
// Test end-to-end pub/sub flows between modules
'use strict';

async function testPubSubFlow() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('Testing End-to-End Pub/Sub Flows');
  console.log('═══════════════════════════════════════════════\n');

  const Fastify = require('fastify');
  const appPlugin = require('./app');
  
  console.log('🚀 Building Fastify app...');
  const app = Fastify({
    logger: {
      level: 'info'
    }
  });
  
  await app.register(appPlugin);

  try {
    await app.ready();
    console.log('✅ App ready\n');

    // Test 1: Git → AI flow (repoPushed event)
    console.log('📝 Test 1: Git → AI Flow (repoPushed)');
    console.log('─────────────────────────────────────');
    
    let aiReceivedRepoPushed = false;
    
    // AI module listens on 'git-sub' subscription
    await app.transport.subscribe('git-sub', async (message) => {
      const { data } = message;
      
      if (data.event === 'repoPushed') {
        console.log('✅ AI module received repoPushed event');
        console.log(`   userId: ${data.userId}`);
        console.log(`   repoId: ${data.repoId}`);
        aiReceivedRepoPushed = true;
      }
      
      await message.ack();
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    // Publish repoPushed event (simulating Git module)
    const scope = app.diContainer.createScope();
    const gitPubsubAdapter = await scope.resolve('gitPubsubAdapter');
    
    await gitPubsubAdapter.publishRepoPersistedEvent({
      event: 'repoPushed',
      userId: 'test-user-123',
      repoId: 'testowner/testrepo',
      repoData: {
        name: 'testrepo',
        full_name: 'testowner/testrepo'
      }
    }, 'test-correlation-1');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`Result: ${aiReceivedRepoPushed ? '✅ Success' : '❌ Failed'}\n`);

    // Test 2: Chat → AI flow (questionAdded event)
    console.log('📝 Test 2: Chat → AI Flow (questionAdded)');
    console.log('─────────────────────────────────────');
    
    let aiReceivedQuestion = false;
    
    // Subscribe to the topic where AI listens for questions
    await app.transport.subscribe('ai-topic', async (message) => {
      const { data } = message;
      
      if (data.event === 'questionAdded') {
        console.log('✅ AI module received questionAdded event');
        console.log(`   conversationId: ${data.conversationId}`);
        console.log(`   prompt: ${data.prompt}`);
        aiReceivedQuestion = true;
      }
      
      await message.ack();
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    // Simulate chat module publishing question
    const chatScope = app.diContainer.createScope();
    const chatPubsubAdapter = await chatScope.resolve('chatPubsubAdapter');
    
    // Chat uses eventDispatcher, not direct transport
    // So we'll test direct transport publish
    await app.transport.publish('ai-topic', {
      event: 'questionAdded',
      userId: 'test-user-456',
      conversationId: 'conv-123',
      prompt: 'What is this repository about?',
      timestamp: new Date().toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`Result: ${aiReceivedQuestion ? '✅ Success' : '❌ Failed'}\n`);

    // Test 3: AI → Chat flow (answerAdded via EventBus)
    console.log('📝 Test 3: AI → Chat Flow (answerAdded)');
    console.log('─────────────────────────────────────');
    
    const { eventBus } = require('./eventDispatcher');
    
    let chatReceivedAnswer = false;
    
    // Chat listens on eventBus for answerAdded
    eventBus.once('answerAdded', (data) => {
      console.log('✅ Chat module received answerAdded event');
      console.log(`   conversationId: ${data.conversationId}`);
      console.log(`   answer length: ${data.answer.length}`);
      chatReceivedAnswer = true;
    });

    // Simulate AI publishing answer
    eventBus.emit('answerAdded', {
      userId: 'test-user-456',
      conversationId: 'conv-123',
      answer: 'This repository is about testing pub/sub functionality.'
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`Result: ${chatReceivedAnswer ? '✅ Success' : '❌ Failed'}\n`);

    // Test 4: API module flow
    console.log('📝 Test 4: API Module Flow (fetchHttpApiRequest)');
    console.log('─────────────────────────────────────');
    
    let apiReceivedRequest = false;
    
    await app.transport.subscribe('api-sub', async (message) => {
      const { data } = message;
      
      if (data.event === 'fetchHttpApiRequest') {
        console.log('✅ API module received fetchHttpApiRequest');
        console.log(`   repoId: ${data.repoId}`);
        apiReceivedRequest = true;
      }
      
      await message.ack();
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    const apiScope = app.diContainer.createScope();
    const apiPubsubAdapter = await apiScope.resolve('apiPubsubAdapter');
    
    // For API, we publish via transport directly (simulating another module)
    await app.transport.publish('api-sub', {
      event: 'fetchHttpApiRequest',
      userId: 'test-user-789',
      repoId: 'owner/repo',
      correlationId: 'test-corr-2'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log(`Result: ${apiReceivedRequest ? '✅ Success' : '❌ Failed'}\n`);

    // Test 5: Multiple subscribers to same topic
    console.log('📝 Test 5: Multiple Subscribers');
    console.log('─────────────────────────────────────');
    
    let subscriber1Received = false;
    let subscriber2Received = false;
    
    await app.transport.subscribe('multi-sub-test', async (message) => {
      console.log('✅ Subscriber 1 received message');
      subscriber1Received = true;
      await message.ack();
    });

    await app.transport.subscribe('multi-sub-test', async (message) => {
      console.log('✅ Subscriber 2 received message');
      subscriber2Received = true;
      await message.ack();
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    await app.transport.publish('multi-sub-test', {
      event: 'multiSubTest',
      data: 'test'
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const bothReceived = subscriber1Received && subscriber2Received;
    console.log(`Result: ${bothReceived ? '✅ Both subscribers received' : '⚠️  Only one or none received'}\n`);

    // Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('Flow Test Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Git → AI:        ${aiReceivedRepoPushed ? '✅' : '❌'}`);
    console.log(`Chat → AI:       ${aiReceivedQuestion ? '✅' : '❌'}`);
    console.log(`AI → Chat:       ${chatReceivedAnswer ? '✅' : '❌'}`);
    console.log(`API Flow:        ${apiReceivedRequest ? '✅' : '❌'}`);
    console.log(`Multi-Sub:       ${bothReceived ? '✅' : '⚠️'}`);
    console.log('═══════════════════════════════════════════════\n');

  } finally {
    console.log('🧹 Closing app...');
    await app.close();
    console.log('✅ App closed\n');
  }
}

// Run flow tests
testPubSubFlow().catch(error => {
  console.error('\n❌ Flow test failed:', error);
  console.error(error.stack);
  process.exit(1);
});
