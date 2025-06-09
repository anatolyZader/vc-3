// wikiPubsubListener.js
'use strict';

const fp = require('fastify-plugin');

async function wikiPubsubListener(fastify, options) {  
  const pubSubClient = fastify.diContainer.resolve('pubSubClient');
  const subscriptionName = 'wiki-sub';
  const subscription = pubSubClient.subscription(subscriptionName);

  // Error handling for the subscription stream
  subscription.on('error', (error) => {
    fastify.log.error(`Pub/Sub Subscription Error (${subscriptionName}):`, error);
  });

  // Message handler for the subscription stream
  subscription.on('message', async (message) => {
    fastify.log.info(`Received wiki message ${message.id} on subscription ${subscriptionName}`);

    try {
      const data = JSON.parse(message.data.toString());

      if (data.event === 'fetchWiki') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchWiki event for user: ${userId}, repo: ${repoId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchWiki === 'function') {
          // Create mock request object for fetchWiki
          const mockRequest = {
            params: { repoId },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const wiki = await fastify.fetchWiki(mockRequest, mockReply);
          
          fastify.log.info(`Wiki fetched via PubSub: ${JSON.stringify(wiki)}`);
          
          // Publish the result event if needed
          const wikiPubsubAdapter = await fastify.diScope.resolve('wikiPubsubAdapter');
          if (wikiPubsubAdapter && correlationId) {
            await wikiPubsubAdapter.publishWikiFetchedEvent(wiki, correlationId);
            fastify.log.info(`Wiki fetch result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.fetchWiki is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'fetchPage') {
        const { userId, repoId, pageId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchPage event for user: ${userId}, repo: ${repoId}, page: ${pageId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchPage === 'function') {
          // Create mock request object for fetchPage
          const mockRequest = {
            params: { repoId, pageId },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const page = await fastify.fetchPage(mockRequest, mockReply);
          
          fastify.log.info(`Wiki page fetched via PubSub: ${JSON.stringify(page)}`);
          
          // Publish the result event if needed
          const wikiPubsubAdapter = await fastify.diScope.resolve('wikiPubsubAdapter');
          if (wikiPubsubAdapter && correlationId) {
            await wikiPubsubAdapter.publishPageFetchedEvent(page, correlationId);
            fastify.log.info(`Page fetch result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.fetchPage is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'createPage') {
        const { userId, repoId, pageTitle, correlationId } = data.payload;
        fastify.log.info(`Processing createPage event for user: ${userId}, repo: ${repoId}, title: ${pageTitle}, correlation: ${correlationId}`);

        if (typeof fastify.createPage === 'function') {
          // Create mock request object for createPage
          const mockRequest = {
            params: { repoId },
            body: { pageTitle },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const result = await fastify.createPage(mockRequest, mockReply);
          
          fastify.log.info(`Wiki page created via PubSub: ${JSON.stringify(result)}`);
          
          // Publish the result event if needed
          const wikiPubsubAdapter = await fastify.diScope.resolve('wikiPubsubAdapter');
          if (wikiPubsubAdapter && correlationId) {
            await wikiPubsubAdapter.publishPageCreatedEvent(result, correlationId);
            fastify.log.info(`Page creation result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.createPage is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'updatePage') {
        const { userId, repoId, pageId, newContent, correlationId } = data.payload;
        fastify.log.info(`Processing updatePage event for user: ${userId}, repo: ${repoId}, page: ${pageId}, correlation: ${correlationId}`);

        if (typeof fastify.updatePage === 'function') {
          // Create mock request object for updatePage
          const mockRequest = {
            params: { repoId, pageId },
            body: { newContent },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const result = await fastify.updatePage(mockRequest, mockReply);
          
          fastify.log.info(`Wiki page updated via PubSub: ${JSON.stringify(result)}`);
          
          // Publish the result event if needed
          const wikiPubsubAdapter = await fastify.diScope.resolve('wikiPubsubAdapter');
          if (wikiPubsubAdapter && correlationId) {
            await wikiPubsubAdapter.publishPageUpdatedEvent(result, correlationId);
            fastify.log.info(`Page update result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.updatePage is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else if (data.event === 'deletePage') {
        const { userId, repoId, pageId, correlationId } = data.payload;
        fastify.log.info(`Processing deletePage event for user: ${userId}, repo: ${repoId}, page: ${pageId}, correlation: ${correlationId}`);

        if (typeof fastify.deletePage === 'function') {
          // Create mock request object for deletePage
          const mockRequest = {
            params: { repoId, pageId },
            user: { id: userId },
            userId // Fallback for compatibility
          };
          const mockReply = {};

          // Call the same HTTP handler with mock request
          const result = await fastify.deletePage(mockRequest, mockReply);
          
          fastify.log.info(`Wiki page deleted via PubSub: ${JSON.stringify(result)}`);
          
          // Publish the result event if needed
          const wikiPubsubAdapter = await fastify.diScope.resolve('wikiPubsubAdapter');
          if (wikiPubsubAdapter && correlationId) {
            await wikiPubsubAdapter.publishPageDeletedEvent(result, correlationId);
            fastify.log.info(`Page deletion result published for message ${message.id}`);
          }
        } else {
          fastify.log.error(`fastify.deletePage is not defined. Cannot process message ${message.id}.`);
          message.nack();
          return;
        }

      } else {
        fastify.log.warn(`Unknown event type "${data.event}" for message ${message.id}.`);
      }

      message.ack(); // Acknowledge the message upon successful processing
    } catch (error) {
      fastify.log.error(`Error processing wiki message ${message.id}:`, error);
      message.nack(); // Nack the message to re-queue it for another attempt
    }
  });

  fastify.log.info(`Listening for Wiki messages on Pub/Sub subscription: ${subscriptionName}...`);

  // Ensure the subscription is closed when the Fastify app closes
  fastify.addHook('onClose', async () => {
    fastify.log.info(`Closing Pub/Sub subscription: ${subscriptionName}.`);
    await subscription.close();
  });
}

module.exports = fp(wikiPubsubListener);