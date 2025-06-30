// aiPubsubListener.js
/* eslint-disable no-unused-vars */
'use strict';

const fp = require('fastify-plugin');

async function aiPubsubListener(fastify, options) {
  // DELETION: No direct access to pubsubClient here.
  // const pubSubClient = fastify.pubsubClient;
  // const subscriptionName = 'ai-sub';
  // const subscription = pubSubClient.subscription(subscriptionName);

  // ADDITION: Subscribe using the eventDispatcher
  fastify.eventDispatcher.subscribe('repoPushed', async (data) => {
    fastify.log.info(`Received AI message for 'repoPushed' on subscription from EventDispatcher.`);
    try {
      const { userId, repoId, repoData } = data;
      fastify.log.info(`AI module processing pushed git repository ${repoId} for user: ${userId}`);

      if (typeof fastify.processPushedRepo === 'function') {
        const mockRequest = {
          body: { repoId, repoData },
          user: { id: userId }
        };
        await fastify.processPushedRepo(mockRequest, {}); // ADDTION: Pass empty object for reply
        fastify.log.info(`Repo processed for 'repoPushed' event.`);
      } else {
        fastify.log.error(`fastify.processPushedRepo is not defined or not exposed correctly.`);
      }
    } catch (error) {
      fastify.log.error(`Error processing 'repoPushed' event:`, error);
    }
  });

  // ADDITION: Subscribe using the eventDispatcher
  fastify.eventDispatcher.subscribe('questionAdded', async (data) => {
    fastify.log.info(`Received AI message for 'questionAdded' on subscription from EventDispatcher.`);
    try {
      const { userId, conversationId, prompt } = data;
      fastify.log.info(`Processing AI response for user: ${userId}, conversation: ${conversationId}, prompt: "${prompt.substring(0, 50)}..."`);

      if (typeof fastify.respondToPrompt === 'function') {
        const mockRequest = {
          body: { conversationId, prompt },
          user: { id: userId }
        };
        await fastify.respondToPrompt(mockRequest, {}); // ADDTION: Pass empty object for reply
        fastify.log.info(`AI response handled for 'questionAdded' event.`);
      } else {
        fastify.log.error(`fastify.respondToPrompt is not defined or not exposed correctly.`);
      }
    } catch (error) {
      fastify.log.error(`Error processing 'questionAdded' event:`, error);
    }
  });

  // DELETION: Removed direct subscription stream handling and close hook.
  // subscription.on('error', (error) => { ... });
  // subscription.on('message', async (message) => { ... });
  // fastify.addHook('onClose', async () => { ... });

  fastify.log.info('✅ AI Pub/Sub listener registered via eventDispatcher.'); // ADDTION
}

module.exports = fp(aiPubsubListener);