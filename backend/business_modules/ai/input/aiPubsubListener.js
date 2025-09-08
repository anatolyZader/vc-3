'use strict';

const fp = require('fastify-plugin');

module.exports = fp(async function aiPubsubListener(fastify, opts) {
  fastify.log.info('🤖 Setting up AI Pub/Sub listeners...');
  
  // Enhanced event bus acquisition with robust fallbacks
  let eventBus = null;
  let eventBusSource = 'none';
  
  try {
    // Debug: List all registered services in DI container
    // if (fastify.diContainer) {
    //   try {
    //     const registeredServices = await fastify.diContainer.listRegistrations();
    //     fastify.log.info('🔍 AI MODULE DEBUG: DI Container registered services:', registeredServices);
    //   } catch (e) {
    //     fastify.log.warn('⚠️ AI MODULE DEBUG: Could not list DI container registrations:', e.message);
    //   }
    // }
    
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
    
    // // Approach 2: Try to get from the exported module if DI failed
    // if (!eventBus) {
    //   try {
    //     // Try path resolution starting from the AI module directory first
    //     let resolvedPath;
    //     try {
    //       resolvedPath = require.resolve('../../../eventDispatcher');
    //     } catch (e) {
    //       // If that fails, try relative to the current working directory
    //       resolvedPath = require.resolve(process.cwd() + '/eventDispatcher');
    //     }
        
    //     fastify.log.info(`🔍 AI MODULE DEBUG: Resolved eventDispatcher path: ${resolvedPath}`);
        
    //     const eventDispatcherModule = require(resolvedPath);
    //     if (eventDispatcherModule.eventBus) {
    //       eventBus = eventDispatcherModule.eventBus;
    //       eventBusSource = 'direct-import';
    //       fastify.log.info('✅ AI MODULE: EventBus acquired from direct import');
    //     } else {
    //       fastify.log.warn('⚠️ AI MODULE: EventDispatcher module imported but no eventBus property found');
    //     }
    //   } catch (e) {
    //     fastify.log.error(`❌ AI MODULE: Failed to import eventDispatcher module: ${e.message}`);
    //   }
    // }
    
    // // Approach 3: Last resort - check if fastify has eventDispatcher decorator
    // if (!eventBus && fastify.eventDispatcher) {
    //   try {
    //     if (fastify.eventDispatcher.eventBus) {
    //       eventBus = fastify.eventDispatcher.eventBus;
    //       eventBusSource = 'fastify-decorator';
    //       fastify.log.info('✅ AI MODULE: EventBus acquired from fastify decorator');
    //     }
    //   } catch (e) {
    //     fastify.log.error(`❌ AI MODULE: Error accessing eventBus from fastify decorator: ${e.message}`);
    //   }
    // }
    
    // Set up event listeners once we have the eventBus
    if (eventBus) {
      // Listen for repository pushed events
      eventBus.on('repoPushed', async (data) => {
        try {
          fastify.log.info(`📊 AI MODULE: Event payload: ${JSON.stringify(data, null, 2)}`);
          
          // Extract required data with validation
          if (!data) {
            throw new Error('Invalid event data: empty data');
          }
          
          // Handle both data formats - with or without payload wrapper
          const eventData = data.payload ? data.payload : data;
          
          const { userId, repoId, repoData } = eventData;
          
          if (!userId) {
            throw new Error('Missing userId in repoPushed event');
          }
          
          if (!repoId) {
            throw new Error('Missing repoId in repoPushed event');
          }
          
          fastify.log.info(`📋 AI MODULE: Processing repository: ${repoId} for user ${userId}`);
          
          // Create mock request object for processPushedRepo
          const mockRequest = {
            body: { repoId, repoData },
            user: { id: userId }
          };
          
          // Create mock reply object
          const mockReply = {
            code: (code) => mockReply,
            send: (response) => response
          };

          // Call the controller method
          if (typeof fastify.processPushedRepo === 'function') {
            const result = await fastify.processPushedRepo(mockRequest, mockReply);
          
            if (result && result.success) {
              fastify.log.info(`✅ AI MODULE: Repository ${repoId} processed successfully with ${result.chunksStored || 0} chunks stored`);
              
              // Emit repoProcessed event
              if (eventBus) {
                const processedPayload = {
                  userId,
                  repoId,
                  result,
                  timestamp: new Date().toISOString()
                };
                
                // Log the full payload for debugging
                fastify.log.info(`📤 AI MODULE: Emitting repoProcessed event with payload: ${JSON.stringify(processedPayload)}`);
                
                // Emit the event with the correct structure
                eventBus.emit('repoProcessed', processedPayload);
                
                fastify.log.info(`✅ AI MODULE: Published repoProcessed event for repo ${repoId}`);
              } else {
                fastify.log.error(`❌ AI MODULE: Could not publish repoProcessed event - no event bus available`);
              }
            } else {
              fastify.log.warn(`⚠️ AI MODULE: Failed to process repository ${repoId}`);
            }
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
      
      
      // _______________________________________________________________________
      // QUESTION ADDED EVENT HANDLER
      // ________________________________________________________________________
      eventBus.on('questionAdded', async (data) => {
        try {
          fastify.log.info(`🔔 AI MODULE: Received questionAdded event via ${eventBusSource}`);
          fastify.log.info(`📊 AI MODULE: Event payload: ${JSON.stringify(data, null, 2)}`);
          
          // Extract required data with validation
          if (!data) {
            throw new Error('Invalid event data: empty data');
          }
          
          // Handle both data formats - with or without payload wrapper
          const eventData = data.payload ? data.payload : data;
          
          const { userId, conversationId, prompt } = eventData;
          
          if (!userId) {
            throw new Error('Missing userId in questionAdded event');
          }
          
          if (!conversationId) {
            throw new Error('Missing conversationId in questionAdded event');
          }
          
          if (!prompt) {
            throw new Error('Missing prompt in questionAdded event');
          }
          
          fastify.log.info(`📝 AI MODULE: Processing question from user ${userId} in conversation ${conversationId}: "${prompt}"`);
          
          // Create mock request object for respondToPrompt
          const mockRequest = {
            body: { conversationId, prompt },
            user: { id: userId }
          };
          
          // Add diScope if diContainer is available
          if (fastify.diContainer && typeof fastify.diContainer.createScope === 'function') {
            mockRequest.diScope = fastify.diContainer.createScope();
          }
          
          // Create mock reply object
          const mockReply = {
            code: (code) => mockReply,
            send: (response) => response
          };

          // Call the controller method
          if (typeof fastify.respondToPrompt === 'function') {
            const answer = await fastify.respondToPrompt(mockRequest, mockReply);

          
if (answer) {
  // Ensure we have a string before trying to use substring
  const answerText = typeof answer === 'object' ? 
    (answer.response || JSON.stringify(answer)) : 
    String(answer);
            
  fastify.log.info(`✅ AI MODULE: Generated answer for conversation ${conversationId}: "${answerText.substring(0, 100)}..."`);
            
  // Emit answerAdded event
  if (eventBus) {
    const answerPayload = {
      userId,
      conversationId,
      // Make sure we're sending a string to the chat module
      answer: typeof answer === 'object' ? 
        (answer.response || JSON.stringify(answer)) : 
        String(answer),
      timestamp: new Date().toISOString()
    };
              
    // Log the full payload for debugging
    fastify.log.info(`📤 AI MODULE: Emitting answerAdded event with payload: ${JSON.stringify(answerPayload)}`);
              
    // Emit the event with the correct structure
    eventBus.emit('answerAdded', answerPayload);
              
    fastify.log.info(`✅ AI MODULE: Published answerAdded event for conversation ${conversationId}`);
  } else {
    fastify.log.error(`❌ AI MODULE: Could not publish answerAdded event - no event bus available`);
  }
  } else {
    fastify.log.warn(`⚠️ AI MODULE: Failed to generate answer for conversation ${conversationId}`);
  }
}
} catch (error) {
  fastify.log.error(`❌ AI MODULE: Error processing questionAdded event: ${error.message}`);
  fastify.log.error(error.stack);
}
});

// Verify listener registration
const questionListenerCount = eventBus.listenerCount('questionAdded');
fastify.log.info(`✅ AI MODULE: ${questionListenerCount} listeners registered for questionAdded event via ${eventBusSource}`);

// Add a test event emitter for debugging (only in development)
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
fastify.decorate('testQuestionAdded', async function(userId, conversationId, prompt) {
  fastify.log.info(`🧪 AI MODULE: Emitting test questionAdded event`);
  eventBus.emit('questionAdded', {
    eventType: 'questionAdded',
    timestamp: new Date().toISOString(),
    payload: { userId, conversationId, prompt }
  });
  return { success: true, message: 'Test event emitted' };
});
};
}
  } catch (error) {
    fastify.log.error(`❌ AI MODULE: Error setting up Pub/Sub listeners: ${error.message}`);
    fastify.log.debug(error.stack);
  }
  
  // Check if we've found an event bus
  if (!eventBus) {
    // Final fallback - check if it's available as a direct property on fastify
    if (fastify.eventDispatcher && fastify.eventDispatcher.eventBus) {
      eventBus = fastify.eventDispatcher.eventBus;
      eventBusSource = 'fastify-property';
      fastify.log.info('✅ AI MODULE: EventBus acquired from fastify.eventDispatcher');
    } else {
      fastify.log.error('❌ AI MODULE: Could not acquire EventBus from any source!');
      fastify.log.error('❌ AI MODULE: This will prevent the AI module from receiving events!');
      // Create an empty event bus so we don't crash
      const EventEmitter = require('events');
      eventBus = new EventEmitter();
      eventBusSource = 'fallback-empty';
    }
  }

  // --- Bridgee from Google Cloud Pub/Sub to the internal eventBus ---
  try {
    const pubSubClient = await fastify.diContainer.resolve('pubSubClient');
    const topicName = 'git-topic';
    const subscriptionName = 'gi-sub';

    const subscription = pubSubClient.topic(topicName).subscription(subscriptionName);

    fastify.log.info(`🔗 Subscribing to Google Cloud Pub/Sub topic: "${topicName}" with subscription: "${subscriptionName}"`);

    subscription.on('message', message => {
      fastify.log.info(`[GCP Pub/Sub] Received message from topic "${topicName}": ${message.id}`);
      try {
        const data = JSON.parse(message.data.toString());
        
        // Check for the event name and emit dynamically
        if (data && data.event) {
          fastify.log.info(`[GCP Pub/Sub] Parsed message data, emitting '${data.event}' on internal event bus.`);
          // Emit the specific event, passing the payload.
          // The internal listeners expect the payload directly.
          eventBus.emit(data.event, data.payload || data);
        } else {
          fastify.log.warn('[GCP Pub/Sub] Received message without a valid event property. Emitting as repoPushed for legacy support.', { messageId: message.id });
          // Fallback for old message format
          eventBus.emit('repoPushed', data);
        }
        
        message.ack();
      } catch (error) {
        fastify.log.error(`[GCP Pub/Sub] Error processing message ${message.id}:`, error);
        message.nack();
      }
    });

    subscription.on('error', error => {
      fastify.log.error(`[GCP Pub/Sub] Error on subscription "${subscriptionName}":`, error);
    });

  } catch (error) {
    fastify.log.error(`❌ AI MODULE: Failed to set up Google Cloud Pub/Sub subscription: ${error.message}`);
  }
  // --- End of bridge logic ---


  // Add a decorator to track registration (useful for debugging)
  fastify.decorate('aiPubsubListener', {
    isRegistered: true,
    eventBusSource: eventBusSource
  });
  
  fastify.log.info(`✅ AI MODULE: aiPubsubListener registered using event bus from ${eventBusSource}`);
}, {
  name: 'aiPubsubListener',
  dependencies: ['@fastify/awilix'] // Removed eventDispatcher dependency
});