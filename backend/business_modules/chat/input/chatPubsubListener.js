// chatPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function chatPubsubListener(fastify, options) {
  // DELETION: No direct access to pubsubClient here.
  // The eventDispatcher is responsible for bridging to the actual Pub/Sub.
  // const pubSubClient = fastify.pubsubClient;
  // const subscriptionName = 'chat-sub'; // This name is now handled by the centralized dispatcher/config
  // const subscription = pubSubClient.subscription(subscriptionName);

  // ADDITION: Subscribe using the eventDispatcher
  fastify.eventDispatcher.subscribe('answerAdded', async (data) => { // ADDTION: 'answerAdded' is the specific event from AI
    fastify.log.info(`Received CHAT message for 'answerAdded' on subscription from EventDispatcher.`);

    try {
      const { userId, conversationId, answer } = data;
      fastify.log.info(`chat module is receiving response from ai module for user: ${userId}, conversation: ${conversationId}`);

      if (typeof fastify.addAnswer === 'function') {
        const mockRequest = {
          body: { aiResponse: answer },
          params: { conversationId },
          user: { id: userId }
        };

        // ADDTION: Mock reply is not used for async background processing
        // const mockReply = {};
        await fastify.addAnswer(mockRequest, {}); // ADDTION: Pass empty object for reply

        fastify.log.info(`AI answer added to chat conversation ${conversationId}.`);

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
        fastify.log.error(`fastify.addAnswer is not defined or not exposed correctly.`);
        // In a real Pub/Sub system, you might nack the message here if the handler isn't ready.
        // With the eventDispatcher pattern, the nack/ack is handled by the eventDispatcherPlugin.
      }
    } catch (error) {
      fastify.log.error(`Error processing CHAT message for 'answerAdded':`, error);
      // Errors here indicate a problem with processing the event, not receiving it.
    }
  });

  // DELETION: Removed direct subscription stream handling. This is now handled by eventDispatcherPlugin.
  // subscription.on('error', (error) => { ... });
  // subscription.on('message', async (message) => { ... });
  // fastify.log.info(`Listening for CHAT messages on Pub/Sub subscription: ${subscriptionName}...`);

  // DELETION: Removed direct subscription close hook. This is now handled by eventDispatcherPlugin.
  // fastify.addHook('onClose', async () => { ... });

  fastify.log.info('✅ Chat Pub/Sub listener registered via eventDispatcher.'); // ADDTION
}

module.exports = fp(chatPubsubListener);