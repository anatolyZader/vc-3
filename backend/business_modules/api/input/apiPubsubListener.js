// apiPubsubListener.js
'use strict';
/* eslint-disable no-unused-vars */

const fp = require('fastify-plugin');

async function apiPubsubListener(fastify, options) {
  fastify.log.info('🔌 Setting up API Pub/Sub listeners...');
  
  const transport = fastify.transport;
  const { getChannelName } = require('../../../messageChannels');
  const subscriptionName = getChannelName('api') + '-internal'; // 'api-events-internal'

  // Subscribe to messages using transport abstraction
  await transport.subscribe(subscriptionName, async (message) => {
    try {
      const { data } = message;
      
      fastify.log.info({ messageId: message.id, event: data.event }, 'API module received message');

      if (data.event === 'fetchHttpApiRequest') {
        const { userId, repoId, correlationId } = data.payload;
        fastify.log.info(`Processing fetchHttpApi event for user: ${userId}, repo: ${repoId}, correlation: ${correlationId}`);

        if (typeof fastify.fetchHttpApi === 'function') {
          // Create DI scope for this request
          const diScope = fastify.diContainer.createScope();
          
          // Create mock request object for fetchHttpApi
          const mockRequest = {
            query: { repoId },
            user: { id: userId },
            diScope: diScope
          };
          const mockReply = {
            badRequest: (message) => {
              throw new Error(`Bad Request: ${message}`);
            }
          };

          // Call the same HTTP handler with mock request
          const httpApi = await fastify.fetchHttpApi(mockRequest, mockReply);
          
          fastify.log.info({ repoId }, 'HTTP API fetched via PubSub');
          
          // Publish the result event
          const apiPubsubAdapter = await diScope.resolve('apiPubsubAdapter');
          await apiPubsubAdapter.publishHttpApiFetchedEvent(httpApi, correlationId);
          
          fastify.log.info({ messageId: message.id }, 'HTTP API fetch result published');
          await message.ack();
        } else {
          fastify.log.error('fastify.fetchHttpApi is not defined');
          await message.nack();
          return;
        }

      } else {
        fastify.log.warn({ event: data.event }, 'Unknown event type');
        await message.ack(); // Ack unknown events
      }
    } catch (error) {
      fastify.log.error({ error, messageId: message.id }, 'Error processing message');
      await message.nack();
    }
  });

  fastify.log.info(`✅ API module subscribed to: ${subscriptionName}`);
}

module.exports = fp(apiPubsubListener, {
  name: 'apiPubsubListener',
  dependencies: ['transportPlugin']
});