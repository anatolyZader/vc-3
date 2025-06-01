// aiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubsubClient');
  const subscriptionName = 'ai-sub';
  const subscription = pubSubClient.subscription(subscriptionName);
  // Error handling for the subscription stream
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
    // Depending on the error, you might want to re-initialize the subscription
    // or implement a more sophisticated back-off and retry strategy here.
  });

  // Message handler for the subscription stream
  subscription.on('message', async (message) => {
    fastify.log.info(`Received AI message ${message.id} on subscription ${subscriptionName}`);

    try {
      const data = JSON.parse(message.data.toString());

      if (data.event === 'questionSent') {
        const { userId, conversationId, repoId, prompt } = data.payload;
        fastify.log.info(`Processing AI response for user: ${userId}, conversation: ${conversationId}, prompt: "${prompt.substring(0, 50)}..."`);

        if (typeof fastify.respondToPrompt === 'function') {
          await fastify.respondToPrompt(userId, conversationId, repoId, prompt);
          fastify.log.info(`AI response handled for message ${message.id}.`);
        } else {
          fastify.log.error(`fastify.respondToPrompt is not defined. Cannot process message ${message.id}.`);
          message.nack(); // Nack if the handler isn't available
          return;
        }
      } else {
        fastify.log.warn(`Unknown event type "${data.event}" for message ${message.id}.`);
      }

      message.ack(); // Acknowledge the message upon successful processing
    } catch (error) {
      fastify.log.error(`Error processing AI message ${message.id}:`, error);
      message.nack(); // Nack the message to re-queue it for another attempt
    }
  });

  fastify.log.info(`Listening for AI messages on Pub/Sub subscription: ${subscriptionName}...`);

  // It's good practice to ensure the subscription is closed when the Fastify app closes.
  fastify.addHook('onClose', async () => {
    fastify.log.info(`Closing Pub/Sub subscription: ${subscriptionName}.`);
    await subscription.close();
  });
}

module.exports = fp(aiPubsubListener);