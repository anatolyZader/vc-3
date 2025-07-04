'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function aiPubsubListener(fastify, opts) {
  fastify.log.info('🤖 Setting up AI Pub/Sub listeners...');
  
  // Enhanced event bus acquisition with robust fallbacks
  let eventBus = null;
  let eventBusSource = 'none';
  
  try {
    // Debug: List all registered services in DI container
    if (fastify.diContainer) {
      try {
        const registeredServices = await fastify.diContainer.listRegistrations();
        fastify.log.info('🔍 AI MODULE DEBUG: DI Container registered services:', registeredServices);
      } catch (e) {
        fastify.log.warn('⚠️ AI MODULE DEBUG: Could not list DI container registrations:', e.message);
      }
    }
    
    // Approach 1: Try to get from DI container if available
    if (fastify.diContainer && await fastify.diContainer.hasRegistration('eventDispatcher')) {
      try {
        const eventDispatcher = await fastify.diContainer.resolve('eventDispatcher');
        if (eventDispatcher && eventDispatcher.eventBus) {
          eventBus = eventDispatcher.eventBus;
          eventBusSource = 'di-container';
          fastify.log.info('✅ AI MODULE: EventBus acquired from DI container');
        } else {
          fastify.log.warn('⚠️ AI MODULE: EventDispatcher resolved from DI but no eventBus property found');
        }
      } catch (e) {
        fastify.log.warn(`⚠️ AI MODULE: Failed to resolve eventDispatcher from DI container: ${e.message}`);
      }
    } else {
      fastify.log.warn('⚠️ AI MODULE: No eventDispatcher found in DI container, trying direct import');
    }
    
    // Approach 2: Try to get from the exported module if DI failed
    if (!eventBus) {
      try {
        // Try path resolution starting from the AI module directory first
        let resolvedPath;
        try {
          resolvedPath = require.resolve('../../../eventDispatcher');
        } catch (e) {
          // If that fails, try relative to the current working directory
          resolvedPath = require.resolve(process.cwd() + '/eventDispatcher');
        }
        
        fastify.log.info(`🔍 AI MODULE DEBUG: Resolved eventDispatcher path: ${resolvedPath}`);
        
        const eventDispatcherModule = require(resolvedPath);
        if (eventDispatcherModule.eventBus) {
          eventBus = eventDispatcherModule.eventBus;
          eventBusSource = 'direct-import';
          fastify.log.info('✅ AI MODULE: EventBus acquired from direct import');
        } else {
          fastify.log.warn('⚠️ AI MODULE: EventDispatcher module imported but no eventBus property found');
        }
      } catch (e) {
        fastify.log.error(`❌ AI MODULE: Failed to import eventDispatcher module: ${e.message}`);
      }
    }
    
    // Approach 3: Last resort - check if fastify has eventDispatcher decorator
    if (!eventBus && fastify.eventDispatcher) {
      try {
        if (fastify.eventDispatcher.eventBus) {
          eventBus = fastify.eventDispatcher.eventBus;
          eventBusSource = 'fastify-decorator';
          fastify.log.info('✅ AI MODULE: EventBus acquired from fastify decorator');
        }
      } catch (e) {
        fastify.log.error(`❌ AI MODULE: Error accessing eventBus from fastify decorator: ${e.message}`);
      }
    }
    
    // Set up event listeners once we have the eventBus
    if (eventBus) {
      // Listen for repository pushed events
      eventBus.on('repoPushed', async (data) => {
        try {
          fastify.log.info(`🔔 AI MODULE: Received repoPushed event via ${eventBusSource}`);
          fastify.log.info(`📊 AI MODULE: Event payload: ${JSON.stringify(data, null, 2)}`);
          
          const aiService = await fastify.diContainer.resolve('aiService');
          
          // Extract required data with validation
          if (!data || !data.payload) {
            throw new Error('Invalid event data: missing payload');
          }
          
          const { userId, repoId, repoData } = data.payload;
          
          if (!userId) {
            throw new Error('Missing userId in repoPushed event');
          }
          
          if (!repoId) {
            throw new Error('Missing repoId in repoPushed event');
          }
          
          fastify.log.info(`📋 AI MODULE: Processing repository: ${repoId} for user ${userId}`);
          
          // Process the repository
          const result = await aiService.processPushedRepo(userId, repoId, repoData || {});
          
          if (result && result.success) {
            fastify.log.info(`✅ AI MODULE: Repository ${repoId} processed successfully with ${result.chunksStored} chunks stored`);
          } else {
            fastify.log.warn(`⚠️ AI MODULE: Repository ${repoId} processing completed with issues: ${result?.error || 'Unknown error'}`);
          }
        } catch (error) {
          fastify.log.error(`❌ AI MODULE: Error processing repository push event: ${error.message}`);
          fastify.log.error(error.stack);
        }
      });
      
      // Verify listener registration
      const listenerCount = eventBus.listenerCount('repoPushed');
      fastify.log.info(`✅ AI MODULE: ${listenerCount} listeners registered for repoPushed event via ${eventBusSource}`);
      
      // Add a test event emitter for debugging (only in development)
      if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
        fastify.decorate('testRepoPush', async function(userId, repoId, repoData) {
          fastify.log.info(`🧪 AI MODULE: Emitting test repoPushed event`);
          eventBus.emit('repoPushed', {
            eventType: 'repoPushed',
            timestamp: new Date().toISOString(),
            payload: { userId, repoId, repoData }
          });
          return { success: true, message: 'Test event emitted' };
        });
      }
    } else {
      fastify.log.error('❌ AI MODULE: Failed to acquire eventBus from any source');
    }
  } catch (error) {
    fastify.log.error(`❌ AI MODULE: Error setting up Pub/Sub listeners: ${error.message}`);
    fastify.log.debug(error.stack);
  }
  
  // Add a decorator to track registration (useful for debugging)
  fastify.decorate('aiPubsubListener', true);
  console.log('aiPubsubListener registered:', !!fastify.aiPubsubListener);
}, {
  name: 'aiPubsubListener',
  dependencies: ['eventDispatcher', '@fastify/awilix']
});