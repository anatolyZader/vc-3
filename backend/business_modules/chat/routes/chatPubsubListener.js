// chatPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function chatPubsubListener(fastify, options) {
  const subscriptionName = 'chat-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  const actionHandlers = {
    startConversation: async ({ userId }) => {
      fastify.log.info(`Starting conversation for user: ${userId}`);
      return await fastify.startConversation(userId);
    },
    fetchConversation: async ({ userId, conversationId }) => {
      fastify.log.info(`Fetching conversation for user: ${userId}, conversation: ${conversationId}`);
      return await fastify.fetchConversation(userId, conversationId);
    },
    addQuestion: async ({ userId, conversationId, prompt }) => {
      fastify.log.info(`Adding question for user: ${userId}, conversation: ${conversationId}`);
      return await fastify.addQuestion(userId, conversationId, prompt);
    },
    addAnswer: async ({ userId, conversationId, aiResponse }) => {
      fastify.log.info(`Adding answer for user: ${userId}, conversation: ${conversationId}`);
      return await fastify.addAnswer(userId, conversationId, aiResponse);
    },
  };

  async function pullMessages() {
    try {
      const [messages] = await subscription.pull({ maxMessages: 10 });

      for (const message of messages) {
        fastify.log.info(`Received chat message ${message.id}`);

        try {
          const data = JSON.parse(message.data.toString());
          const { action, payload } = data;

          if (actionHandlers[action]) {
            const result = await actionHandlers[action](payload);
            fastify.log.info(`Result: ${JSON.stringify(result)}`);
          } else {
            fastify.log.warn(`Unknown chat action: ${action}`);
          }

          message.ack();
        } catch (error) {
          fastify.log.error('Error processing chat message:', error);
          message.nack();
        }
      }
    } catch (error) {
      fastify.log.error('Error pulling chat messages:', error);
    }
  }

  // Pull messages every 5 seconds
  setInterval(pullMessages, 5000);
  fastify.log.info(`Pulling chat messages from subscription: ${subscriptionName}...`);
}

module.exports = fp(chatPubsubListener, { name: 'chat-pubsub-listener' });
