// transportPlugin.js
// Generic message transport abstraction
// Decouples business modules from specific transport implementation (GCP Pub/Sub, Redis, etc.)
'use strict';

const fp = require('fastify-plugin');
const { getEnvironmentInfo } = require('./config/dbConfig');

/**
 * Transport Plugin
 * 
 * Provides a unified interface for message publishing and subscription
 * regardless of underlying transport (GCP Pub/Sub, Redis Pub/Sub, etc.)
 * 
 * Interface:
 * - transport.publish(topic, message) → Promise<messageId>
 * - transport.subscribe(topic, handler) → Promise<void>
 * - transport.close() → Promise<void>
 */
module.exports = fp(async function transportPlugin(fastify, opts) {
  const { isLocal } = getEnvironmentInfo();
  
  let transportAdapter;
  
  if (isLocal) {
    // Local development: Redis transport
    fastify.log.info('🔧 Initializing Redis transport adapter (local development)');
    const RedisTransportAdapter = require('./transport/redisTransportAdapter');
    
    if (!fastify.redis) {
      throw new Error('Redis client not available. Ensure @fastify/redis is registered before transportPlugin');
    }
    
    transportAdapter = new RedisTransportAdapter(fastify.redis, fastify.log);
  } else {
    // Production: GCP Pub/Sub transport
    fastify.log.info('☁️  Initializing GCP Pub/Sub transport adapter (production)');
    const GcpTransportAdapter = require('./transport/gcpTransportAdapter');
    transportAdapter = new GcpTransportAdapter(fastify.log);
  }
  
  // Initialize the transport
  await transportAdapter.initialize();
  
  // Decorate fastify with the transport
  fastify.decorate('transport', transportAdapter);
  
  // Also register in DI container if available
  if (fastify.diContainer) {
    const { asValue } = require('awilix');
    await fastify.diContainer.register({
      transport: asValue(transportAdapter)
    });
    fastify.log.info('✅ Transport registered in DI container');
  }
  
  fastify.log.info('✅ Message transport initialized');
  
  // Cleanup on shutdown
  fastify.addHook('onClose', async (instance, done) => {
    fastify.log.info('🧹 Closing message transport...');
    await transportAdapter.close();
    done();
  });
}, {
  name: 'transportPlugin',
  dependencies: ['diPlugin'] // Ensure DI container is available
});
