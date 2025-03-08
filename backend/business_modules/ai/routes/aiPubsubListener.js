// aiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';


const fp = require('fastify-plugin');
const pubSubClient = require('../../../aop_modules/messaging/pubsub/pubsubClient');

async function aiPubsubListener(fastify, options) {
  const subscriptionName = 'ai-sub';
  const timeout = 60; // seconds

  const subscription = pubSubClient.subscription(subscriptionName)
  const messageHandler = async (message) => {
    fastify.log.info(`Received message ${message.id}`);
    try {
      const data = JSON.parse(message.data.toString());
      if (data.action === 'respondToPrompt') {
        const { userId, conversationId, repoId, prompt } = data.payload;
        const response = await fastify.respondToPrompt( userId, conversationId, repoId, prompt);
        fastify.log.info(`AI response: ${response}`);
      } else {
        fastify.log.warn(`Unknown action: ${data.action}`);
      }
      message.ack();
    } catch (error) {
      fastify.log.error('Error processing message:', error);
      message.nack();
    }
  };

  subscription.on('message', messageHandler);
  fastify.log.info(`Listening for AI messages on subscription: ${subscriptionName}...`);

  // Optional: Stop listening after the specified timeout.
  if (timeout) {
    setTimeout(() => {
      subscription.removeListener('message', messageHandler);
      fastify.log.info('Stopped listening for messages.');
    }, timeout * 1000);
  }
}

module.exports = fp(aiPubsubListener, {
  name: 'ai-pubsub-listener'
});
