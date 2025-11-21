// test-transport-integration.js
// Integration test with actual fastify app
'use strict';

async function testTransportIntegration() {
  console.log('\n═══════════════════════════════════════════════');
  console.log('Testing Transport Integration with Fastify App');
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

    // Debug: Check what's available
    console.log('DEBUG: Checking app properties...');
    console.log(`  app.transport: ${typeof app.transport}`);
    console.log(`  app.diContainer: ${typeof app.diContainer}`);
    console.log(`  app.redis: ${typeof app.redis}`);

    // Test 1: Verify transport is available
    console.log('\n📝 Test 1: Transport Availability');
    console.log('─────────────────────────────────────');
    
    if (!app.transport) {
      throw new Error('Transport not available on fastify instance');
    }
    console.log('✅ Transport is available via fastify.transport');

    // Test 2: Verify transport in DI container
    if (!app.diContainer) {
      throw new Error('DI container not available');
    }
    
    const transportFromDI = await app.diContainer.resolve('transport');
    if (!transportFromDI) {
      throw new Error('Transport not available in DI container');
    }
    console.log('✅ Transport is available in DI container');
    console.log(`   Same instance: ${app.transport === transportFromDI}\n`);

    // Test 3: Test adapter resolution
    console.log('📝 Test 2: Adapter Resolution');
    console.log('─────────────────────────────────────');
    
    const adapters = ['aiPubsubAdapter', 'gitPubsubAdapter', 'chatPubsubAdapter', 'apiPubsubAdapter', 'docsPubsubAdapter'];
    
    for (const adapterName of adapters) {
      try {
        const scope = app.diContainer.createScope();
        const adapter = await scope.resolve(adapterName);
        
        if (!adapter) {
          console.log(`⚠️  ${adapterName}: Not resolved`);
          continue;
        }
        
        const hasTransport = !!adapter.transport;
        const hasLog = !!adapter.log;
        
        console.log(`✅ ${adapterName}:`);
        console.log(`   - has transport: ${hasTransport}`);
        console.log(`   - has logger: ${hasLog}`);
      } catch (error) {
        console.log(`❌ ${adapterName}: ${error.message}`);
      }
    }
    console.log('');

    // Test 4: Publish/Subscribe through app
    console.log('📝 Test 3: Publish/Subscribe via App');
    console.log('─────────────────────────────────────');
    
    let testMsgReceived = false;
    
    await app.transport.subscribe('integration-test', async (message) => {
      console.log('✅ Received test message:', message.data.event);
      testMsgReceived = true;
      await message.ack();
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    const msgId = await app.transport.publish('integration-test', {
      event: 'integrationTestEvent',
      data: 'Hello from integration test'
    });
    
    console.log(`📤 Published message: ${msgId}`);

    await new Promise(resolve => setTimeout(resolve, 500));

    if (testMsgReceived) {
      console.log('✅ Message flow working correctly\n');
    } else {
      console.log('⚠️  Message not received (check subscription timing)\n');
    }

    // Test 5: Test event flow through eventBus
    console.log('📝 Test 4: EventBus Integration');
    console.log('─────────────────────────────────────');
    
    const { eventBus } = require('./eventDispatcher');
    
    let eventBusReceived = false;
    
    eventBus.once('testEventBusEvent', (data) => {
      console.log('✅ EventBus received:', data);
      eventBusReceived = true;
    });

    eventBus.emit('testEventBusEvent', { test: 'data' });

    await new Promise(resolve => setTimeout(resolve, 100));

    if (eventBusReceived) {
      console.log('✅ EventBus working correctly\n');
    } else {
      console.log('❌ EventBus not working\n');
    }

    // Test 6: Check transport mode
    console.log('📝 Test 5: Transport Configuration');
    console.log('─────────────────────────────────────');
    
    const { getEnvironmentInfo } = require('./config/dbConfig');
    const { isLocal, nodeEnv } = getEnvironmentInfo();
    const expectedMode = isLocal ? 'Redis' : 'GCP Pub/Sub';
    
    console.log(`Environment: ${nodeEnv || 'not set'}`);
    console.log(`Expected transport: ${expectedMode}`);
    console.log(`Transport type: ${app.transport.constructor.name}\n`);

    console.log('\n═══════════════════════════════════════════════');
    console.log('Integration Tests Completed! ✅');
    console.log('═══════════════════════════════════════════════\n');

  } finally {
    console.log('🧹 Closing app...');
    await app.close();
    console.log('✅ App closed\n');
  }
}

// Run integration tests
testTransportIntegration().catch(error => {
  console.error('\n❌ Integration test failed:', error);
  console.error(error.stack);
  process.exit(1);
});
