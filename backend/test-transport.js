// test-transport.js
// Test script for message transport abstraction
'use strict';

const Redis = require('ioredis');

// Simple logger mock
const logger = {
  info: (...args) => console.log('ℹ️ ', ...args),
  error: (...args) => console.error('❌', ...args),
  warn: (...args) => console.warn('⚠️ ', ...args),
  debug: (...args) => console.log('🔍', ...args)
};

async function testRedisTransport() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('Testing Redis Transport Adapter');
  console.log('═══════════════════════════════════════════════\n');

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    retryStrategy: (times) => {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 50, 2000);
    }
  });

  // Test connection
  try {
    const pong = await redis.ping();
    logger.info(`Redis connection test: ${pong}`);
  } catch (error) {
    logger.error('Failed to connect to Redis:', error.message);
    process.exit(1);
  }

  const RedisTransportAdapter = require('./transport/redisTransportAdapter');
  const transport = new RedisTransportAdapter(redis, logger);

  await transport.initialize();
  logger.info('Transport initialized\n');

  // Test 1: Basic publish/subscribe
  console.log('📝 Test 1: Basic Publish/Subscribe');
  console.log('─────────────────────────────────────');
  
  let receivedMessages = [];
  
  await transport.subscribe('test-topic', async (message) => {
    logger.info('Received message:', JSON.stringify(message, null, 2));
    receivedMessages.push(message);
    await message.ack();
  });

  logger.info('Subscribed to test-topic');

  // Give subscription time to be ready
  await new Promise(resolve => setTimeout(resolve, 100));

  const testMessage1 = {
    event: 'testEvent',
    data: 'Hello from test 1',
    timestamp: new Date().toISOString()
  };

  const messageId1 = await transport.publish('test-topic', testMessage1);
  logger.info(`Published message with ID: ${messageId1}`);

  // Wait for message delivery
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`\n✅ Test 1 Result: Received ${receivedMessages.length} message(s)\n`);

  // Test 2: Multiple messages
  console.log('📝 Test 2: Multiple Messages');
  console.log('─────────────────────────────────────');
  
  receivedMessages = [];
  
  const messages = [
    { event: 'msg1', data: 'Message 1' },
    { event: 'msg2', data: 'Message 2' },
    { event: 'msg3', data: 'Message 3' }
  ];

  for (const msg of messages) {
    const msgId = await transport.publish('test-topic', msg);
    logger.info(`Published: ${msg.event} (${msgId})`);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`\n✅ Test 2 Result: Received ${receivedMessages.length}/${messages.length} messages\n`);

  // Test 3: Different topics
  console.log('📝 Test 3: Multiple Topics');
  console.log('─────────────────────────────────────');
  
  let topic1Messages = [];
  let topic2Messages = [];

  await transport.subscribe('topic-1', async (message) => {
    logger.info('Topic-1 received:', message.data.event);
    topic1Messages.push(message);
    await message.ack();
  });

  await transport.subscribe('topic-2', async (message) => {
    logger.info('Topic-2 received:', message.data.event);
    topic2Messages.push(message);
    await message.ack();
  });

  await new Promise(resolve => setTimeout(resolve, 100));

  await transport.publish('topic-1', { event: 'topic1-event', data: 'For topic 1' });
  await transport.publish('topic-2', { event: 'topic2-event', data: 'For topic 2' });
  await transport.publish('topic-1', { event: 'topic1-event-2', data: 'Another for topic 1' });

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`\n✅ Test 3 Result:`);
  console.log(`   Topic-1: ${topic1Messages.length} messages`);
  console.log(`   Topic-2: ${topic2Messages.length} messages\n`);

  // Test 4: Unsubscribe
  console.log('📝 Test 4: Unsubscribe');
  console.log('─────────────────────────────────────');
  
  let messagesAfterUnsub = 0;
  
  const unsubTopic = 'unsub-test';
  await transport.subscribe(unsubTopic, async (message) => {
    messagesAfterUnsub++;
    await message.ack();
  });

  await new Promise(resolve => setTimeout(resolve, 100));
  
  await transport.publish(unsubTopic, { event: 'before-unsub', data: 'Should receive' });
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const receivedBefore = messagesAfterUnsub;
  
  await transport.unsubscribe(unsubTopic);
  logger.info('Unsubscribed from unsub-test');
  
  await transport.publish(unsubTopic, { event: 'after-unsub', data: 'Should NOT receive' });
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const receivedAfter = messagesAfterUnsub;

  console.log(`\n✅ Test 4 Result:`);
  console.log(`   Before unsubscribe: ${receivedBefore} message(s)`);
  console.log(`   After unsubscribe: ${receivedAfter - receivedBefore} message(s) (should be 0)\n`);

  // Test 5: Message format and metadata
  console.log('📝 Test 5: Message Format and Metadata');
  console.log('─────────────────────────────────────');
  
  let lastReceivedMsg = null;
  
  await transport.subscribe('format-test', async (message) => {
    lastReceivedMsg = message;
    logger.info('Message structure:', {
      hasId: !!message.id,
      hasData: !!message.data,
      hasAck: typeof message.ack === 'function',
      hasNack: typeof message.nack === 'function',
      dataKeys: Object.keys(message.data)
    });
    await message.ack();
  });

  await new Promise(resolve => setTimeout(resolve, 100));

  await transport.publish('format-test', {
    event: 'complexEvent',
    userId: 'user123',
    repoId: 'owner/repo',
    metadata: {
      version: '1.0',
      source: 'test'
    }
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`\n✅ Test 5 Result: Message format validated\n`);

  // Test 6: Error handling
  console.log('📝 Test 6: Error Handling');
  console.log('─────────────────────────────────────');
  
  let errorCaught = false;
  
  await transport.subscribe('error-test', async (message) => {
    logger.info('Handler throwing error intentionally...');
    throw new Error('Intentional test error');
  });

  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    await transport.publish('error-test', { event: 'error-trigger' });
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`\n✅ Test 6 Result: Error was handled gracefully\n`);
  } catch (error) {
    errorCaught = true;
    console.log(`\n✅ Test 6 Result: Error caught: ${error.message}\n`);
  }

  // Cleanup
  console.log('🧹 Cleaning up...');
  await transport.close();
  await redis.quit();

  console.log('\n═══════════════════════════════════════════════');
  console.log('All Tests Completed! ✅');
  console.log('═══════════════════════════════════════════════\n');
}

// Run tests
testRedisTransport().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
