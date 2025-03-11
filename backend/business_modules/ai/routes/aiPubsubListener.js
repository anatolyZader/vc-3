// aiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';
const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function aiPubsubListener(fastify, options) {
  const subscriptionName = 'ai-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  async function pullMessages() {
    try {
      const [messages] = await subscription.pull({ maxMessages: 10 });

      for (const message of messages) {
        fastify.log.info(`Received AI message ${message.id}`);

        try {
          const data = JSON.parse(message.data.toString());

          if (data.action === 'respondToPrompt') {
            const { userId, conversationId, repoId, prompt } = data.payload;
            const response = await fastify.respondToPrompt(userId, conversationId, repoId, prompt);
            fastify.log.info(`AI response: ${response}`);
          } else {
            fastify.log.warn(`Unknown action: ${data.action}`);
          }

          message.ack();
        } catch (error) {
          fastify.log.error('Error processing AI message:', error);
          message.nack();
        }
      }
    } catch (error) {
      fastify.log.error('Error pulling AI messages:', error);
    }
  }

  // Pull messages every 5 seconds
  setInterval(pullMessages, 5000);
  fastify.log.info(`Pulling AI messages from subscription: ${subscriptionName}...`);
}

module.exports = fp(aiPubsubListener, { name: 'ai-pubsub-listener' });
