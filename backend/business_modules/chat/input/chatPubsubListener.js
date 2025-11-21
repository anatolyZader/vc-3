// chatPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function chatPubsubListener(fastify, options) {
  fastify.log.info('💬 Setting up Chat Pub/Sub listeners...');

  const { eventDispatcher } = fastify;
  
  if (!eventDispatcher) {
    throw new Error('[Chat Module] eventDispatcher not available. Ensure eventDispatcher plugin is registered.');
  }

  // Subscribe to 'answerAdded' events using eventDispatcher
  eventDispatcher.subscribe('answerAdded', async (data) => {
    console.log(`🎯 CHAT RECEIVED 'answerAdded' event from EventDispatcher:`, JSON.stringify(data, null, 2));
    fastify.log.info(`🎯 CHAT RECEIVED 'answerAdded' event from EventDispatcher:`, JSON.stringify(data, null, 2));

    try {
      if (!data || typeof data !== 'object') {
        throw new Error(`Invalid answerAdded event data: ${JSON.stringify(data)}`);
      }
      
      const { userId, conversationId, answer } = data;
      
      // Additional validation
      if (!userId) throw new Error('Missing userId in answerAdded event');
      if (!conversationId) throw new Error('Missing conversationId in answerAdded event');
      if (!answer) throw new Error('Missing answer in answerAdded event');
      
      console.log(`💬 Chat module is receiving response from AI module for user: ${userId}, conversation: ${conversationId}`);
      fastify.log.info(`💬 Chat module is receiving response from AI module for user: ${userId}, conversation: ${conversationId}`);

      if (typeof fastify.addAnswer === 'function') {
        const mockRequest = {
          body: { aiResponse: answer },
          params: { conversationId },
          user: { id: userId }
        };

        // Add detailed logging before calling addAnswer
        console.log(`⚙️ Calling fastify.addAnswer with params:`, JSON.stringify({
          conversationId,
          userId,
          answerLength: answer.length
        }));
        
        try {
          // Pass empty object for reply
          await fastify.addAnswer(mockRequest, {});
          
          console.log(`✅ AI answer added to chat conversation ${conversationId}`);
          fastify.log.info(`✅ AI answer added to chat conversation ${conversationId}`);

          // Send response to user via WebSocket
          if (fastify.websocketManager && fastify.websocketManager.sendToUser) {
            console.log(`🔌 Using websocketManager.sendToUser for user ${userId}`);
            const result = fastify.websocketManager.sendToUser(userId, {
              type: 'new_message',
              conversationId,
              message: {
                id: require('uuid').v4(),
                content: answer,
                role: 'assistant',
                created_at: new Date().toISOString()
              }
            });
            console.log(`📤 WebSocket send result:`, result);
          } else if (fastify.sendToUser) {
            console.log(`🔌 Using fastify.sendToUser for user ${userId}`);
            const result = fastify.sendToUser(userId, {
              type: 'new_message',
              conversationId,
              message: {
                id: require('uuid').v4(),
                content: answer,
                role: 'assistant',
                created_at: new Date().toISOString()
              }
            });
            console.log(`📤 WebSocket send result:`, result);
          } else {
            throw new Error('No WebSocket mechanism available to send message to user');
          }
        } catch (addAnswerError) {
          console.error(`❌ Error in fastify.addAnswer:`, addAnswerError);
          fastify.log.error(`❌ Error in fastify.addAnswer:`, addAnswerError);
          
          // Attempt to send the message via WebSocket anyway
          console.log(`⚠️ Attempting to send message via WebSocket despite database error`);
          
          try {
            const messageToSend = {
              type: 'new_message',
              conversationId,
              message: {
                id: require('uuid').v4(),
                content: answer,
                role: 'assistant',
                created_at: new Date().toISOString()
              }
            };
            
            if (fastify.websocketManager && fastify.websocketManager.sendToUser) {
              fastify.websocketManager.sendToUser(userId, messageToSend);
            } else if (fastify.sendToUser) {
              fastify.sendToUser(userId, messageToSend);
            }
            
            console.log(`📤 WebSocket fallback send attempted`);
          } catch (wsError) {
            console.error(`❌ Failed to send fallback WebSocket message:`, wsError);
          }
        }
      } else {
        throw new Error('fastify.addAnswer is not a function');
      }
    } catch (error) {
      console.error(`❌ Error processing answerAdded event:`, error);
      fastify.log.error(`❌ Error processing answerAdded event:`, error);
    }
  });


  fastify.log.info('✅ Chat Pub/Sub listeners registered via eventDispatcher');
}

module.exports = fp(chatPubsubListener, {
  name: 'chatPubsubListener',
  dependencies: ['transportPlugin', 'eventDispatcher']
});