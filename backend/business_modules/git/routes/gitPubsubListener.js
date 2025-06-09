// gitPubsubListener.js
'use strict';

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

      if (data.event === 'fetchRepo') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchRepo event for user: ${userId}, repo: ${repoId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchRepo === 'function') {
          // Create mock request object for fetchRepo
          const mockRequest = {
            params: { repoId },
            user: { id: userId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const repository = await fastify.fetchRepo(mockRequest, mockReply);
          
          fastify.log.info(`Repository fetched via PubSub: ${JSON.stringify(repository)}`);
          
          // Publish the result event
          const gitPubsubAdapter = await fastify.diContainer.resolve('gitPubsubAdapter');
          await gitPubsubAdapter.publishRepoFetchedEvent(repository, correlationId);
          
          fastify.log.info(`Repository fetch result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.fetchRepo is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'fetchWiki') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchWiki event for user: ${userId}, repo: ${repoId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchWiki === 'function') {
          // Create mock request object for fetchWiki
          const mockRequest = {
            params: { repoId },
            user: { id: userId }
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const wiki = await fastify.fetchWiki(mockRequest, mockReply);
          
          fastify.log.info(`Wiki fetched via PubSub: ${JSON.stringify(wiki)}`);
          
          // Publish the result event
          const gitPubsubAdapter = await fastify.diContainer.resolve('gitPubsubAdapter');
          await gitPubsubAdapter.publishWikiPageFetchedEvent(wiki, correlationId);
          
          fastify.log.info(`Wiki fetch result published for message ${message.id}`);
        } else {
          fastify.log.error(`fastify.fetchWiki is not defined. Cannot process message ${message.id}.`);
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