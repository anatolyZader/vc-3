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

    // Handle repoPushed event
    if (data.event === 'repoPushed') {
      const { userId, repoId } = data.payload;
      fastify.log.info(`AI module processing pushed git repository ${repoId} for user: ${userId}`);

      if (typeof fastify.processPushedRepo === 'function') {
        const mockRequest = {
          body: { repoId },
          user: { id: userId }
        };
        await fastify.processPushedRepo(mockRequest, {});
        fastify.log.info(`Repo processed ${message.id}.`);
      } else {
        fastify.log.error(`fastify.processPushedRepo is not defined.`);
        message.nack();
        return;
      }
    }
    // Handle questionSent event
    else if (data.event === 'questionAdded') {
      const { userId, conversationId, prompt } = data.payload;
      fastify.log.info(`Processing AI response for user: ${userId}, conversation: ${conversationId}, prompt: "${prompt.substring(0, 50)}..."`);

      if (typeof fastify.respondToPrompt === 'function') {
        const mockRequest = {
          body: { conversationId, prompt },
          user: { id: userId }
        };
        await fastify.respondToPrompt(mockRequest, {});
        fastify.log.info(`AI response handled for message ${message.id}.`);
      } else {
        fastify.log.error(`fastify.respondToPrompt is not defined.`);
        message.nack();
        return;
      }
    }
    else {
      fastify.log.warn(`Unknown event type "${data.event}" for message ${message.id}.`);
    }

    message.ack();
  } catch (error) {
    fastify.log.error(`Error processing AI message ${message.id}:`, error);
    message.nack();
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