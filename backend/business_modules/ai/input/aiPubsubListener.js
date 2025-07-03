// aiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiPubsubListener(fastify, options) {
  console.log('🚀 AI PUBSUB LISTENER PLUGIN STARTING...');
  fastify.log.info('🤖 Setting up AI Pub/Sub listeners...');

  // Get the shared event bus from the eventDispatcher module
  const { eventBus } = require('../../../eventDispatcher');
  
  // IMPORTANT: Let's inspect the full error information
  let lastError = null;
  
  // Pre-check if we can resolve the AI service
  let aiServiceInstance = null;
  try {
    if (fastify.diContainer) {
      console.log('✅ DI container available, listing all registered services:');
      const registrations = Object.keys(fastify.diContainer.registrations);
      console.log(registrations);
      
      // Try to resolve aiService
      try {
        aiServiceInstance = fastify.diContainer.resolve('aiService');
        console.log('✅ Successfully resolved aiService:', typeof aiServiceInstance);
        console.log('aiService methods:', Object.keys(aiServiceInstance));
      } catch (e) {
        console.log('❌ Error resolving aiService:', e.message);
      }
    }
  } catch (e) {
    console.log('❌ Error inspecting DI container:', e.message);
  }
  
  // Subscribe to 'questionAdded' events using the shared event bus
  eventBus.on('questionAdded', async (data) => {
    console.log(`🎯 AI RECEIVED 'questionAdded' event:`, JSON.stringify(data, null, 2));
    fastify.log.info(`🎯 AI RECEIVED 'questionAdded' event:`, JSON.stringify(data, null, 2));
    
    let userId, conversationId, prompt;
    
    try {
      ({ userId, conversationId, prompt } = data);
      console.log(`🤖 Processing AI response for user: ${userId}, conversation: ${conversationId}`);
      fastify.log.info(`🤖 Processing AI response for user: ${userId}, conversation: ${conversationId}`);

      // Simplified direct AI implementation - focusing only on WebSocket response
      console.log('💡 Using direct AI implementation without persistence...');
      
      // Create a simple response
      const directResponse = {
        text: `This is a direct AI response to your prompt: "${prompt}"`,
        timestamp: new Date().toISOString(),
        type: 'ai',
        metadata: {
          model: 'Direct-Implementation-1.0',
          tokens: prompt.length * 2
        }
      };
      
      // Send the response via WebSocket - using fastify.sendToUser directly
      if (typeof fastify.sendToUser === 'function') {
        console.log('📡 Sending AI response via WebSocket...');
        fastify.sendToUser(userId, {
          type: 'new_message', // Changed from 'ai_response' to 'new_message'
          conversationId,
          message: {  // Changed format to match chatPubsubListener
            id: require('crypto').randomUUID(),
            content: directResponse.text,  // Use just the text field, not the whole object
            role: 'assistant',
            created_at: new Date().toISOString()
          }
        });
        console.log('✅ AI response sent via WebSocket');
      } else {
        console.log('⚠️ WebSocket sendToUser not available - using eventBus as fallback');
        
        // Fallback to eventBus
        eventBus.emit('answerAdded', {
          userId,
          conversationId,
          answer: directResponse.text  // Use just the text field, not the whole object
        });
        console.log('📢 Published answerAdded event via eventBus as fallback');
      }
      
      console.log('✅ AI response process completed for conversation:', conversationId);
      fastify.log.info('✅ AI response process completed for conversation:', conversationId);
      
    } catch (error) {
      // Enhanced error logging
      lastError = error;
      console.error('💥 Error processing AI response:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      fastify.log.error(`💥 Error processing 'questionAdded' event:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        aiServiceAvailable: !!aiServiceInstance,
        aiServiceType: aiServiceInstance ? typeof aiServiceInstance : 'undefined',
        userId,
        conversationId,
        prompt
      });
      
      // Try to use eventBus as fallback for error notification
      try {
        eventBus.emit('aiProcessingError', {
          userId,
          conversationId,
          error: error.message
        });
      } catch (e) {
        console.error('Failed to emit error event:', e);
      }
    }
  });

  fastify.log.info('✅ AI Pub/Sub listeners registered via shared eventBus');
  console.log('✅ AI Pub/Sub listeners registered via shared eventBus');
  
  // Return error information for debugging
  fastify.decorate('getAiPubsubListenerError', () => {
    return lastError;
  });
}

module.exports = fp(aiPubsubListener, {
  dependencies: ['diPlugin'],
  name: 'aiPubsubListener'
});