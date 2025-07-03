// chatPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function chatPubsubListener(fastify, options) {
  fastify.log.info('💬 Setting up Chat Pub/Sub listeners...');

  // Get the shared event bus from the eventDispatcher module
  const { eventBus } = require('../../../eventDispatcher');

  // Subscribe to 'answerAdded' events using the shared event bus
  eventBus.on('answerAdded', async (data) => {
    fastify.log.info(`🎯 CHAT RECEIVED 'answerAdded' event from EventDispatcher`);

    try {
      const { userId, conversationId, answer } = data;
      fastify.log.info(`💬 Chat module is receiving response from AI module for user: ${userId}, conversation: ${conversationId}`);

      if (typeof fastify.addAnswer === 'function') {
        const mockRequest = {
          body: { aiResponse: answer },
          params: { conversationId },
          user: { id: userId }
        };

        // Pass empty object for reply
        await fastify.addAnswer(mockRequest, {});

        fastify.log.info(`✅ AI answer added to chat conversation ${conversationId}`);

        // Send response to user via WebSocket
        if (fastify.websocketManager && fastify.websocketManager.sendToUser) {
          fastify.websocketManager.sendToUser(userId, {
            type: 'new_message',
            conversationId,
            message: {
              id: require('uuid').v4(),
              content: answer,
              role: 'assistant',
              created_at: new Date().toISOString()
            }
          });
        } else if (fastify.sendToUser) {
          fastify.sendToUser(userId, {
            type: 'new_message',
            conversationId,
            message: {
              id: require('uuid').v4(),
              content: answer,
              role: 'assistant',
              created_at: new Date().toISOString()
            }
          });
        } else {
          fastify.log.warn(`⚠️ No WebSocket method available to send answer to user: ${userId}`);
        }

      } else {
        fastify.log.error(`❌ fastify.addAnswer is not defined or not exposed correctly`);
        // In a real Pub/Sub system, you might nack the message here if the handler isn't ready.
        // With the eventDispatcher pattern, the nack/ack is handled by the eventDispatcherPlugin.
      }
    } catch (error) {
      fastify.log.error(`💥 Error processing CHAT message for 'answerAdded':`, error);
      // Errors here indicate a problem with processing the event, not receiving it.
    }
  });


  fastify.log.info('✅ Chat Pub/Sub listeners registered via shared eventBus');
}

module.exports = fp(chatPubsubListener);