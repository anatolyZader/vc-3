// gitPubsubListener.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function gitPubsubListener(fastify, options) {
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
  const subscriptionName = 'git-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  // Error handling for the subscription stream
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
  });

  // Message handler for the subscription stream
  subscription.on('message', async (message) => {
    fastify.log.info(`Received git message ${message.id} on subscription ${subscriptionName}`);

    try {
      const data = JSON.parse(message.data.toString());

      if (data.event === 'fetchRepoRequest') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchRepo event for user: ${userId}, repo: ${repoId}, correlation: ${correlationId}`);
          const parts = repoId.split('/');
          if (parts.length !== 2) {
            fastify.log.error(`Invalid repoId format: ${repoId}. Expected format: owner/repo`);
            message.nack();
            return;
          }
          const [owner, repo] = parts;

        if (typeof fastify.fetchRepo === 'function') {
          // Create mock request object for fetchRepo
          const mockRequest = {
            params: { owner, repo },
            user: { id: userId },
            headers: { 'x-correlation-id': correlationId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const repository = await fastify.fetchRepo(mockRequest, mockReply);
          
          fastify.log.info(`Repository fetched via PubSub: ${JSON.stringify(repository)}`);
          
          fastify.log.info(`Repository fetch result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.fetchRepo is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'fetchDocsRequest') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchDocs event for user: ${userId}, repo: ${repoId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchDocs === 'function') {
          // Create mock request object for fetchDocs
          const mockRequest = {
            params: { repoId },
            user: { id: userId },
            headers: { 'x-correlation-id': correlationId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const docs = await fastify.fetchDocs(mockRequest, mockReply);
          
          fastify.log.info(`Docs fetched via PubSub: ${JSON.stringify(docs)}`);
          
          fastify.log.info(`Docs fetch result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.fetchDocs is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else {
        fastify.log.warn(`Unknown event type "${data.event}" for message ${message.id}.`);
      }

      message.ack(); // Acknowledge the message upon successful processing
    } catch (error) {
      fastify.log.error(`Error processing git message ${message.id}:`, error);
      message.nack(); // Nack the message to re-queue it for another attempt
    }
  });

  fastify.log.info(`Listening for Git messages on Pub/Sub subscription: ${subscriptionName}...`);

  // Ensure the subscription is closed when the Fastify app closes
  fastify.addHook('onClose', async () => {
    fastify.log.info(`Closing Pub/Sub subscription: ${subscriptionName}.`);
    await subscription.close();
  });
}

module.exports = fp(gitPubsubListener);